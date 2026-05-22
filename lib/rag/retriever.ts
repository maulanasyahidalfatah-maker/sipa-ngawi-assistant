import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  EMBEDDING_MODEL,
  MIN_RELEVANCE_SCORE,
  SOP_INDEX_VERSION,
  TOP_K_CANDIDATES,
  TOP_K_CHUNKS,
} from "./config";
import { loadSopDocuments, loadSopText, normalizeText } from "./sop";
import type { RetrievedSopDocument, SopDocument, SopMetadata } from "./types";

const SOP_INDEX_CACHE_PATH = process.env.SOP_INDEX_CACHE_PATH
  ?? path.join(process.env.VERCEL ? "/tmp" : process.cwd(), ".cache", "sop-langchain-embeddings.json");

type CachedSopDocument = {
  id?: string;
  pageContent: string;
  metadata: SopMetadata;
};

type SopIndexCache = {
  sourceHash: string;
  embeddingModel: string;
  documents: CachedSopDocument[];
  embeddings: number[][];
};

type VectorStoreBundle = {
  vectorStore: MemoryVectorStore;
  documents: SopDocument[];
};

const vectorStorePromises = new Map<string, Promise<VectorStoreBundle>>();

export async function retrieveRelevantDocuments(apiKey: string, query: string): Promise<RetrievedSopDocument[]> {
  const { vectorStore, documents } = await getVectorStore(apiKey);
  const vectorResults = await vectorStore.similaritySearchWithScore(query, TOP_K_CANDIDATES);
  const candidates = new Map<string, RetrievedSopDocument>();

  vectorResults.forEach(([document, semanticScore]) => {
    const result = buildRetrievedResult(query, document as SopDocument, semanticScore);
    candidates.set(result.document.metadata.chunkId, result);
  });

  documents.forEach((document) => {
    const intentBoost = intentSectionBoost(query, document);

    if (intentBoost <= 0) {
      return;
    }

    const existing = candidates.get(document.metadata.chunkId);
    const result = buildRetrievedResult(query, document, existing?.semanticScore ?? 0, intentBoost);
    candidates.set(document.metadata.chunkId, result);
  });

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .filter((result) => result.score >= MIN_RELEVANCE_SCORE)
    .slice(0, TOP_K_CHUNKS);
}

export function buildRetrievalQuery(userMessage: string, history: { role: string; content: string }[] | undefined) {
  const recentUserMessages = history
    ?.filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content)
    .join("\n") ?? "";

  return expandRetrievalQuery(normalizeText(`${recentUserMessages}\n${userMessage}`));
}

async function getVectorStore(apiKey: string) {
  const cacheKey = `${apiKey}:${EMBEDDING_MODEL}`;
  const existing = vectorStorePromises.get(cacheKey);

  if (existing) {
    return existing;
  }

  const promise = buildVectorStore(apiKey).catch((error) => {
    vectorStorePromises.delete(cacheKey);
    throw error;
  });

  vectorStorePromises.set(cacheKey, promise);
  return promise;
}

async function buildVectorStore(apiKey: string): Promise<VectorStoreBundle> {
  const embeddings = createSopEmbeddings(apiKey);
  const cachedIndex = await readCachedSopIndex();
  const vectorStore = await MemoryVectorStore.fromExistingIndex(embeddings);

  if (cachedIndex) {
    const documents = cachedIndex.documents.map((document) => ({
      id: document.id,
      pageContent: document.pageContent,
      metadata: document.metadata,
    }));

    await vectorStore.addVectors(
      cachedIndex.embeddings,
      documents
    );
    return { vectorStore, documents };
  }

  const documents = await loadSopDocuments();
  const vectors = await embeddings.embedDocuments(documents.map((document) => document.pageContent));
  await vectorStore.addVectors(vectors, documents);
  await writeCachedSopIndex(documents, vectors);

  return { vectorStore, documents };
}

function createSopEmbeddings(apiKey: string) {
  const documentEmbeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    modelName: EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });
  const queryEmbeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    modelName: EMBEDDING_MODEL,
    taskType: TaskType.RETRIEVAL_QUERY,
  });

  return {
    embedDocuments: (documents: string[]) => documentEmbeddings.embedDocuments(documents),
    embedQuery: (document: string) => queryEmbeddings.embedQuery(document),
  };
}

async function getSourceHash() {
  const sopText = await loadSopText();

  return createHash("sha256")
    .update(sopText)
    .update(EMBEDDING_MODEL)
    .update(String(SOP_INDEX_VERSION))
    .digest("hex");
}

async function readCachedSopIndex() {
  try {
    const [sourceHash, rawCache] = await Promise.all([
      getSourceHash(),
      fs.readFile(SOP_INDEX_CACHE_PATH, "utf8"),
    ]);
    const cache = JSON.parse(rawCache) as SopIndexCache;

    if (
      cache.sourceHash === sourceHash &&
      cache.embeddingModel === EMBEDDING_MODEL &&
      Array.isArray(cache.documents) &&
      Array.isArray(cache.embeddings) &&
      cache.documents.length === cache.embeddings.length &&
      cache.embeddings.every((embedding) => Array.isArray(embedding) && embedding.length > 0)
    ) {
      return cache;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeCachedSopIndex(documents: SopDocument[], embeddings: number[][]) {
  try {
    const sourceHash = await getSourceHash();
    const cache: SopIndexCache = {
      sourceHash,
      embeddingModel: EMBEDDING_MODEL,
      documents: documents.map((document) => ({
        id: document.id,
        pageContent: document.pageContent,
        metadata: document.metadata,
      })),
      embeddings,
    };

    await fs.mkdir(path.dirname(SOP_INDEX_CACHE_PATH), { recursive: true });
    await fs.writeFile(SOP_INDEX_CACHE_PATH, JSON.stringify(cache), "utf8");
  } catch (error) {
    console.warn("Gagal menulis cache embedding SOP. Request tetap dilanjutkan tanpa cache file.", error);
  }
}

function keywordOverlapScore(query: string, text: string) {
  const queryTokens = new Set(tokenize(query));
  const textTokens = new Set(tokenize(text));

  if (!queryTokens.size || !textTokens.size) {
    return 0;
  }

  let matches = 0;
  queryTokens.forEach((token) => {
    if (textTokens.has(token)) {
      matches += 1;
    }
  });

  return matches / queryTokens.size;
}

function buildRetrievedResult(query: string, document: SopDocument, semanticScore: number, intentBoost = 0): RetrievedSopDocument {
  const lexicalScore = keywordOverlapScore(query, `${document.metadata.sectionTitle}\n${document.pageContent}`);
  const score = semanticScore + lexicalScore * 0.15 + intentBoost;

  return {
    document,
    semanticScore,
    lexicalScore,
    score,
  };
}

function intentSectionBoost(query: string, document: SopDocument) {
  const title = document.metadata.sectionTitle.toLowerCase();

  if (isLossReportQuery(query) && /(sktlk|kehilangan)/i.test(title)) {
    return 1;
  }

  if (isCommunityDisturbanceQuery(query) && /(pengaduan|mediasi|siskamling)/i.test(title)) {
    return 0.35;
  }

  return 0;
}

function expandRetrievalQuery(query: string) {
  const additions: string[] = [];

  if (isCommunityDisturbanceQuery(query)) {
    additions.push("pengaduan laporan kriminal perselisihan warga tipiring mediasi problem solving bhabinkamtibmas ketertiban lingkungan RT RW SPKT");
  }

  if (isLossReportQuery(query)) {
    additions.push("SKTLK laporan kehilangan dokumen barang hilang KTP SIM ATM buku tabungan BPKB sertifikat kronologi SPKT biaya gratis");
  }

  if (!additions.length) {
    return query;
  }

  return normalizeText(`${query}
${additions.join("\n")}`);
}

function isCommunityDisturbanceQuery(query: string) {
  return [
    "bising",
    "kebisingan",
    "ganggu",
    "terganggu",
    "sound",
    "horeng",
    "speaker",
    "musik",
    "karaoke",
    "tetangga",
    "keributan",
    "ribut",
    "berisik",
    "ketertiban",
  ].some((keyword) => query.toLowerCase().includes(keyword));
}

function isLossReportQuery(query: string) {
  return [
    "hilang",
    "kehilangan",
    "kecurian",
    "dokumen",
    "ktp",
    "sim",
    "atm",
    "buku tabungan",
    "bpkb",
    "sertifikat",
  ].some((keyword) => query.toLowerCase().includes(keyword));
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2) ?? [];
}
