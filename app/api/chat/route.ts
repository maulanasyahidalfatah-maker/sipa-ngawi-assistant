import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createChatResponse } from "@/lib/rag/service";
import { serializeError } from "@/lib/rag/config";
import type { ChatRequestBody } from "@/lib/rag/types";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Import prompt RAG
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";

export const runtime = "nodejs";

/**
 * Penampung memori sementara di server untuk melacak batch 30 pengaduan
 */
let ticketMemoryBatch: TicketItem[] = [];
let globalTicketCounter = 0;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Type assertion dengan fallback aman
    const body = (rawBody || {}) as any;

    const {
      message,
      image,
      action,
      ticketData,
      targetEmail,
      dataRekap,
      history = [],
      noWhatsapp,
      namaPelapor,
      asalSekolah,
      npsn,
      urlBukti,
      // File payload khusus untuk aksi upload bukti
      fileBase64,
      fileName,
    } = body;

    // =========================================================================
    // FITUR 1: HANDLER EMAIL MANUAL UNTUK UNDUH / KIRIM TRANSKRIP REKAPITULASI
    // =========================================================================
    if (action === "send_email_transcript") {
      const emailTarget =
        targetEmail ||
        process.env.EMAIL_REKAP_TARGET ||
        "avidusfathcorp@gmail.com";
      const recordsToSend: TicketItem[] =
        dataRekap && dataRekap.length > 0
          ? dataRekap.map((item: any, idx: number) => ({
              timestamp: new Date().toISOString(),
              namaPelapor: item.namaPelapor || "-",
              asalSekolah: item.asalSekolah || "-",
              npsn: item.npsn || "-",
              noWhatsapp: item.noWhatsapp || "-",
              kategoriKendala: item.kategori || item.kategoriKendala || "-",
              rincianKeluhan: item.rincian || item.rincianKeluhan || "-",
              ticketNumber: (idx + 1).toString(),
            }))
          : ticketMemoryBatch;

      if (recordsToSend.length === 0) {
        return NextResponse.json(
          { error: "Tidak ada data rekapitulasi pengaduan untuk dikirim." },
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
          message: `Rekapitulasi ${recordsToSend.length} pengaduan berhasil dikirim ke ${emailTarget}`,
        });
      } catch (emailErr) {
        console.error("❌ Error sending manual report email:", emailErr);
        return NextResponse.json(
          { error: "Gagal mengirimkan email rekapitulasi ke server SMTP." },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // FITUR 2: SUBMIT PENGADUAN DAPODIK KE GOOGLE SHEETS & REKAP EMAIL AUTOMATION
    // =========================================================================
    if (action === "submit_ticket" || ticketData) {
      if (!ticketData) {
        return NextResponse.json(
          { error: "Data pengaduan (ticketData) tidak boleh kosong." },
          { status: 400 }
        );
      }

      globalTicketCounter += 1;

      const newTicket: TicketItem = {
        timestamp: new Date().toISOString(),
        namaPelapor: ticketData.namaPelapor || "-",
        asalSekolah: ticketData.asalSekolah || "-",
        npsn: ticketData.npsn || "-",
        noWhatsapp: ticketData.noWhatsapp || "-",
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

      // Webhook Google Sheets
      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      let sheetStatus = "Skipped (Webhook URL belum diset)";

      if (webhookUrl && !webhookUrl.includes("PASTE_URL")) {
        try {
          const sheetResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newTicket),
            redirect: "follow",
          });

          if (sheetResponse.ok) {
            sheetStatus = "Tersimpan ke Google Sheets";
          } else {
            sheetStatus = `Gagal Sheets (${sheetResponse.statusText})`;
          }
        } catch (err) {
          console.error("❌ Error Webhook Google Sheets:", err);
          sheetStatus = "Error koneksi Google Sheets";
        }
      }

      // Email Rekap Otomatis via Email Service
      let emailStatus = "Pengaduan baru berhasil dicatat";

      if (ticketMemoryBatch.length >= 30) {
        try {
          await sendBatchReportEmail(
            [...ticketMemoryBatch],
            globalTicketCounter
          );
          emailStatus = `Rekap PDF 30 pengaduan berhasil dikirim ke ${
            process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com"
          }`;
        } catch (emailErr) {
          console.error("❌ Error sending automatic batch email:", emailErr);
          emailStatus = "Gagal mengirim email rekap PDF otomatis";
        }
      }

      return NextResponse.json({
        success: true,
        message:
          "Pengaduan berhasil dicatat ke sistem dan diteruskan ke Tim Admin Dapodik Disdikbud Ngawi.",
        data: newTicket,
        totalTicketCount: globalTicketCounter,
        batchCount: ticketMemoryBatch.length,
        sheetStatus,
        emailStatus,
      });
    }

    // =========================================================================
    // FITUR 4: HANDLER UNGGUHAN BUKTI PEMBETULAN ADMIN
    // =========================================================================
    if (action === "upload_proof") {
      if (!fileBase64) {
        return NextResponse.json(
          { error: "File dokumen bukti (fileBase64) wajib diunggah." },
          { status: 400 }
        );
      }

      try {
        // Ekstrak data base64
        const matches = fileBase64.match(/^data:(.+);base64,(.+)$/);
        const base64Data = matches ? matches[2] : fileBase64;
        const buffer = Buffer.from(base64Data, "base64");

        // Tentukan nama file unik
        const cleanFileName = (fileName || "bukti-pembetulan.png").replace(
          /\s+/g,
          "_"
        );
        const uniqueFileName = `${Date.now()}-${cleanFileName}`;

        // Path folder penyimpan: public/uploads (Fallback aman untuk Vercel)
        let generatedProofUrl = fileBase64; // Fallback jika Vercel Serverless filesystem read-only

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
          console.warn("⚠️ Cannot write to filesystem (Serverless Vercel). Using Base64 fallback.", fsErr);
        }

        return NextResponse.json({
          success: true,
          message: "Berkas bukti pembetulan berhasil diunggah.",
          urlBukti: generatedProofUrl,
        });
      } catch (uploadErr) {
        console.error("❌ Error menyimpan berkas bukti:", uploadErr);
        return NextResponse.json(
          { error: "Gagal menyimpan berkas bukti di server." },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // FITUR 5: HANDLER WHATSAPP BOT AUTOMATION
    // =========================================================================
    if (action === "send_wa_notification") {
      const targetPhone = noWhatsapp || ticketData?.noWhatsapp;
      const targetName = namaPelapor || ticketData?.namaPelapor || "Pelapor";
      const targetSchool = asalSekolah || ticketData?.asalSekolah || "Sekolah";
      const targetNpsn = npsn || ticketData?.npsn || "NPSN";
      const proofUrl = urlBukti || ticketData?.urlBukti || "";

      if (!targetPhone) {
        return NextResponse.json(
          { error: "Nomor WhatsApp Pelapor tidak boleh kosong." },
          { status: 400 }
        );
      }

      // Format standar internasional untuk WhatsApp (628xxx)
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

      let waStatus = "Tergirim via WhatsApp Protocol";

      // Integrasi Fonnte Gateway
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

      // Integrasi Baileys Local Gateway
      const baileysServerUrl =
        process.env.BAILEYS_BOT_URL || "http://localhost:5000/send-message";
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
        // Abaikan log jika server lokal baileys belum dinyalakan
      }

      return NextResponse.json({
        success: true,
        message: `Notifikasi WhatsApp Bot berhasil diproses untuk nomor ${cleanPhone}`,
        waStatus,
        phone: cleanPhone,
      });
    }

    // =========================================================================
    // FITUR 3: CHAT AI DUAL ENGINE (GROQ RAG + DEEPSEEK FALLBACK)
    // =========================================================================
    if (!message && !image) {
      return NextResponse.json(
        { error: "Pesan teks atau gambar wajib diisi." },
        { status: 400 }
      );
    }

    const rawGroqKeys =
      process.env.GROQ_API_KEYS ||
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEYS ||
      "";

    const groqApiKeys = rawGroqKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // OPSI A: UTAMAKAN ENGINE GROQ RAG
    if (groqApiKeys.length > 0) {
      try {
        console.log("🚀 [SIPA-NGAWI] Memproses pesan via Groq RAG Service...");
        const chatResponse = await createChatResponse(
          rawGroqKeys,
          body as ChatRequestBody
        );
        console.log("✅ [SIPA-NGAWI] Berhasil mendapat respons dari Groq API!");
        return NextResponse.json(chatResponse);
      } catch (groqError: unknown) {
        const groqErrMsg =
          groqError instanceof Error ? groqError.message : String(groqError);
        console.warn(
          `⚠️ [SIPA-NGAWI] Groq API bermasalah/limit (${groqErrMsg}). Beralih ke DeepSeek API...`
        );
      }
    }

    // OPSI B: FALLBACK KE DEEPSEEK API (INISIALISASI AMAN UNTUK VERCEL)
    try {
      console.log(
        "⚡ [SIPA-NGAWI] Memproses pesan via DeepSeek API (deepseek-chat)..."
      );

      // Inisialisasi aman di dalam handler dengan fallback string agar Vercel build tidak crash
      const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.GROQ_API_KEY || "dummy-key-for-build";
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
    } catch (deepseekError: unknown) {
      console.error("❌ [SIPA-NGAWI] DeepSeek API Error:", deepseekError);
      throw deepseekError;
    }
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
        error: `Terjadi kesalahan pada sistem SIPA-NGAWI AI: ${errorMessage}. Details: ${errorDetails}`,
      },
      { status: 500 }
    );
  }
}