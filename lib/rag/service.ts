import Groq from "groq-sdk";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import type { 
  ChatRequestBody, 
  ChatResponseBody, 
  FormattedAnswer 
} from "./types";

export async function createChatResponse(apiKeyPayload: string, body: ChatRequestBody): Promise<ChatResponseBody> {
  const { message, history } = body;
  const userMessage = (message || "Halo").trim();

  // Ambil API Key Groq dari .env.local (Mendukung string dipisah koma)
  const rawKeys = process.env.GROQ_API_KEYS || apiKeyPayload || process.env.GROQ_API_KEY || "";
  const apiKeys = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);

  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  // Susun Prompt
  const userPromptText = buildUserPrompt({
    userMessage,
    history,
    retrievedDocuments: [], // Bypass dokumen RAG sementara
  });

  if (apiKeys.length === 0) {
    return createErrorResponse("GROQ_API_KEYS tidak ditemukan. Pastikan sudah diisi di .env.local");
  }

  let lastErrorDetails = "";

  // =======================================================================
  // LOOPING MULTI-KEY: Rotasi Otomatis Jika Terkena Rate Limit (429)
  // =======================================================================
  for (let i = 0; i < apiKeys.length; i++) {
    const currentKey = apiKeys[i];
    try {
      console.log(`[Groq RAG] Mengirim request menggunakan API Key ke-${i + 1}...`);
      const groq = new Groq({ apiKey: currentKey });

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPromptText },
        ],
        model: groqModel,
        temperature: 0.2,
        max_tokens: 1024,
      });

      const answerText = completion.choices[0]?.message?.content || "Mohon maaf, tidak ada respons.";

      // Jika berhasil, langsung kembalikan respons ke route!
      return {
        response: answerText,
        formatted: {
          sections: [
            {
              title: "Jawaban SIPA-NGAWI",
              body: answerText,
            },
          ],
        },
      };
    } catch (error: any) {
      lastErrorDetails = error instanceof Error ? error.message : String(error);

      // Cek apakah error merupakan Rate Limit 429 atau kuota token habis
      const isRateLimit =
        error?.status === 429 ||
        error?.error?.type === "tokens" ||
        error?.error?.code === "rate_limit_exceeded";

      if (isRateLimit && i < apiKeys.length - 1) {
        console.warn(`⚠️ [Groq RAG] Key ke-${i + 1} terkena Rate Limit (429). Otomatis beralih ke Key ke-${i + 2}...`);
        continue; // Lanjut ke iterasi key berikutnya (jangan break)
      }

      // Jika errornya bukan 429 (misal 401 salah token) atau jika ini sudah key terakhir
      console.error(`❌ [Groq API Error pada Key ke-${i + 1}]:`, lastErrorDetails);
      break; // Hentikan loop dan turun ke return error di bawah
    }
  }

  // Jika semua percobaan gagal (semua key limit)
  return createErrorResponse(`[Groq API Error]: Semua kuota kunci API sedang penuh/limit. Detail terakhir: ${lastErrorDetails}`);
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