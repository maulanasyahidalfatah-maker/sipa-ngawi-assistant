import { NextRequest, NextResponse } from "next/server";
import { createChatResponse } from "@/lib/rag/service";
import { serializeError } from "@/lib/rag/config";
import type { ChatRequestBody } from "@/lib/rag/types";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";

export const runtime = "nodejs";

/**
 * Penampung memori sementara di server untuk melacak batch 30 pengaduan
 */
let ticketMemoryBatch: TicketItem[] = [];
let globalTicketCounter = 0;

/**
 * Interface Payload untuk Submit Pengaduan
 */
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
    };

    const { message, image, action, ticketData } = body;

    // =========================================================================
    // FITUR 1: SUBMIT PENGADUAN DAPODIK KE GOOGLE SHEETS & REKAP EMAIL PDF
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

      // Simpan tiket ke memori batch
      ticketMemoryBatch.push(newTicket);

      // 1. Meneruskan data ke Webhook Google Sheets (jika dikonfigurasi)
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
            redirect: "follow", // Mencegah error saat Google Apps Script melakukan redirect 302
          });

          if (sheetResponse.ok) {
            sheetStatus = "Tersimpan ke Google Sheets";
          } else {
            console.warn(
              `⚠️ Google Sheets Webhook Response Not OK: ${sheetResponse.statusText}`
            );
            sheetStatus = `Gagal Sheets (${sheetResponse.statusText})`;
          }
        } catch (err) {
          console.error("❌ Error Webhook Google Sheets:", err);
          sheetStatus = "Error koneksi Google Sheets";
        }
      }

      // 2. OTOMASI EMAIL REKAP PDF VIA RESEND
      // Dikirim setiap kali mencapai kelipatan 30 data pengaduan
      let emailStatus = "Menunggu kuota 30 pengaduan";

      if (ticketMemoryBatch.length >= 30) {
        try {
          // Panggil fungsi pengirim email & PDF dari lib/email-service.ts
          await sendBatchReportEmail([...ticketMemoryBatch], globalTicketCounter);
          emailStatus = `Rekap PDF 30 pengaduan berhasil dikirim ke ${
            process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com"
          }`;
          
          // Reset batch memory setelah berhasil dikirim
          ticketMemoryBatch = [];
        } catch (emailErr) {
          console.error("❌ Error sending Resend batch email:", emailErr);
          emailStatus = "Gagal mengirim email rekap PDF";
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
    // FITUR 2: CHAT AI GROQ DENGAN RAG DAPODIK & FORMATTER LOGIKA
    // =========================================================================
    if (!message && !image) {
      return NextResponse.json(
        { error: "Pesan teks atau gambar wajib diisi." },
        { status: 400 }
      );
    }

    // Mengambil API Key Groq dari .env.local (Mendukung Multi-Key dipisah koma)
    const rawKeys =
      process.env.GROQ_API_KEYS ||
      process.env.GROQ_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEYS ||
      "";

    const apiKeys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // -------------------------------------------------------------------------
    // DEBUG LOGGING: Cek Groq API Keys yang berhasil dibaca oleh Next.js
    // -------------------------------------------------------------------------
    console.log("==========================================");
    console.log("🔍 [DEBUG SIPA-NGAWI] Checking Loaded Groq API Keys:");
    console.log(`Jumlah Key Terdeteksi: ${apiKeys.length}`);
    if (apiKeys.length > 0) {
      console.log(
        "Key Pertama Aktif:",
        `${apiKeys[0].substring(0, 6)}...${apiKeys[0].substring(apiKeys[0].length - 4)}`
      );
    } else {
      console.log("Key Ditemukan: TIDAK DITEMUKAN");
    }
    console.log("==========================================");

    if (apiKeys.length === 0) {
      console.error(
        "❌ GROQ_API_KEYS tidak ditemukan di environment variables."
      );
      return NextResponse.json(
        {
          error:
            "Kunci API Groq (GROQ_API_KEYS) tidak ditemukan pada file .env.local",
        },
        { status: 500 }
      );
    }

    // Menggunakan string multi-key lengkap (atau key pertama) ke RAG Service
    const apiKeyPayload = rawKeys;

    console.log("🚀 Mengirim request ke Groq API via RAG Service...");
    const chatResponse = await createChatResponse(apiKeyPayload, body);
    console.log("✅ Berhasil mendapat respons dari Groq API!");

    return NextResponse.json(chatResponse);
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