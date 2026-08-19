import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Redis } from "@upstash/redis";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  isForbiddenTaskQuery,
  isDeveloperQuery,
} from "@/lib/rag/prompt";

export const runtime = "nodejs";
export const maxDuration = 45;

// ============================================================================
// 🎛️ SETELAN "PENGGUNAAAN API KEY" TOKEN (PENGATURAN EFISIENSI)
// ============================================================================
type ThrottleMode = "SUPER_HEMAT" | "HEMAT" | "NORMAL";

// Nilai default "HEMAT". Bisa diubah via env: TOKEN_THROTTLE_MODE="SUPER_HEMAT"
const CURRENT_MODE: ThrottleMode =
  (process.env.TOKEN_THROTTLE_MODE as ThrottleMode) || "HEMAT";

const TOKEN_TUNING_CONFIG = {
  SUPER_HEMAT: {
    maxTokens: 350,
    maxHistory: 2,
    temperature: 0.1,
  },
  HEMAT: {
    maxTokens: 550,
    maxHistory: 4,
    temperature: 0.1,
  },
  NORMAL: {
    maxTokens: 1000,
    maxHistory: 8,
    temperature: 0.2,
  },
};

const activeSetting = TOKEN_TUNING_CONFIG[CURRENT_MODE] || TOKEN_TUNING_CONFIG.HEMAT;

// Inisialisasi Upstash Redis (Persisten di serverless/Vercel)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

let ticketMemoryBatch: TicketItem[] = [];

// Helper sapaan instan tanpa bakar token AI
function getQuickGreeting(): string {
  const jakartaTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const hour = new Date(jakartaTimeStr).getHours();
  if (hour >= 4 && hour < 10) return "Selamat Pagi";
  if (hour >= 10 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function isPureGreetingCheck(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const greetings = [
    "halo", "hai", "hi", "pagi", "siang", "sore", "malam", "ping", "p",
    "selamat pagi", "selamat siang", "selamat sore", "selamat malam"
  ];
  return greetings.includes(normalized);
}

export async function POST(request: NextRequest) {
  try {
    const body: Record<string, any> = await request.json().catch(() => ({}));

    const message: string = (body.message || "").trim();
    const action: string | undefined = body.action;
    const ticketData: any = body.ticketData;
    const targetEmail: string | undefined = body.targetEmail;
    const dataRekap: any[] | undefined = body.dataRekap;
    const rawHistory: any[] = body.history || [];
    const noWhatsapp: string | undefined = body.noWhatsapp;
    const namaPelapor: string | undefined = body.namaPelapor;
    const asalSekolah: string | undefined = body.asalSekolah;
    const npsn: string | undefined = body.npsn;

    // =========================================================================
    // 1. HANDLER EMAIL MANUAL
    // =========================================================================
    if (action === "send_email_transcript") {
      const emailTarget = targetEmail || process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com";

      let recordsToSend: TicketItem[] = [];

      if (dataRekap && dataRekap.length > 0) {
        recordsToSend = dataRekap.map((item: any, idx: number) => ({
          timestamp: item.timestamp || new Date().toISOString(),
          namaPelapor: item.namaPelapor || "-",
          asalSekolah: item.asalSekolah || "-",
          npsn: item.npsn || "-",
          noWhatsapp: item.noWhatsapp || "-",
          kategoriKendala: item.kategori || item.kategoriKendala || "-",
          rincianKeluhan: item.rincian || item.rincianKeluhan || "-",
          ticketNumber: item.ticketNumber || (idx + 1).toString(),
        }));
      } else if (redis) {
        try {
          const redisTickets = await redis.lrange<TicketItem>("sipa_tickets_queue", 0, 50);
          if (redisTickets && redisTickets.length > 0) {
            recordsToSend = redisTickets;
          }
        } catch (err) {
          console.warn("Gagal mengambil tiket dari Redis:", err);
        }
      }

      if (recordsToSend.length === 0) {
        recordsToSend = ticketMemoryBatch;
      }

      if (recordsToSend.length === 0) {
        return NextResponse.json({ error: "Tiada data rekapitulasi aduan untuk dikirim." }, { status: 400 });
      }

      let totalCounter = recordsToSend.length;
      if (redis) {
        try {
          const count = await redis.get<number>("sipa_ticket_counter");
          if (count) totalCounter = count;
        } catch {}
      }

      await sendBatchReportEmail(recordsToSend, totalCounter);
      return NextResponse.json({ success: true, message: `Rekapitulasi berhasil dikirim ke ${emailTarget}` });
    }

    // =========================================================================
    // 2. SUBMIT TICKET / PENGADUAN
    // =========================================================================
    if (action === "submit_ticket" || ticketData) {
      if (!ticketData) {
        return NextResponse.json({ error: "Data aduan tidak boleh kosong." }, { status: 400 });
      }

      let ticketNumber = "1";

      if (redis) {
        try {
          const currentCount = await redis.incr("sipa_ticket_counter");
          ticketNumber = currentCount.toString();
        } catch (redisErr) {
          console.warn("Gagal update counter Upstash Redis:", redisErr);
          ticketNumber = Date.now().toString().slice(-4);
        }
      } else {
        ticketNumber = (ticketMemoryBatch.length + 1).toString();
      }

      const newTicket: TicketItem = {
        timestamp: new Date().toISOString(),
        namaPelapor: ticketData.namaPelapor || namaPelapor || "-",
        asalSekolah: ticketData.asalSekolah || asalSekolah || "-",
        npsn: ticketData.npsn || npsn || "-",
        noWhatsapp: ticketData.noWhatsapp || noWhatsapp || "-",
        kategoriKendala: ticketData.kategoriKendala || ticketData.kategori || "Kendala Dapodik",
        rincianKeluhan: ticketData.rincianKeluhan || ticketData.rincian || "-",
        ticketNumber: ticketNumber,
      };

      if (redis) {
        try {
          await redis.lpush("sipa_tickets_queue", newTicket);
          await redis.ltrim("sipa_tickets_queue", 0, 99);
        } catch (queueErr) {
          console.warn("Gagal simpan queue di Redis:", queueErr);
        }
      }

      ticketMemoryBatch.unshift(newTicket);
      if (ticketMemoryBatch.length > 30) ticketMemoryBatch = ticketMemoryBatch.slice(0, 30);

      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      let sheetStatus = "Skipped";
      if (webhookUrl && !webhookUrl.includes("PASTE_URL")) {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTicket),
          });
          sheetStatus = res.ok ? "Tersimpan ke Google Sheets" : "Gagal Sheets";
        } catch {
          sheetStatus = "Error Sheets";
        }
      }

      return NextResponse.json({
        success: true,
        message: "Pengaduan berhasil dicatat.",
        data: newTicket,
        sheetStatus,
      });
    }

    // =========================================================================
    // 3. ZERO-TOKEN INSTANT BYPASS (0 Token, Latensi < 20ms)
    // =========================================================================
    if (!message) {
      return NextResponse.json({ error: "Pesan teks wajib diisi." }, { status: 400 });
    }

    // A. Identitas Developer (Bypass penuh - Hemat 100% token)
    if (isDeveloperQuery(message)) {
      const devReply =
        "Saya dikembangkan dan dibuat oleh **MAULANA SYAHID AL FATAH** untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.";
      return NextResponse.json({ reply: devReply, content: devReply, response: devReply });
    }

    // B. Sapaan Singkat (Bypass penuh - Hemat 100% token)
    if (isPureGreetingCheck(message)) {
      const greetingReply = `${getQuickGreeting()} 🙏, Bapak/Ibu Operator & Guru!\n\nAda yang bisa saya bantu terkait layanan pendidikan, Info GTK, pencairan PIP, atau kendala Dapodik di sekolah Anda?`;
      return NextResponse.json({ reply: greetingReply, content: greetingReply, response: greetingReply });
    }

    // C. Guardrail Penolakan Kodingan Murni (Bypass penuh)
    if (isForbiddenTaskQuery(message)) {
      const refusalMessage =
        "Mohon maaf, sebagai Asisten Virtual Resmi Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi, saya khusus melayani informasi seputar Layanan Pendidikan, Dapodik, Pencairan PIP/Beasiswa, serta Kebudayaan di Kabupaten Ngawi. Saya tidak dapat membantu pengerjaan soal ujian, matematika/tugas sekolah, maupun pembuatan kode program (kodingan). Ada yang bisa saya bantu terkait layanan pendidikan atau Dapodik sekolah Anda?";
      return NextResponse.json({ reply: refusalMessage, content: refusalMessage, response: refusalMessage });
    }

    // =========================================================================
    // 4. CHAT AI DENGAN EFISIENSI TOKEN TERKONTROL
    // =========================================================================
    // Potong riwayat chat sesuai setelan efisiensi
    const trimmedHistory = rawHistory.slice(-activeSetting.maxHistory);

    const formattedPrompt = buildUserPrompt({
      userMessage: message,
      history: trimmedHistory,
      retrievedDocuments: [],
    });

    let aiReply = "";

    // Jalur Utama: Qwen Turbo
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (qwenApiKey) {
      try {
        const qwen = new OpenAI({
          apiKey: qwenApiKey,
          baseURL:
            process.env.QWEN_BASE_URL ||
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        });

        const completion = await qwen.chat.completions.create({
          model: process.env.QWEN_MODEL || "qwen-turbo",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: formattedPrompt },
          ],
          temperature: activeSetting.temperature,
          max_tokens: activeSetting.maxTokens,
        });

        aiReply = completion.choices[0]?.message?.content || "";
      } catch (qwenErr) {
        console.warn("⚠️ Qwen gagal, beralih ke DeepSeek...", qwenErr);
      }
    }

    // Jalur Cadangan: DeepSeek Chat
    if (!aiReply) {
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekKey) {
        throw new Error("Kunci API Qwen maupun DeepSeek tidak dikonfigurasi.");
      }

      const deepseek = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com",
      });

      const completion = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: formattedPrompt },
        ],
        temperature: activeSetting.temperature,
        max_tokens: activeSetting.maxTokens,
      });

      aiReply = completion.choices[0]?.message?.content || "";
    }

    return NextResponse.json({
      reply: aiReply,
      content: aiReply,
      response: aiReply,
    });
  } catch (error: unknown) {
    console.error("💥 Error API Route:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Terjadi kesalahan pada sistem SIPA-NGAWI AI: ${errMessage}` },
      { status: 500 }
    );
  }
}