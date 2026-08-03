// Hanya gunakan gemini-2.0-flash
export const DEFAULT_GENERATION_MODELS = ["gemini-2.0-flash"];
export const GENERATION_MODELS = getEnvList(process.env.GOOGLE_GENERATION_MODELS, DEFAULT_GENERATION_MODELS);

export const EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL ?? "text-embedding-004";

export const CHUNK_MAX_CHARS = 1000;
export const CHUNK_OVERLAP_CHARS = 150;
export const TOP_K_CHUNKS = 3;
export const TOP_K_CANDIDATES = 6;
export const MIN_RELEVANCE_SCORE = 0.1;
export const MAX_HISTORY_MESSAGES = 4;

export const SOP_INDEX_VERSION = 11;

export function getGeminiApiKeys() {
  return getEnvList([
    process.env.GOOGLE_GENAI_API_KEYS,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY_2,
    process.env.GOOGLE_GENAI_API_KEY_3,
    process.env.GOOGLE_GENAI_API_KEY_4,
    process.env.GOOGLE_GENAI_API_KEY_5,
    process.env.GOOGLE_API_KEY,
  ]);
}

export function getEnvList(value: string | undefined, fallback?: string[]): string[];
export function getEnvList(value: Array<string | undefined>, fallback?: string[]): string[];
export function getEnvList(value: string | Array<string | undefined> | undefined, fallback: string[] = []) {
  const values = Array.isArray(value) ? value : [value];
  const entries = values
    .flatMap((entry) => entry?.split(",") ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(entries.length ? entries : fallback));
}

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
    "not found"
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