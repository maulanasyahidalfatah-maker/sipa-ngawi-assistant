import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createChatResponse } from "@/lib/rag/service";
import { serializeError } from "@/lib/rag/config";
import type { ChatRequestBody } from "@/lib/rag/types";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";

// Jalur import diperbaiki langsung merujuk ke lib/rag/prompt.ts
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";

export const runtime = "nodejs";

/**
 * Inisialisasi SDK OpenAI untuk Endpoint DeepSeek
 */
const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

/**
 * Penampung memori sementara di server untuk melacak batch 30 pengaduan
 */
let ticketMemoryBatch: TicketItem[] = [];
let globalTicketCounter = 0;

export interface TicketDataPayload {
  namaPelapor: string;
  asalSekolah: string;
  npsn: string;
  noWhatsapp: string;
  kategoriKendala?: string;
  kategori?: string;
  rincianKeluhan?: string;
  rincian?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody & {
      action?: string;
      ticketData?: TicketDataPayload;
      targetEmail?: string;
      dataRekap?: any[];
      history?: any[];
    };

    const { message, image, action, ticketData, targetEmail, dataRekap, history = [] } = body;

    // =========================================================================
    // FITUR 1: HANDLER EMAIL MANUAL UNTUK DUNDUH / KIRIM TRANSKRIP REKAPITULASI
    // =========================================================================
    if (action === "send_email_transcript") {
      const emailTarget = targetEmail || process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com";
      const recordsToSend: TicketItem[] = (dataRekap && dataRekap.length > 0)
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
        await sendBatchReportEmail(recordsToSend, globalTicketCounter || recordsToSend.length);
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
      // Batasi memori server maksimal 30 tiket paling baru
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

      // Email Rekap Otomatis via Email Service (Pemicu saat mencapai kelipatan 30 Tiket)
      let emailStatus = "Pengaduan baru berhasil dicatat";

      if (ticketMemoryBatch.length >= 30) {
        try {
          await sendBatchReportEmail([...ticketMemoryBatch], globalTicketCounter);
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
        const chatResponse = await createChatResponse(rawGroqKeys, body);
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

    // OPSI B: FALLBACK KE DEEPSEEK API
    try {
      console.log("⚡ [SIPA-NGAWI] Memproses pesan via DeepSeek API (deepseek-chat)...");

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