
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type {
  ChatRequestBody,
  ChatResponseBody,
} from "./types";

export type ThrottleMode = "SUPER_HEMAT" | "HEMAT" | "NORMAL";

export const TOKEN_TUNING_CONFIG = {
  SUPER_HEMAT: {
    maxTokens: 1000,
    maxHistory: 2,
    temperature: 0.0,
  },
  HEMAT: {
    maxTokens: 2500,
    maxHistory: 4,
    temperature: 0.0,
  },
  NORMAL: {
    maxTokens: 4000,
    maxHistory: 8,
    temperature: 0.0,
  },
};

export interface ExtendedChatRequestBody
  extends Partial<ChatRequestBody> {
  message?: string;
  history?: any[];
  currentDateContext?: string;
}

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES_PER_KEY = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;

/**
 * Membersihkan respons dari template penutup otomatis.
 */
function sanitizeResponseText(text: string): string {
  if (!text) return "";

  return text
    .replace(
      /Terima kasih atas konfirmasinya\.?\s*(Jika ada pertanyaan lanjutan[^\n]*)?/gi,
      "",
    )
    .replace(
      /Jika ada pertanyaan lanjutan terkait layanan pendidikan[^\n]*/gi,
      "",
    )
    .trim();
}

/**
 * Mengambil angka konfigurasi dari environment.
 */
function getNumberFromEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value)) return fallback;

  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

/**
 * Jeda sebelum melakukan retry.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Menghitung jeda retry dengan exponential backoff dan jitter.
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = getNumberFromEnv(
    "GEMINI_RETRY_DELAY_MS",
    DEFAULT_RETRY_DELAY_MS,
    250,
    10_000,
  );

  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 500);

  return Math.min(exponentialDelay + jitter, 15_000);
}

/**
 * Mengambil API Key dari environment.
 *
 * Mendukung beberapa key yang dipisahkan koma:
 * GEMINI_API_KEY=KEY_1,KEY_2,KEY_3
 *
 * GOOGLE_GENAI_API_KEY juga tetap didukung.
 */
function getGeminiApiKeys(apiKeyPayload?: string): string[] {
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    apiKeyPayload,
  ];

  const keys = rawKeys
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((key) => key.trim())
    .filter(Boolean);

  // Menghindari percobaan berulang menggunakan key yang sama.
  return [...new Set(keys)];
}

/**
 * Mengambil daftar model.
 *
 * Model utama:
 * GEMINI_MODEL=gemini-2.5-flash
 *
 * Model cadangan (opsional):
 * GEMINI_FALLBACK_MODELS=model-id-1,model-id-2
 *
 * Isi fallback hanya dengan model yang tersedia
 * dan dapat digunakan oleh API Key milikmu.
 */
function getGeminiModels(): string[] {
  const primaryModel =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const fallbackModels = (
    process.env.GEMINI_FALLBACK_MODELS || ""
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primaryModel, ...fallbackModels])];
}

/**
 * Menentukan apakah HTTP status layak dicoba ulang.
 */
function isRetryableStatus(status: number): boolean {
  return [
    408,
    409,
    425,
    429,
    500,
    502,
    503,
    504,
  ].includes(status);
}

/**
 * Membuat request ke Gemini dengan timeout.
 */
async function requestGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<Response> {
  const timeoutMs = getNumberFromEnv(
    "GEMINI_TIMEOUT_MS",
    DEFAULT_TIMEOUT_MS,
    5_000,
    120_000,
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mengubah kegagalan internal menjadi pesan yang aman untuk pengguna.
 */
function createErrorResponse(
  errorMessage: string,
): ChatResponseBody {
  return {
    response: errorMessage,
    formatted: {
      sections: [
        {
          title: "Informasi Layanan SIPA-NGAWI",
          body: errorMessage,
        },
      ],
    },
  };
}

/**
 * Fungsi utama untuk menghasilkan respons AI.
 */
export async function createChatResponse(
  apiKeyPayload: string,
  body: ExtendedChatRequestBody,
): Promise<ChatResponseBody> {
  const {
    message,
    history,
    currentDateContext,
  } = body;

  const userMessage = (message || "Halo").trim();

  if (!userMessage) {
    return createErrorResponse(
      "Silakan masukkan pertanyaan terlebih dahulu.",
    );
  }

  // ---------------------------------------------------------
  // 1. KONFIGURASI EFISIENSI TOKEN
  // ---------------------------------------------------------

  const requestedMode = process.env.TOKEN_THROTTLE_MODE;

  const mode: ThrottleMode =
    requestedMode === "SUPER_HEMAT" ||
    requestedMode === "NORMAL" ||
    requestedMode === "HEMAT"
      ? requestedMode
      : "HEMAT";

  const activeSetting = TOKEN_TUNING_CONFIG[mode];

  const trimmedHistory = Array.isArray(history)
    ? history.slice(-activeSetting.maxHistory)
    : [];

  // ---------------------------------------------------------
  // 2. SUSUN PROMPT
  // ---------------------------------------------------------

  const userPromptText = buildUserPrompt({
    userMessage,
    history: trimmedHistory,
    retrievedDocuments: [],
  });

  const finalSystemPrompt = currentDateContext
    ? `${SYSTEM_PROMPT}

[INFORMASI WAKTU RESMI]
Hari dan tanggal saat ini adalah ${currentDateContext}.
Gunakan informasi ini apabila pengguna menanyakan waktu
atau konteks tanggal terkini.`
    : SYSTEM_PROMPT;

  // ---------------------------------------------------------
  // 3. AMBIL API KEY DAN MODEL
  // ---------------------------------------------------------

  const apiKeys = getGeminiApiKeys(apiKeyPayload);
  const models = getGeminiModels();

  if (apiKeys.length === 0) {
    console.error(
      "[Gemini] API Key tidak ditemukan di environment.",
    );

    return createErrorResponse(
      "Layanan AI SIPA-NGAWI sedang belum dapat digunakan. Silakan hubungi administrator.",
    );
  }

  const maxRetries = getNumberFromEnv(
    "GEMINI_MAX_RETRIES",
    DEFAULT_RETRIES_PER_KEY,
    0,
    5,
  );

  let lastErrorDetails = "Tidak ada respons dari Gemini.";

  // ---------------------------------------------------------
  // 4. ROTASI MODEL DAN API KEY + RETRY
  // ---------------------------------------------------------

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const currentModel = models[modelIndex];

    console.log(
      `[Gemini] Mencoba model ${currentModel} (${modelIndex + 1}/${models.length}).`,
    );

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const currentKey = apiKeys[keyIndex];

      // Jangan pernah mencetak API Key ke log.
      console.log(
        `[Gemini] Mencoba API Key ${keyIndex + 1}/${apiKeys.length}.`,
      );

      for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
      ) {
        try {
          const response = await requestGemini(
            currentKey,
            currentModel,
            finalSystemPrompt,
            userPromptText,
            activeSetting.maxTokens,
            activeSetting.temperature,
          );

          const responseText = await response.text();

          // Mendeteksi endpoint yang mengembalikan HTML.
          if (responseText.trimStart().startsWith("<")) {
            lastErrorDetails =
              `Endpoint mengembalikan HTML. HTTP ${response.status}.`;

            console.error(
              `[Gemini] Respons HTML diterima dari endpoint.`,
            );

            // Kemungkinan URL atau endpoint bermasalah.
            break;
          }

          // -------------------------------------------------
          // 5. TANGANI HTTP ERROR
          // -------------------------------------------------

          if (!response.ok) {
            lastErrorDetails =
              `HTTP ${response.status}: ${responseText}`;

            console.error(
              `[Gemini] Model ${currentModel}, Key ${keyIndex + 1}, HTTP ${response.status}.`,
            );

            // Error sementara: retry menggunakan key yang sama.
            if (isRetryableStatus(response.status)) {
              if (attempt < maxRetries) {
                const delay = getRetryDelay(attempt);

                console.warn(
                  `[Gemini] Gangguan sementara. Retry ${attempt + 1}/${maxRetries} dalam ${delay} ms.`,
                );

                await sleep(delay);
                continue;
              }

              // Retry habis: lanjut ke API Key berikutnya.
              break;
            }

            // Error autentikasi/izin: langsung coba key berikutnya.
            if (
              response.status === 401 ||
              response.status === 403
            ) {
              console.warn(
                `[Gemini] API Key ${keyIndex + 1} ditolak. Mencoba key berikutnya.`,
              );

              break;
            }

            // Error model/request: coba model cadangan jika ada.
            if (
              response.status === 400 ||
              response.status === 404 ||
              response.status === 422
            ) {
              console.warn(
                `[Gemini] Model atau request bermasalah. Memeriksa model cadangan.`,
              );

              break;
            }

            // Error lain: lanjut ke key berikutnya.
            break;
          }

          // -------------------------------------------------
          // 6. PARSING RESPONS GEMINI
          // -------------------------------------------------

          let data: any;

          try {
            data = JSON.parse(responseText);
          } catch {
            lastErrorDetails =
              "Respons Gemini bukan JSON yang valid.";

            console.error(
              "[Gemini] Gagal membaca JSON respons.",
            );

            break;
          }

          const rawAnswerText =
            data?.choices?.[0]?.message?.content;

          if (
            typeof rawAnswerText !== "string" ||
            !rawAnswerText.trim()
          ) {
            lastErrorDetails =
              "Gemini berhasil merespons tetapi isi jawabannya kosong.";

            console.error(
              "[Gemini] Respons berhasil tetapi konten kosong.",
            );

            break;
          }

          const cleanAnswerText =
            sanitizeResponseText(rawAnswerText);

          if (!cleanAnswerText) {
            lastErrorDetails =
              "Respons Gemini kosong setelah proses pembersihan.";

            break;
          }

          console.log(
            `[Gemini] Berhasil menggunakan model ${currentModel}, API Key ${keyIndex + 1}.`,
          );

          // -------------------------------------------------
          // 7. KEMBALIKAN RESPONS BERHASIL
          // -------------------------------------------------

          return {
            response: cleanAnswerText,
            formatted: {
              sections: [
                {
                  title: "Jawaban SIPA-NGAWI",
                  body: cleanAnswerText,
                },
              ],
            },
          };
        } catch (error: unknown) {
          lastErrorDetails =
            error instanceof Error
              ? error.message
              : String(error);

          const isTimeout =
            error instanceof Error &&
            error.name === "AbortError";

          console.error(
            `[Gemini] Request gagal pada model ${currentModel}, Key ${keyIndex + 1}:`,
            lastErrorDetails,
          );

          // Gangguan jaringan atau timeout dapat dicoba ulang.
          if (attempt < maxRetries) {
            const delay = getRetryDelay(attempt);

            console.warn(
              `[Gemini] ${isTimeout ? "Timeout" : "Gangguan koneksi"}. Retry dalam ${delay} ms.`,
            );

            await sleep(delay);
            continue;
          }

          // Retry habis: lanjut ke API Key berikutnya.
          break;
        }
      }
    }

    // Jika semua key pada model ini gagal, lanjut ke model berikutnya.
    if (modelIndex < models.length - 1) {
      console.warn(
        `[Gemini] Semua API Key gagal pada ${currentModel}. Beralih ke model cadangan.`,
      );
    }
  }

  // ---------------------------------------------------------
  // 8. SEMUA MODEL DAN API KEY GAGAL
  // ---------------------------------------------------------

  console.error(
    "[Gemini] Semua percobaan gagal. Detail terakhir:",
    lastErrorDetails,
  );

  return createErrorResponse(
    "Mohon maaf, layanan Asisten Virtual SIPA-NGAWI sedang mengalami gangguan sementara. Silakan coba kembali beberapa saat lagi. Jika masalah terus terjadi, silakan hubungi administrator.",
  );
}