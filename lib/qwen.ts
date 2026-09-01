// Ambil string API Keys Qwen dari .env.local (mendukung multi-key dipisah koma)
const rawKeys = process.env.QWEN_API_KEYS || process.env.QWEN_API_KEY || "";
const apiKeys = rawKeys
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

const qwenBaseUrl =
  process.env.QWEN_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const defaultModel = process.env.QWEN_MODEL || "qwen-plus";

let currentKeyIndex = 0;

export interface QwenChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenChatPayload {
  model?: string;
  messages: QwenChatMessage[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

/**
 * Mendapatkan API Key Qwen aktif
 */
function getActiveApiKey(): string {
  if (apiKeys.length === 0) {
    throw new Error("QWEN_API_KEY belum dikonfigurasi di file .env.local!");
  }
  return apiKeys[currentKeyIndex];
}

/**
 * Wrapper panggilan Qwen API dengan sistem Rotasi Key Otomatis saat Rate Limit (429)
 */
export async function createGroqChatCompletion(payload: QwenChatPayload) {
  let attempts = 0;
  const maxAttempts = Math.max(apiKeys.length, 1);
  let lastErrorDetails = "";

  while (attempts < maxAttempts) {
    const apiKey = getActiveApiKey();

    try {
      const response = await fetch(`${qwenBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: payload.model || defaultModel,
          messages: payload.messages,
          temperature: payload.temperature ?? 0.1,
          max_tokens: payload.max_tokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        // Deteksi Rate Limit (429) untuk rotasi key
        if (response.status === 429 && apiKeys.length > 1) {
          console.warn(
            `⚠️ [Qwen Rotation] Key index [${currentKeyIndex}] terkena Rate Limit 429. Beralih ke Key berikutnya...`
          );
          currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
          attempts++;
          continue;
        }

        throw new Error(`Qwen HTTP ${response.status}: ${errorBody}`);
      }

      return await response.json();
    } catch (error: any) {
      lastErrorDetails = error instanceof Error ? error.message : String(error);

      // Cek apakah error string mengindikasikan rate limit
      const isRateLimit =
        error?.status === 429 ||
        lastErrorDetails.includes("429") ||
        lastErrorDetails.includes("rate_limit_exceeded");

      if (isRateLimit && apiKeys.length > 1 && attempts < maxAttempts - 1) {
        console.warn(
          `⚠️ [Qwen Rotation] Key index [${currentKeyIndex}] limit. Mencoba Key berikutnya...`
        );
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Semua QWEN_API_KEYS mengalami kegagalan/limit. Detail: ${lastErrorDetails}`
  );
}