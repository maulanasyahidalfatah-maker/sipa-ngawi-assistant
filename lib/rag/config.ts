export const DEFAULT_GENERATION_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
export const GENERATION_MODELS = getEnvList(process.env.GOOGLE_GENERATION_MODELS, DEFAULT_GENERATION_MODELS);
export const EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL ?? "gemini-embedding-001";

export const CHUNK_MAX_CHARS = 1600;
export const CHUNK_OVERLAP_CHARS = 250;
export const TOP_K_CHUNKS = 5;
export const TOP_K_CANDIDATES = 12;
export const MIN_RELEVANCE_SCORE = 0.3;
export const MAX_HISTORY_MESSAGES = 8;
export const SOP_INDEX_VERSION = 4;

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
