import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { 
  ChatRequestBody, 
  ChatResponseBody, 
  FormattedAnswer 
} from "./types";

export type ThrottleMode = "SUPER_HEMAT" | "HEMAT" | "NORMAL";

export const TOKEN_TUNING_CONFIG = {
  SUPER_HEMAT: { maxTokens: 450, maxHistory: 2, temperature: 0.1 },
  HEMAT: { maxTokens: 800, maxHistory: 4, temperature: 0.1 },
  NORMAL: { maxTokens: 1500, maxHistory: 8, temperature: 0.2 },
};

/**
 * Membersihkan respons dari sisa-sisa template penutup otomatis yang tidak diinginkan
 */
function sanitizeResponseText(text: string): string {
  if (!text) return "";
  
  return text
    .replace(/Terima kasih atas konfirmasinya\.?\s*(Jika ada pertanyaan lanjutan[^\n]*)?/gi, "")
    .replace(/Jika ada pertanyaan lanjutan terkait layanan pendidikan[^\n]*/gi, "")
    .trim();
}

export async function createChatResponse(
  apiKeyPayload: string, 
  body: ChatRequestBody
): Promise<ChatResponseBody> {
  const { message, history } = body;
  const userMessage = (message || "Halo").trim();

  // Mode efisiensi token & riwayat
  const mode: ThrottleMode =
    (process.env.TOKEN_THROTTLE_MODE as ThrottleMode) || "HEMAT";
  const activeSetting = TOKEN_TUNING_CONFIG[mode] || TOKEN_TUNING_CONFIG.HEMAT;

  const trimmedHistory = (history || []).slice(-activeSetting.maxHistory);

  // Susun Prompt
  const userPromptText = buildUserPrompt({
    userMessage,
    history: trimmedHistory,
    retrievedDocuments: [], // Bypass dokumen RAG sementara
  });

  // Ambil API Keys Qwen dari .env.local (Mendukung multi-key dipisah koma)
  const rawKeys =
    process.env.QWEN_API_KEYS ||
    apiKeyPayload ||
    process.env.QWEN_API_KEY ||
    "";
  const apiKeys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const qwenBaseUrl =
    process.env.QWEN_BASE_URL ||
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const qwenModel = process.env.QWEN_MODEL || "qwen-plus";

  if (apiKeys.length === 0) {
    return createErrorResponse(
      "QWEN_API_KEY atau QWEN_API_KEYS tidak ditemukan. Pastikan sudah diisi di .env.local"
    );
  }

  let lastErrorDetails = "";

  // =======================================================================
  // LOOPING MULTI-KEY: Rotasi Otomatis Jika Terkena Rate Limit (429)
  // =======================================================================
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i];
    try {
      console.log(`[Qwen RAG] Mengirim request menggunakan API Key ke-${i + 1} (${qwenModel})...`);

      const response = await fetch(`${qwenBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentKey}`,
        },
        body: JSON.stringify({
          model: qwenModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPromptText },
          ],
          temperature: activeSetting.temperature,
          max_tokens: activeSetting.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Cek apakah error merupakan Rate Limit 429
        if (response.status === 429 && i < apiKeys.length - 1) {
          console.warn(
            `⚠️ [Qwen RAG] Key ke-${i + 1} terkena Rate Limit (429). Otomatis beralih ke Key ke-${i + 2}...`
          );
          lastErrorDetails = `HTTP 429: ${errorText}`;
          continue; // Pindah ke key berikutnya
        }

        throw new Error(`Qwen HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawAnswerText =
        data.choices?.[0]?.message?.content || "Mohon maaf, tidak ada respons.";

      const cleanAnswerText = sanitizeResponseText(rawAnswerText);

      // Jika berhasil, langsung kembalikan respons bersih
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
    } catch (error: any) {
      lastErrorDetails = error instanceof Error ? error.message : String(error);

      // Cek apakah pesan error mengindikasikan rate limit
      const isRateLimit =
        lastErrorDetails.includes("429") ||
        lastErrorDetails.includes("rate_limit_exceeded");

      if (isRateLimit && i < apiKeys.length - 1) {
        console.warn(
          `⚠️ [Qwen RAG] Key ke-${i + 1} limit. Beralih ke Key ke-${i + 2}...`
        );
        continue;
      }

      console.error(`❌ [Qwen API Error pada Key ke-${i + 1}]:`, lastErrorDetails);
      break;
    }
  }

  // Jika semua percobaan kunci gagal
  return createErrorResponse(
    `[Qwen API Error]: Gagal mendapatkan respons dari semua kunci API Qwen. Detail terakhir: ${lastErrorDetails}`
  );
}

/**
 * Helper internal untuk membuat format respons balasan saat terjadi Error
 */
function createErrorResponse(errorMessage: string): ChatResponseBody {
  return {
    response: errorMessage,
    formatted: {
      sections: [
        {
          title: "Peringatan Sistem",
          body: errorMessage,
        },
      ],
    },
  };
}