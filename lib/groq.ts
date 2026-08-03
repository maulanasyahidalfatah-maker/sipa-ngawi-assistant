import Groq from "groq-sdk";

// Ambil string API Keys dari .env.local lalu pisahkan menjadi array
const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
const apiKeys = rawKeys
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

let currentKeyIndex = 0;

/**
 * Mendapatkan instance Groq SDK berdasarkan index key aktif
 */
function getGroqClient(): Groq {
  if (apiKeys.length === 0) {
    throw new Error("GROQ_API_KEYS belum dikonfigurasi di file .env.local!");
  }
  
  const apiKey = apiKeys[currentKeyIndex];
  return new Groq({ apiKey });
}

/**
 * Wrapper panggilan Groq API dengan sistem Rotasi Key Otomatis saat Rate Limit (429)
 */
export async function createGroqChatCompletion(
  payload: Parameters<Groq["chat"]["completions"]["create"]>[0]
) {
  let attempts = 0;
  const maxAttempts = apiKeys.length;

  while (attempts < maxAttempts) {
    try {
      const client = getGroqClient();
      // Eksekusi panggilan API
      return await client.chat.completions.create(payload);
    } catch (error: any) {
      // Cek apakah error merupakan Rate Limit 429 atau token/requests exceeded
      const isRateLimit =
        error?.status === 429 ||
        error?.error?.type === "tokens" ||
        error?.error?.code === "rate_limit_exceeded";

      if (isRateLimit && apiKeys.length > 1) {
        console.warn(
          `[Groq Rotation] API Key index [${currentKeyIndex}] mengalami Rate Limit 429. Beralih ke Key berikutnya...`
        );
        // Pindah ke index key berikutnya (Round-Robin)
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        attempts++;
      } else {
        // Jika error biasa (bukan rate limit), lempar error ke penanganan utama
        throw error;
      }
    }
  }

  throw new Error(
    "Semua GROQ_API_KEYS telah mencapai kuota harian (Rate Limit 429). Silakan tunggu beberapa saat."
  );
}