import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createChatResponse } from "@/lib/rag/service";
import { serializeError } from "@/lib/rag/config";
import type { ChatRequestBody } from "@/lib/rag/types";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";

export const runtime = "nodejs";

/**
 * Penampung memori sementara di server untuk jejak batch 30 aduan
 */
let ticketMemoryBatch: TicketItem[] = [];
let globalTicketCounter = 0;

export async function POST(request: NextRequest) {
  try {
    // Ambil data JSON dengan fallback selamat
    const body: Record<string, any> = await request.json().catch(() => ({}));

    const message: string = body.message || "";
    const image: string | undefined = body.image;
    const action: string | undefined = body.action;
    const ticketData: any = body.ticketData;
    const targetEmail: string | undefined = body.targetEmail;
    const dataRekap: any[] | undefined = body.dataRekap;
    const history: any[] = body.history || [];
    const noWhatsapp: string | undefined = body.noWhatsapp;
    const namaPelapor: string | undefined = body.namaPelapor;
    const asalSekolah: string | undefined = body.asalSekolah;
    const npsn: string | undefined = body.npsn;
    const urlBukti: string | undefined = body.urlBukti;
    const fileBase64: string | undefined = body.fileBase64;
    const fileName: string | undefined = body.fileName;

    // =========================================================================
    // FITUR 1: HANDLER EMAIL MANUAL UNTUK UNDUH / HANTAR TRANSKRIP REKAPITULASI
    // =========================================================================
    if (action === "send_email_transcript") {
      const emailTarget =
        targetEmail ||
        process.env.EMAIL_REKAP_TARGET ||
        "avidusfathcorp@gmail.com";

      const recordsToSend: TicketItem[] =
        dataRekap && dataRekap.length > 0
          ? dataRekap.map((item: any, idx: number) => ({
              timestamp: item.timestamp || new Date().toISOString(),
              namaPelapor: item.namaPelapor || "-",
              asalSekolah: item.asalSekolah || "-",
              npsn: item.npsn || "-",
              noWhatsapp: item.noWhatsapp || "-",
              kategoriKendala: item.kategori || item.kategoriKendala || "-",
              rincianKeluhan: item.rincian || item.rincianKeluhan || "-",
              ticketNumber: item.ticketNumber || (idx + 1).toString(),
            }))
          : ticketMemoryBatch;

      if (recordsToSend.length === 0) {
        return NextResponse.json(
          { error: "Tiada data rekapitulasi aduan untuk dihantar." },
          { status: 400 }
        );
      }

      try {
        await sendBatchReportEmail(
          recordsToSend,
          globalTicketCounter || recordsToSend.length
        );
        return NextResponse.json({
          success: true,
          message: `Rekapitulasi ${recordsToSend.length} aduan berjaya dihantar ke ${emailTarget}`,
        });
      } catch (emailErr) {
        console.error("❌ Error sending manual report email:", emailErr);
        return NextResponse.json(
          { error: "Gagal menghantar email rekapitulasi ke server SMTP." },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // FITUR 2: SUBMIT ADUAN DAPODIK KE GOOGLE SHEETS & REKAP EMAIL AUTOMATION
    // =========================================================================
    if (action === "submit_ticket" || ticketData) {
      if (!ticketData) {
        return NextResponse.json(
          { error: "Data aduan (ticketData) tidak boleh kosong." },
          { status: 400 }
        );
      }

      globalTicketCounter += 1;

      const newTicket: TicketItem = {
        timestamp: new Date().toISOString(),
        namaPelapor: ticketData.namaPelapor || namaPelapor || "-",
        asalSekolah: ticketData.asalSekolah || asalSekolah || "-",
        npsn: ticketData.npsn || npsn || "-",
        noWhatsapp: ticketData.noWhatsapp || noWhatsapp || "-",
        kategoriKendala:
          ticketData.kategoriKendala ||
          ticketData.kategori ||
          "Kendala Data PTK-Guru dan Penginputan Siswa",
        rincianKeluhan:
          ticketData.rincianKeluhan || ticketData.rincian || "-",
        ticketNumber: globalTicketCounter.toString(),
      };

      ticketMemoryBatch.unshift(newTicket);
      if (ticketMemoryBatch.length > 30) {
        ticketMemoryBatch = ticketMemoryBatch.slice(0, 30);
      }

      // Integrasi Webhook Google Sheets
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      let sheetStatus = "Skipped (Webhook URL belum diset)";

      if (webhookUrl && !webhookUrl.includes("PASTE_URL")) {
        try {
          const sheetResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTicket),
            redirect: "follow",
          });

          sheetStatus = sheetResponse.ok
            ? "Tersimpan ke Google Sheets"
            : `Gagal Sheets (${sheetResponse.statusText})`;
        } catch (err) {
          console.error("❌ Error Webhook Google Sheets:", err);
          sheetStatus = "Error sambungan Google Sheets";
        }
      }

      // Email Rekap Automatik apabila batch mencapai had
      let emailStatus = "Aduan baru berjaya dicatat";

      if (ticketMemoryBatch.length >= 30) {
        try {
          await sendBatchReportEmail(
            [...ticketMemoryBatch],
            globalTicketCounter
          );
          emailStatus = `Rekap PDF 30 aduan berjaya dihantar ke ${
            process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com"
          }`;
          ticketMemoryBatch = [];
        } catch (emailErr) {
          console.error("❌ Error sending automatic batch email:", emailErr);
          emailStatus = "Gagal menghantar email rekap PDF automatik";
        }
      }

      return NextResponse.json({
        success: true,
        message:
          "Aduan berjaya dicatat ke sistem dan diteruskan ke Tim Admin Dapodik Disdikbud Ngawi.",
        data: newTicket,
        totalTicketCount: globalTicketCounter,
        batchCount: ticketMemoryBatch.length,
        sheetStatus,
        emailStatus,
      });
    }

    // =========================================================================
    // FITUR 4: HANDLER MUAT NAIK BUKTI PEMBETULAN ADMIN
    // =========================================================================
    if (action === "upload_proof") {
      if (!fileBase64) {
        return NextResponse.json(
          { error: "Fail dokumen bukti (fileBase64) wajib dimuat naik." },
          { status: 400 }
        );
      }

      try {
        const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
        const base64Data = matches ? matches[2] : fileBase64;
        const buffer = Buffer.from(base64Data, "base64");

        const cleanFileName = (fileName || "bukti-pembetulan.png").replace(
          /\s+/g,
          "_"
        );
        const uniqueFileName = `${Date.now()}-${cleanFileName}`;
        let generatedProofUrl = fileBase64;

        try {
          const uploadDir = path.join(process.cwd(), "public", "uploads");
          await mkdir(uploadDir, { recursive: true });

          const filePath = path.join(uploadDir, uniqueFileName);
          await writeFile(filePath, buffer);

          const origin =
            request.headers.get("origin") ||
            process.env.NEXT_PUBLIC_APP_URL ||
            "http://localhost:3000";
          generatedProofUrl = `${origin}/uploads/${uniqueFileName}`;
        } catch (fsErr) {
          console.warn(
            "⚠️ File system Vercel Serverless read-only. Menggunakan data Base64 fallback.",
            fsErr
          );
        }

        return NextResponse.json({
          success: true,
          message: "Berkas bukti pembetulan berjaya dimuat naik.",
          urlBukti: generatedProofUrl,
        });
      } catch (uploadErr) {
        console.error("❌ Error menyimpan berkas bukti:", uploadErr);
        return NextResponse.json(
          { error: "Gagal memproses berkas bukti di server." },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // FITUR 5: HANDLER NOTIFIKASI WHATSAPP
    // =========================================================================
    if (action === "send_wa_notification") {
      const targetPhone = noWhatsapp || ticketData?.noWhatsapp;
      const targetName = namaPelapor || ticketData?.namaPelapor || "Pelapor";
      const targetSchool = asalSekolah || ticketData?.asalSekolah || "Sekolah";
      const targetNpsn = npsn || ticketData?.npsn || "NPSN";
      const proofUrl = urlBukti || ticketData?.urlBukti || "";

      if (!targetPhone) {
        return NextResponse.json(
          { error: "Nombor WhatsApp Pelapor tidak boleh kosong." },
          { status: 400 }
        );
      }

      let cleanPhone = String(targetPhone).replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "62" + cleanPhone.slice(1);
      }

      const waMessageText =
        `*-[ PENGADUAN SIPA-NGAWI SELESAI ]-*\n\n` +
        `Yth. Bapak/Ibu *${targetName}*,\n\n` +
        `Laporan pengaduan Dapodik untuk sekolah *${targetSchool} (${targetNpsn})* telah *SELESAI DITINDAKLANJUTI* oleh Admin Dinas Pendidikan & Kebudayaan Kab. Ngawi.\n\n` +
        `📌 *Status:* Terverifikasi dengan Bukti Perubahan Data Backend.\n` +
        (proofUrl ? `🔗 *Dokumen Bukti:* ${proofUrl}\n\n` : `\n`) +
        `Terima kasih telah menggunakan layanan Asisten Virtual SIPA-NGAWI.`;

      let waStatus = "Tergirim via WhatsApp Gateway";

      const fonnteToken = process.env.FONNTE_API_TOKEN;
      if (fonnteToken) {
        try {
          await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: {
              Authorization: fonnteToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              target: cleanPhone,
              message: waMessageText,
            }),
          });
          waStatus = "Tersampaikan via Fonnte Gateway";
        } catch (fonnteErr) {
          console.error("❌ Error Fonnte WA Bot:", fonnteErr);
          waStatus = "Gagal via Fonnte Gateway";
        }
      }

      const baileysServerUrl = process.env.BAILEYS_BOT_URL;
      if (baileysServerUrl) {
        try {
          await fetch(baileysServerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              number: cleanPhone,
              message: waMessageText,
            }),
          });
        } catch (baileysErr) {
          // Fallback senyap jika Baileys offline
        }
      }

      return NextResponse.json({
        success: true,
        message: `Notifikasi WhatsApp Bot berjaya diproses untuk nombor ${cleanPhone}`,
        waStatus,
        phone: cleanPhone,
      });
    }

    // =========================================================================
    // FITUR 3: CHAT AI DUAL ENGINE (GROQ RAG + DEEPSEEK FALLBACK)
    // =========================================================================
    if (!message && !image) {
      return NextResponse.json(
        { error: "Mesej teks atau gambar wajib diisi." },
        { status: 400 }
      );
    }

    const rawGroqKeys =
      process.env.GROQ_API_KEYS ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    const groqApiKeys = rawGroqKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // Opsyen A: Engine Utama Groq RAG
    if (groqApiKeys.length > 0) {
      try {
        console.log("🚀 [SIPA-NGAWI] Memproses mesej via Groq RAG Service...");
        const chatResponse = await createChatResponse(
          rawGroqKeys,
          body as ChatRequestBody
        );
        return NextResponse.json(chatResponse);
      } catch (groqError: unknown) {
        const groqErrMsg =
          groqError instanceof Error ? groqError.message : String(groqError);
        console.warn(
          `⚠️ [SIPA-NGAWI] Groq API bermasalah (${groqErrMsg}). Beralih ke DeepSeek API...`
        );
      }
    }

    // Opsyen B: Fallback ke DeepSeek API
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      throw new Error(
        "Kunci API AI (Groq/DeepSeek) tidak tersedia pada environment variables."
      );
    }

    console.log(
      "⚡ [SIPA-NGAWI] Memproses mesej via DeepSeek API (deepseek-chat)..."
    );

    const deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: deepseekKey,
    });

    const formattedUserPrompt = buildUserPrompt({
      userMessage: message || "",
      history: history,
      retrievedDocuments: [],
    });

    const deepseekCompletion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: formattedUserPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const deepseekReply =
      deepseekCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({
      reply: deepseekReply,
      content: deepseekReply,
      response: deepseekReply,
    });
  } catch (error: unknown) {
    console.error("💥 Error pada API Route /api/chat:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorDetails =
      typeof error === "object" && error !== null && "response" in error
        ? JSON.stringify((error as { response?: unknown }).response)
        : serializeError(error);

    return NextResponse.json(
      {
        error: `Terjadi ralat pada sistem SIPA-NGAWI AI: ${errorMessage}. Details: ${errorDetails}`,
      },
      { status: 500 }
    );
  }
}