import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";
import { createChatResponse } from "@/lib/rag/service";
import {
  OFFICIAL_REJECTION_MESSAGE,
  isForbiddenTaskQuery,
  isDeveloperQuery,
  isKadisQuery,
  isConfirmationQuery,
} from "@/lib/rag/prompt";

export const runtime = "nodejs";
export const maxDuration = 45;

// Inisialisasi Upstash Redis
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

let ticketMemoryBatch: TicketItem[] = [];

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
    "halo", "hai", "hi", "helo", "hello", "pagi", "siang", "sore", "malam",
    "ping", "p", "assalamualaikum", "assalamu'alaikum",
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
      const emailTarget =
        targetEmail || process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com";

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
        return NextResponse.json(
          { error: "Tiada data rekapitulasi aduan untuk dikirim." },
          { status: 400 }
        );
      }

      let totalCounter = recordsToSend.length;
      if (redis) {
        try {
          const count = await redis.get<number>("sipa_ticket_counter");
          if (count) totalCounter = count;
        } catch {}
      }

      await sendBatchReportEmail(recordsToSend, totalCounter);
      return NextResponse.json({
        success: true,
        message: `Rekapitulasi berhasil dikirim ke ${emailTarget}`,
      });
    }

    // =========================================================================
    // 2. SUBMIT TIKET PENGADUAN
    // =========================================================================
    if (action === "submit_ticket" || ticketData) {
      if (!ticketData && !message && !namaPelapor) {
        return NextResponse.json({ error: "Data aduan tidak boleh kosong." }, { status: 400 });
      }

      const input = ticketData || {};
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

      const formattedTicketId = `TK-${ticketNumber.padStart(3, "0")}`;

      const newTicket: TicketItem = {
        timestamp: new Date().toISOString(),
        namaPelapor: input.namaPelapor || namaPelapor || "-",
        asalSekolah: input.asalSekolah || asalSekolah || "-",
        npsn: input.npsn || npsn || "-",
        noWhatsapp: input.noWhatsapp || noWhatsapp || "-",
        kategoriKendala: input.kategoriKendala || input.kategori || "Kendala Dapodik",
        rincianKeluhan: input.rincianKeluhan || input.rincian || "-",
        ticketNumber: formattedTicketId,
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

    // A. Identitas Developer
    if (isDeveloperQuery(message)) {
      const devReply =
        "Saya dikembangkan dan dibuat oleh **MAULANA SYAHID AL FATAH** untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.";
      return NextResponse.json({ reply: devReply, content: devReply, response: devReply });
    }

    // B. Kepala Dinas Pendidikan Ngawi (Bypass resmi lengkap alamat & kontak)
    if (isKadisQuery(message)) {
      const kadisReply =
        "Kepala Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi adalah **Kabul Tunggul Winarno, S.IP.**\n\n" +
        "Beliau memimpin penyelenggaraan layanan pendidikan dasar dan menengah (SD, SMP), pendidikan nonformal, serta urusan kebudayaan di wilayah Kabupaten Ngawi sesuai kewenangan yang diatur dalam Peraturan Perundangan dan tugas pokok Dinas Pendidikan dan Kebudayaan.\n\n" +
        "Alamat kantor resmi: Jl. Sukowati No. 51, Karangasri, Kec. Ngawi, Kabupaten Ngawi, Jawa Timur 63211.\n" +
        "Nomor telepon: (0351) 749021.\n" +
        "Jam operasional: Senin–Jumat, pukul 07.30–15.30 WIB.";
      return NextResponse.json({ reply: kadisReply, content: kadisReply, response: kadisReply });
    }

    // C. Ucapan Terima Kasih / Konfirmasi
    if (isConfirmationQuery(message)) {
      const confirmReply = "Sama-sama! Senang bisa membantu. Jika ada kendala lain seputar layanan Dapodik dan pendidikan di Ngawi, silakan tanyakan kembali.";
      return NextResponse.json({ reply: confirmReply, content: confirmReply, response: confirmReply });
    }

    // D. Sapaan Singkat
    if (isPureGreetingCheck(message)) {
      const greetingReply = `${getQuickGreeting()} 🙏, Bapak/Ibu Operator & Guru!\n\nAda yang bisa saya bantu terkait layanan pendidikan, Info GTK, pencairan PIP, atau kendala Dapodik di sekolah Anda?`;
      return NextResponse.json({ reply: greetingReply, content: greetingReply, response: greetingReply });
    }

    // E. Penolakan Tugas Luar
    if (isForbiddenTaskQuery(message)) {
      return NextResponse.json({
        reply: OFFICIAL_REJECTION_MESSAGE,
        content: OFFICIAL_REJECTION_MESSAGE,
        response: OFFICIAL_REJECTION_MESSAGE,
      });
    }

    // =========================================================================
    // 4. GENERASI PERCAKAPAN VIA SERVICE (QWEN CLIENT SERVICE)
    // =========================================================================
    const chatResult = await createChatResponse(process.env.QWEN_API_KEY || "", {
      message,
      history: rawHistory,
    });

    const finalAnswer = chatResult.response;

    return NextResponse.json({
      reply: finalAnswer,
      content: finalAnswer,
      response: finalAnswer,
      formatted: chatResult.formatted,
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