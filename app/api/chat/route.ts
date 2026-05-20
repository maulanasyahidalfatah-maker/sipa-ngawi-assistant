import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GENERATION_MODEL = "gemini-2.5-flash-lite";
const EMBEDDING_MODEL = "text-embedding-004";
const SOP_FILE_PATH = path.join(process.cwd(), "SOP.txt");

const CHUNK_MAX_CHARS = 1600;
const CHUNK_OVERLAP_CHARS = 250;
const EMBEDDING_BATCH_SIZE = 16;
const TOP_K_CHUNKS = 5;
const MIN_RELEVANCE_SCORE = 0.3;
const MAX_HISTORY_MESSAGES = 8;

type HistoryMessage = {
  role: "user" | "assistant" | string;
  content: string;
};

type SopSection = {
  title: string;
  text: string;
};

type SopChunk = {
  id: string;
  title: string;
  text: string;
  embedding: number[];
};

type RetrievedChunk = SopChunk & {
  score: number;
};

let sopIndexPromise: Promise<SopChunk[]> | null = null;

const SYSTEM_PROMPT = `Kamu adalah Layanan Informasi Polsek Rembang yang ramah, hangat, dan suka membantu seperti teman ngobrol.

KEPRIBADIAN:
- Bicara santai tapi tetap sopan, seperti teman yang kebetulan kerja di Polsek
- Gunakan bahasa sehari-hari yang mudah dipahami
- Tunjukkan empati dan pengertian terhadap masalah warga
- Jangan kaku seperti robot, jadilah manusiawi

ATURAN RAG:
1. Jawab berdasarkan KONTEKS SOP TERAMBIL dan riwayat percakapan yang relevan.
2. Jangan mengarang detail yang tidak ada di konteks SOP.
3. Kalau konteks SOP tidak cukup untuk menjawab, katakan dengan ramah bahwa informasinya belum tersedia di SOP, lalu arahkan warga untuk menghubungi SPKT atau datang ke Polsek.
4. Untuk layanan yang bukan di Polsek tetapi ada di konteks SOP, tetap bantu jelaskan dan ingatkan lokasi/wewenangnya.
5. Jika pertanyaan benar-benar tidak berhubungan dengan layanan kepolisian, jawab: "Waduh, untuk yang itu saya kurang paham ya Kak. Saya lebih jago soal layanan kepolisian seperti SKCK, laporan kehilangan, atau info seputar SIM. Ada yang bisa saya bantu soal itu?"

ATURAN FORMAT JAWABAN:
1. DILARANG KERAS menggunakan tanda bintang (*) atau tanda pagar (#) dalam jawaban
2. DILARANG menggunakan format bold, italic, atau markdown apapun
3. Gunakan HANYA teks biasa (plain text)
4. Untuk membuat daftar, gunakan angka (1, 2, 3) atau tanda strip (-)
5. Untuk menekankan kata penting, gunakan HURUF KAPITAL
6. Beri jarak antar paragraf supaya mudah dibaca
7. Gunakan emoji secukupnya untuk kesan ramah

INFORMASI PENTING:
- Nomor Hotline SPKT: 0822-2003-3742
- Alamat Polsek: Jl. P. Sudirman, Kabongan Lor, Kec. Rembang, Jawa Tengah 59219
- SPKT buka 24 jam, tapi layanan administrasi seperti SKCK hanya Senin-Jumat`;

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitSopIntoSections(sopText: string): SopSection[] {
  const normalized = normalizeText(sopText);
  const parts = normalized
    .split(/(?=^\d+\.\s+.+$)/gm)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part, index) => {
    const [firstLine] = part.split("\n");
    const isNumberedSection = /^\d+\.\s+/.test(firstLine);

    return {
      title: isNumberedSection ? firstLine.trim() : `Dokumen SOP ${index + 1}`,
      text: part,
    };
  });
}

function splitSectionIntoChunks(section: SopSection): Omit<SopChunk, "embedding">[] {
  if (section.text.length <= CHUNK_MAX_CHARS) {
    return [
      {
        id: createChunkId(section.title, 1),
        title: section.title,
        text: section.text,
      },
    ];
  }

  const paragraphs = section.text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: Omit<SopChunk, "embedding">[] = [];
  let current = section.title;
  let previousTail = "";

  for (const paragraph of paragraphs) {
    const candidate = `${current}\n\n${paragraph}`;

    if (candidate.length > CHUNK_MAX_CHARS && current !== section.title) {
      chunks.push({
        id: createChunkId(section.title, chunks.length + 1),
        title: section.title,
        text: current,
      });

      current = previousTail
        ? `${section.title}\n\nKonteks sebelumnya: ${previousTail}\n\n${paragraph}`
        : `${section.title}\n\n${paragraph}`;
    } else {
      current = candidate;
    }

    previousTail = paragraph.slice(-CHUNK_OVERLAP_CHARS);
  }

  if (current.trim()) {
    chunks.push({
      id: createChunkId(section.title, chunks.length + 1),
      title: section.title,
      text: current,
    });
  }

  return chunks;
}

function createChunkId(title: string, part: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "sop"}-${part}`;
}

async function getSopIndex(ai: GoogleGenAI) {
  if (!sopIndexPromise) {
    sopIndexPromise = buildSopIndex(ai);
  }

  return sopIndexPromise;
}

async function buildSopIndex(ai: GoogleGenAI): Promise<SopChunk[]> {
  const sopText = await fs.readFile(SOP_FILE_PATH, "utf8");
  const chunksWithoutEmbeddings = splitSopIntoSections(sopText).flatMap(splitSectionIntoChunks);
  const chunks: SopChunk[] = [];

  for (let start = 0; start < chunksWithoutEmbeddings.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunksWithoutEmbeddings.slice(start, start + EMBEDDING_BATCH_SIZE);
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch.map((chunk) => `${chunk.title}\n\n${chunk.text}`),
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });

    const embeddings = response.embeddings ?? [];

    batch.forEach((chunk, index) => {
      const embedding = embeddings[index]?.values;

      if (!embedding?.length) {
        throw new Error(`Embedding kosong untuk chunk SOP: ${chunk.id}`);
      }

      chunks.push({
        ...chunk,
        embedding,
      });
    });
  }

  return chunks;
}

async function retrieveRelevantChunks(ai: GoogleGenAI, query: string): Promise<RetrievedChunk[]> {
  const [sopIndex, queryEmbedding] = await Promise.all([
    getSopIndex(ai),
    embedQuery(ai, query),
  ]);

  return sopIndex
    .map((chunk) => {
      const semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      const lexicalScore = keywordOverlapScore(query, `${chunk.title}\n${chunk.text}`);
      const score = semanticScore + lexicalScore * 0.15;

      return {
        ...chunk,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .filter((chunk) => chunk.score >= MIN_RELEVANCE_SCORE)
    .slice(0, TOP_K_CHUNKS);
}

async function embedQuery(ai: GoogleGenAI, query: string) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: {
      taskType: "RETRIEVAL_QUERY",
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding?.length) {
    throw new Error("Embedding query kosong");
  }

  return embedding;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);

  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

function tokenize(text: string) {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2) ?? [];
}

function formatRetrievedContext(chunks: RetrievedChunk[]) {
  if (!chunks.length) {
    return "Tidak ada konteks SOP yang cukup relevan untuk pertanyaan ini.";
  }

  return chunks
    .map((chunk, index) => {
      return `KONTEKS ${index + 1}
ID: ${chunk.id}
Judul: ${chunk.title}
Skor relevansi: ${chunk.score.toFixed(3)}
Isi:
${chunk.text}`;
    })
    .join("\n\n---\n\n");
}

function formatConversationHistory(history: HistoryMessage[] | undefined) {
  if (!history?.length) {
    return "Belum ada riwayat percakapan.";
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const roleLabel = message.role === "user" ? "Pengguna" : "Asisten";
      return `${roleLabel}: ${message.content}`;
    })
    .join("\n");
}

function buildPrompt(params: {
  userMessage: string;
  history?: HistoryMessage[];
  retrievedChunks: RetrievedChunk[];
}) {
  return `${SYSTEM_PROMPT}

KONTEKS SOP TERAMBIL:
${formatRetrievedContext(params.retrievedChunks)}

RIWAYAT PERCAKAPAN:
${formatConversationHistory(params.history)}

INSTRUKSI AKHIR:
- Jawab pertanyaan pengguna terakhir.
- Prioritaskan konteks SOP terambil, bukan pengetahuan umum.
- Jika ini pesan pertama, boleh mulai dengan sapaan hangat.

Pengguna: ${params.userMessage}
Asisten:`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, image } = await request.json();

    if (!message && !image) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey) {
      console.error("API key not found");
      return NextResponse.json(
        { error: "API key tidak ditemukan" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const userMessage = message || "Tolong analisis gambar ini dan jelaskan apa yang kamu lihat.";
    const retrievalQuery = buildRetrievalQuery(userMessage, history);
    const retrievedChunks = await retrieveRelevantChunks(ai, retrievalQuery);
    const fullPrompt = buildPrompt({
      userMessage,
      history,
      retrievedChunks,
    });

    let response;

    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

      response = await ai.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: fullPrompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });
    } else {
      response = await ai.models.generateContent({
        model: GENERATION_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
      });
    }

    const text = response.text;

    if (!text) {
      return NextResponse.json(
        { error: "Tidak ada respons dari AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (error: unknown) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails =
      typeof error === "object" && error !== null && "response" in error
        ? JSON.stringify((error as { response?: unknown }).response)
        : "";

    return NextResponse.json(
      { error: `Maaf, terjadi kesalahan pada sistem AI: ${errorMessage}. ${errorDetails}` },
      { status: 500 }
    );
  }
}

function buildRetrievalQuery(userMessage: string, history: HistoryMessage[] | undefined) {
  const recentUserMessages = history
    ?.filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content)
    .join("\n") ?? "";

  return normalizeText(`${recentUserMessages}\n${userMessage}`);
}
