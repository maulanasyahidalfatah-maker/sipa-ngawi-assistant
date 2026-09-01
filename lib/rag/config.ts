// Konfigurasi Model Utama Qwen DashScope
export const DEFAULT_GENERATION_MODELS = ["qwen-plus", "qwen-turbo", "qwen-max"];
export const GENERATION_MODELS = getEnvList(
  process.env.QWEN_MODELS || process.env.QWEN_MODEL,
  DEFAULT_GENERATION_MODELS
);

// Model Embedding (Digunakan retriever.ts)
export const EMBEDDING_MODEL =
  process.env.GOOGLE_EMBEDDING_MODEL ||
  process.env.EMBEDDING_MODEL ||
  "text-embedding-004";

// Parameter Chunk & RAG
export const CHUNK_MAX_CHARS = 1000;
export const CHUNK_OVERLAP_CHARS = 150;
export const TOP_K_CHUNKS = 3;
export const TOP_K_CANDIDATES = 6;
export const MIN_RELEVANCE_SCORE = 0.1;

// Batas Riwayat Percakapan
export const MAX_HISTORY_MESSAGES = 4;

export const SOP_INDEX_VERSION = 11;

/**
 * Helper untuk mengambil daftar API Keys Qwen dari Environment Variables
 */
export function getQwenApiKeys() {
  return getEnvList([
    process.env.QWEN_API_KEYS,
    process.env.QWEN_API_KEY,
    process.env.DASHSCOPE_API_KEY,
  ]);
}

export function getEnvList(value: string | undefined, fallback?: string[]): string[];
export function getEnvList(value: Array<string | undefined>, fallback?: string[]): string[];
export function getEnvList(
  value: string | Array<string | undefined> | undefined,
  fallback: string[] = []
) {
  const values = Array.isArray(value) ? value : [value];
  const entries = values
    .flatMap((entry) => entry?.split(",") ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(entries.length ? entries : fallback));
}

/**
 * Deteksi Error Rate Limit / Server untuk Rotasi Kunci & Model
 */
export function shouldFallbackToNextModelOrKey(error: unknown) {
  const serializedError = serializeError(error).toLowerCase();

  return [
    "429",
    "resource_exhausted",
    "quota",
    "rate limit",
    "rate-limit",
    "too many requests",
    "limit",
    "503",
    "unavailable",
    "temporarily",
    "high demand",
    "internal",
    "server error",
    "404",
    "not found",
  ].some((marker) => serializedError.includes(marker));
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}