
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  sendBatchReportEmail,
  type TicketItem,
} from "@/lib/email-service";
import { createChatResponse } from "@/lib/rag/service";
import {
  OFFICIAL_REJECTION_MESSAGE,
  isForbiddenTaskQuery,
  isDeveloperQuery,
  isKadisQuery,
  isConfirmationQuery,
} from "@/lib/rag/prompt";

// ======================================================
// CONFIGURATION
// ======================================================

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_ITEMS = 30;
const MAX_TICKETS = 100;

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Fallback hanya untuk proses server yang sedang berjalan.
// Redis tetap menjadi penyimpanan utama.
let ticketMemoryBatch: TicketItem[] = [];

type ChatHistoryItem = Record<string, unknown>;

type ApiBody = {
  message?: unknown;
  action?: unknown;
  ticketData?: unknown;
  targetEmail?: unknown;
  email?: unknown;
  dataRekap?: unknown;
  history?: unknown;
  noWhatsapp?: unknown;
  namaPelapor?: unknown;
  asalSekolah?: unknown;
  npsn?: unknown;
};

type TicketInput = {
  namaPelapor?: string;
  asalSekolah?: string;
  npsn?: string;
  noWhatsapp?: string;
  kategoriKendala?: string;
  kategori?: string;
  rincianKeluhan?: string;
  rincian?: string;
};

// ======================================================
// RESPONSE HELPERS
// ======================================================

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function jsonReply(reply: string) {
  return NextResponse.json({
    success: true,
    reply,
    content: reply,
    response: reply,
  });
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeHistory(value: unknown): ChatHistoryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_ITEMS)
    .filter(
      (item): item is ChatHistoryItem =>
        typeof item === "object" &&
        item !== null &&
        !Array.isArray(item)
    );
}

function validateHistory(history: ChatHistoryItem[]): boolean {
  return history.every((item) => {
    const content =
      typeof item.content === "string"
        ? item.content
        : typeof item.message === "string"
          ? item.message
          : "";

    const role = getString(item.role);

    return (
      ["user", "assistant", "model"].includes(role) &&
      content.length > 0 &&
      content.length <= MAX_MESSAGE_LENGTH
    );
  });
}

// ======================================================
// TIME HELPERS - WIB
// ======================================================

function getJakartaDate(): Date {
  return new Date();
}

function getQuickGreeting(): string {
  const jakartaTimeStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });

  const hour = new Date(jakartaTimeStr).getHours();

  if (hour >= 4 && hour < 10) return "Selamat Pagi";
  if (hour >= 10 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";

  return "Selamat Malam";
}

function getFormattedDateTimeResponse(): string {
  const now = getJakartaDate();

  const tanggalLengkap = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const jamWib = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return `Hari ini adalah **${tanggalLengkap}**, pukul **${jamWib} WIB**.`;
}

function getCurrentDateContext(): string {
  return getJakartaDate().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

// ======================================================
// FAST-PATH DETECTION
// ======================================================

function isPureGreetingCheck(message: string): boolean {
  const normalized = message.toLowerCase().trim();

  const greetings = [
    "halo",
    "hai",
    "hi",
    "helo",
    "hello",
    "pagi",
    "siang",
    "sore",
    "malam",
    "ping",
    "p",
    "assalamualaikum",
    "assalamu'alaikum",
    "selamat pagi",
    "selamat siang",
    "selamat sore",
    "selamat malam",
  ];

  return greetings.includes(normalized);
}

function isTestingQuery(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "");

  const testPatterns = [
    "tes",
    "test",
    "tes tes",
    "test test",
    "testing",
    "cek",
    "check",
    "tes 123",
    "test 123",
    "tes bot",
    "coba",
    "percobaan",
  ];

  return testPatterns.includes(normalized);
}

function isTrivialQuery(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "");

  const trivialWords = [
    "o",
    "oo",
    "ooo",
    "oooo",
    "oh",
    "oalah",
    "oke",
    "ok",
    "okee",
    "okey",
    "siap",
    "baik",
    "y",
    "ya",
    "iya",
    "yoi",
    "sip",
    "mantap",
  ];

  return trivialWords.includes(normalized);
}

function isDateTimeQuery(message: string): boolean {
  const lower = message.toLowerCase();

  const timeKeywords = [
    "hari ini hari apa",
    "sekarang hari apa",
    "tanggal berapa sekarang",
    "sekarang tanggal berapa",
    "tanggal hari ini",
    "jam berapa sekarang",
    "waktu sekarang",
    "tahun berapa sekarang",
    "bulan berapa sekarang",
    "hari tanggal",
    "hari ini tanggal",
  ];

  if (timeKeywords.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  const hasTimeAnchor =
    lower.includes("sekarang") ||
    lower.includes("hari ini") ||
    lower.includes("saat ini");

  const hasUnit =
    lower.includes("tanggal") ||
    lower.includes("hari") ||
    lower.includes("bulan") ||
    lower.includes("tahun") ||
    lower.includes("jam");

  return hasTimeAnchor && hasUnit;
}

// ======================================================
// REDIS HELPERS
// ======================================================

async function getAdminEmail(): Promise<string> {
  let currentTarget =
    process.env.EMAIL_REKAP_TARGET || "";

  if (redis) {
    try {
      const savedEmail = await redis.get<string>(
        "sipa_target_email"
      );

      if (savedEmail && isValidEmail(savedEmail)) {
        currentTarget = savedEmail;
      }
    } catch (error) {
      console.error("Redis read error:", error);
    }
  }

  return currentTarget;
}

async function saveAdminEmail(email: string): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.set("sipa_target_email", email);
    return true;
  } catch (error) {
    console.error("Redis save error:", error);
    return false;
  }
}

// ======================================================
// TICKET HELPERS
// ======================================================

function normalizeTicket(
  input: TicketInput,
  ticketNumber: string
): TicketItem {
  return {
    timestamp: new Date().toISOString(),
    namaPelapor: input.namaPelapor || "-",
    asalSekolah: input.asalSekolah || "-",
    npsn: input.npsn || "-",
    noWhatsapp: input.noWhatsapp || "-",
    kategoriKendala:
      input.kategoriKendala ||
      input.kategori ||
      "Kendala Dapodik",
    rincianKeluhan:
      input.rincianKeluhan ||
      input.rincian ||
      "-",
    ticketNumber,
  };
}

async function generateTicketNumber(): Promise<string> {
  if (redis) {
    try {
      const count = await redis.incr("sipa_ticket_counter");
      return `TK-${count.toString().padStart(3, "0")}`;
    } catch (error) {
      console.error("Redis counter error:", error);
    }
  }

  return `TK-${Date.now().toString().slice(-6)}`;
}

// ======================================================
// MAIN API HANDLER
// ======================================================

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. READ REQUEST
    // --------------------------------------------------

    const body: ApiBody = await request
      .json()
      .catch(() => ({}));

    const message = getString(body.message);
    const action = getString(body.action);

    const ticketData =
      body.ticketData &&
      typeof body.ticketData === "object" &&
      !Array.isArray(body.ticketData)
        ? (body.ticketData as TicketInput)
        : null;

    const rawHistory = normalizeHistory(body.history);

    const targetEmail = getString(body.targetEmail);
    const dataRekap = Array.isArray(body.dataRekap)
      ? body.dataRekap
      : [];

    // --------------------------------------------------
    // 2. ADMIN CONFIGURATION
    // --------------------------------------------------

    if (action === "get_admin_config") {
      const currentTarget = await getAdminEmail();

      return NextResponse.json({
        success: true,
        targetEmail: currentTarget,
      });
    }

    if (action === "save_admin_config") {
      const emailBaru = getString(body.email).toLowerCase();

      if (!isValidEmail(emailBaru)) {
        return jsonError("Format email tidak valid.", 400);
      }

      if (!redis) {
        return jsonError(
          "Redis belum dikonfigurasi. Email tidak dapat disimpan.",
          503
        );
      }

      const saved = await saveAdminEmail(emailBaru);

      if (!saved) {
        return jsonError("Gagal menyimpan konfigurasi email.", 500);
      }

      return NextResponse.json({
        success: true,
        targetEmail: emailBaru,
        message: "Konfigurasi email berhasil disimpan.",
      });
    }

    // --------------------------------------------------
    // 3. SEND EMAIL TRANSCRIPT
    // --------------------------------------------------

    if (action === "send_email_transcript") {
      let emailTarget = targetEmail || await getAdminEmail();

      if (!emailTarget) {
        return jsonError(
          "Email tujuan rekapitulasi belum dikonfigurasi.",
          400
        );
      }

      if (!isValidEmail(emailTarget)) {
        return jsonError("Email tujuan tidak valid.", 400);
      }

      let recordsToSend: TicketItem[] = [];

      if (dataRekap.length > 0) {
        recordsToSend = dataRekap
          .slice(0, MAX_TICKETS)
          .map((item: unknown, idx: number) => {
            const record =
              typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : {};

            return {
              timestamp:
                getString(record.timestamp) ||
                new Date().toISOString(),

              namaPelapor:
                getString(record.namaPelapor) || "-",

              asalSekolah:
                getString(record.asalSekolah) || "-",

              npsn:
                getString(record.npsn) || "-",

              noWhatsapp:
                getString(record.noWhatsapp) || "-",

              kategoriKendala:
                getString(record.kategori) ||
                getString(record.kategoriKendala) ||
                "-",

              rincianKeluhan:
                getString(record.rincian) ||
                getString(record.rincianKeluhan) ||
                "-",

              ticketNumber:
                getString(record.ticketNumber) ||
                (idx + 1).toString(),
            };
          });
      } else if (redis) {
        try {
          const redisTickets =
            await redis.lrange<TicketItem>(
              "sipa_tickets_queue",
              0,
              50
            );

          if (redisTickets?.length) {
            recordsToSend = redisTickets;
          }
        } catch (error) {
          console.error("Redis ticket read error:", error);
        }
      }

      if (recordsToSend.length === 0) {
        recordsToSend = ticketMemoryBatch;
      }

      if (recordsToSend.length === 0) {
        return jsonError(
          "Tidak ada data rekapitulasi aduan untuk dikirim.",
          400
        );
      }

      let totalCounter = recordsToSend.length;

      if (redis) {
        try {
          const count = await redis.get<number>(
            "sipa_ticket_counter"
          );

          if (typeof count === "number") {
            totalCounter = count;
          }
        } catch (error) {
          console.error("Redis counter read error:", error);
        }
      }

      await sendBatchReportEmail(
        recordsToSend,
        totalCounter,
        emailTarget
      );

      return NextResponse.json({
        success: true,
        message: `Rekapitulasi berhasil dikirim ke ${emailTarget}.`,
        total: recordsToSend.length,
      });
    }

    // --------------------------------------------------
    // 4. SUBMIT COMPLAINT TICKET
    // --------------------------------------------------

    if (action === "submit_ticket" || ticketData) {
      if (!ticketData && !message && !getString(body.namaPelapor)) {
        return jsonError(
          "Data pengaduan tidak boleh kosong.",
          400
        );
      }

      const input: TicketInput = ticketData || {
        namaPelapor: getString(body.namaPelapor),
        asalSekolah: getString(body.asalSekolah),
        npsn: getString(body.npsn),
        noWhatsapp: getString(body.noWhatsapp),
      };

      const ticketNumber = await generateTicketNumber();

      const newTicket = normalizeTicket(
        input,
        ticketNumber
      );

      // Redis is the primary persistent ticket storage.
      if (redis) {
        try {
          await redis.lpush(
            "sipa_tickets_queue",
            newTicket
          );

          await redis.ltrim(
            "sipa_tickets_queue",
            0,
            MAX_TICKETS - 1
          );
        } catch (error) {
          console.error("Redis ticket queue error:", error);
        }
      }

      // Temporary fallback.
      ticketMemoryBatch.unshift(newTicket);

      if (ticketMemoryBatch.length > 30) {
        ticketMemoryBatch = ticketMemoryBatch.slice(0, 30);
      }

      // Google Sheets integration.
      const webhookUrl =
        process.env.GOOGLE_SHEETS_WEBHOOK;

      let sheetStatus = "Skipped";

      if (
        webhookUrl &&
        /^https:\/\//i.test(webhookUrl) &&
        !webhookUrl.includes("PASTE_URL")
      ) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newTicket),
            signal: AbortSignal.timeout(10000),
          });

          sheetStatus = response.ok
            ? "Tersimpan ke Google Sheets"
            : "Gagal Sheets";
        } catch (error) {
          console.error("Google Sheets webhook error:", error);
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

    // --------------------------------------------------
    // 5. VALIDATE CHAT MESSAGE
    // --------------------------------------------------

    if (!message) {
      return jsonError("Pesan teks wajib diisi.", 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonError(
        "Pesan terlalu panjang. Maksimal 10.000 karakter.",
        413
      );
    }

    if (!validateHistory(rawHistory)) {
      return jsonError(
        "Format riwayat percakapan tidak valid.",
        400
      );
    }

    // --------------------------------------------------
    // 6. FAST-PATH RESPONSES
    // --------------------------------------------------

    if (isTestingQuery(message)) {
      return jsonReply(
        "Halo! Sistem SIPA-NGAWI aktif dan berjalan normal. Ada kendala data Dapodik atau layanan pendidikan yang ingin ditanyakan?"
      );
    }

    if (isTrivialQuery(message)) {
      return jsonReply(
        "Baik, silakan sampaikan pertanyaan atau kendala Anda jika sewaktu-waktu membutuhkan bantuan teknis."
      );
    }

    if (isDeveloperQuery(message)) {
      return jsonReply(
        "Saya dikembangkan dan dibuat oleh **MAULANA SYAHID AL FATAH** untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi."
      );
    }

    if (isKadisQuery(message)) {
      const kadisReply =
        "Kepala Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi adalah **Kabul Tunggul Winarno, S.IP.**\n\n" +
        "Beliau memimpin penyelenggaraan layanan pendidikan dasar dan menengah (SD, SMP), pendidikan nonformal, serta urusan kebudayaan di wilayah Kabupaten Ngawi sesuai kewenangan yang diatur dalam peraturan perundang-undangan.\n\n" +
        "Alamat kantor resmi: Jl. Sukowati No. 51, Karangasri, Kec. Ngawi, Kabupaten Ngawi, Jawa Timur 63211.\n" +
        "Nomor telepon: (0351) 749021.\n" +
        "Jam operasional: Senin–Jumat, pukul 07.30–15.30 WIB.";

      return jsonReply(kadisReply);
    }

    if (isDateTimeQuery(message)) {
      return jsonReply(getFormattedDateTimeResponse());
    }

    if (isConfirmationQuery(message)) {
      return jsonReply(
        "Sama-sama! Senang bisa membantu. Jika ada kendala lain seputar layanan Dapodik dan pendidikan di Ngawi, silakan tanyakan kembali."
      );
    }

    if (isPureGreetingCheck(message)) {
      return jsonReply(
        `${getQuickGreeting()} 🙏, Bapak/Ibu Operator & Guru!\n\nAda yang bisa saya bantu terkait layanan pendidikan, Info GTK, pencairan PIP, atau kendala Dapodik di sekolah Anda?`
      );
    }

    if (isForbiddenTaskQuery(message)) {
      return jsonReply(OFFICIAL_REJECTION_MESSAGE);
    }

    // --------------------------------------------------
    // 7. GEMINI AI + RAG SERVICE
    // --------------------------------------------------

    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;

    if (!geminiApiKey) {
      console.error("Gemini API Key is missing.");

      return jsonError(
        "Layanan AI sedang belum tersedia. Silakan hubungi administrator.",
        503
      );
    }

    const nowContext = getCurrentDateContext();

    const chatResult = await createChatResponse(
      geminiApiKey,
      {
        message,
        history: rawHistory,
        currentDateContext: nowContext,
      }
    );

    const finalAnswer = chatResult?.response;

    if (
      typeof finalAnswer !== "string" ||
      !finalAnswer.trim()
    ) {
      throw new Error("AI returned an empty response.");
    }

    return NextResponse.json({
      success: true,
      reply: finalAnswer,
      content: finalAnswer,
      response: finalAnswer,
      formatted: chatResult.formatted,
    });

  } catch (error: unknown) {
    // Internal logs only. Do not expose internal stack
    // traces, credentials, or provider errors to users.
    console.error("[SIPA-NGAWI API ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Terjadi kesalahan pada sistem SIPA-NGAWI AI. Silakan coba kembali beberapa saat lagi.",
      },
      { status: 500 }
    );
  }
}
