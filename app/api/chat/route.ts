import { GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_GENERATION_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
const GENERATION_MODELS = getEnvList(process.env.GOOGLE_GENERATION_MODELS, DEFAULT_GENERATION_MODELS);
const EMBEDDING_MODEL = process.env.GOOGLE_EMBEDDING_MODEL ?? "gemini-embedding-001";
const SOP_FILE_PATH = path.join(process.cwd(), "SOP.txt");
const SOP_INDEX_CACHE_PATH = process.env.SOP_INDEX_CACHE_PATH
  ?? path.join(process.env.VERCEL ? "/tmp" : process.cwd(), ".cache", "sop-embeddings.json");
const SOP_INDEX_VERSION = 2;

const CHUNK_MAX_CHARS = 1600;
const CHUNK_OVERLAP_CHARS = 250;
const EMBEDDING_BATCH_SIZE = 16;
const TOP_K_CHUNKS = 5;
const MIN_RELEVANCE_SCORE = 0.3;
const MAX_HISTORY_MESSAGES = 8;

const OVERVIEW_CONTEXT = `RINGKASAN LAYANAN YANG BISA DIJELASKAN:
- Profil, alamat, lokasi, wilayah hukum, dan kontak Polsek Rembang Kota
- Jam layanan SPKT 24 jam dan jam pelayanan administrasi
- SKCK baru dan perpanjangan
- Laporan kehilangan barang atau dokumen
- Pengaduan dan laporan kriminal ringan
- Izin keramaian dan izin kegiatan masyarakat
- Informasi SIM di Satpas Polres Rembang
- Kunjungan tahanan atau besuk
- Pengawalan dan bantuan polisi
- Mediasi dan problem solving warga
- Informasi perkembangan kasus atau SP2HP
- Tilang, barang temuan, dan kendaraan yang ditahan
- Surat Tanda Melapor untuk WNA
- Penipuan online dan kejahatan siber
- Informasi rekrutmen Polri
- KDRT dan perlindungan anak
- Siskamling dan koordinasi Bhabinkamtibmas
- Layanan yang tidak dilayani di Polsek`;

const POLICE_RELATED_GUIDANCE = `PANDUAN UMUM UNTUK PERTANYAAN YANG MASIH BERKAITAN DENGAN KEPOLISIAN:
- Jika warga ingin mengakui atau melaporkan tindak pidana berat, arahkan untuk segera datang ke SPKT Polsek terdekat atau langsung ke Polres.
- Jika ada korban, keadaan darurat, atau risiko bahaya lanjutan, arahkan untuk segera menghubungi 110 atau layanan darurat setempat.
- Sarankan warga datang dengan tenang, membawa identitas, dan menyampaikan kejadian dengan jujur kepada petugas.
- Jangan memberi saran untuk menghindari polisi, menyembunyikan bukti, menghilangkan barang bukti, mengarang kronologi, atau kabur.
- Untuk perkara serius, sampaikan bahwa petugas akan mengarahkan proses hukum lebih lanjut dan warga boleh meminta pendampingan hukum/keluarga sesuai kebutuhan.
- Jika detail SOP tidak ada, tetap berikan arahan umum yang aman dan minta verifikasi langsung ke petugas.`;

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

type FormattedAnswerSection = {
  title: string;
  body?: string;
  items?: string[];
};

type FormattedAnswer = {
  intro?: string;
  sections: FormattedAnswerSection[];
  closing?: string;
};

type SopIndexCache = {
  sourceHash: string;
  embeddingModel: string;
  chunks: SopChunk[];
};

type ChatRequestBody = {
  message?: string;
  history?: HistoryMessage[];
  image?: string;
};

type ChatResponseBody = {
  response: string;
  formatted?: FormattedAnswer;
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
2. Untuk detail resmi seperti syarat, biaya, alamat, jam, dan durasi, jangan mengarang detail yang tidak ada di konteks SOP.
3. Kalau pertanyaan masih berkaitan dengan kepolisian tetapi konteks SOP tidak lengkap, tetap bantu dengan arahan umum yang aman, lalu minta verifikasi ke SPKT/Polres.
4. Untuk layanan yang bukan di Polsek tetapi ada di konteks SOP, tetap bantu jelaskan dan ingatkan lokasi/wewenangnya.
5. Jika pertanyaan BENAR-BENAR tidak berhubungan dengan kepolisian, baru jawab: "Waduh, untuk yang itu saya kurang paham ya Kak. Saya lebih jago soal layanan kepolisian seperti SKCK, laporan kehilangan, atau info seputar SIM. Ada yang bisa saya bantu soal itu?"
6. Untuk syarat, biaya, jam, alamat, durasi, dan angka apa pun, gunakan PERSIS dari KONTEKS SOP TERAMBIL.
7. DILARANG menambah syarat/prosedur umum yang tidak tertulis di KONTEKS SOP TERAMBIL.
8. Jika konteks membedakan layanan baru dan perpanjangan, jawab hanya bagian yang ditanyakan pengguna.
9. Untuk daftar syarat atau alur, ambil poin langsung dari KONTEKS SOP TERAMBIL. Jangan mengganti dengan syarat versi umum.
10. Jika pengguna bertanya umum seperti "syarat membuat SIM", jawab bagian SIM BARU secara lengkap dan sebutkan bahwa perpanjangan berbeda jika perlu.

ATURAN FORMAT KONTEN:
1. Kamu WAJIB membalas dalam JSON valid saja, tanpa markdown, tanpa code fence, tanpa teks pembuka di luar JSON.
2. Semua nilai string di dalam JSON harus berupa teks biasa.
3. DILARANG menggunakan tanda bintang (*) atau tanda pagar (#) di dalam nilai string.
4. DILARANG menggunakan format bold, italic, markdown, atau bullet manual di dalam nilai string.
5. Untuk daftar, masukkan setiap poin sebagai elemen array items. Jangan menulis nomor, strip, atau bullet di awal item.
6. Untuk menekankan kata penting, gunakan HURUF KAPITAL seperlunya.
7. Gunakan emoji secukupnya untuk kesan ramah, hanya di intro atau closing jika cocok.

SKEMA JSON WAJIB:
{
  "intro": "kalimat pembuka singkat, boleh kosong jika tidak perlu",
  "sections": [
    {
      "title": "judul bagian singkat",
      "body": "paragraf pendek, boleh kosong jika tidak perlu",
      "items": ["poin daftar tanpa nomor atau bullet"]
    }
  ],
  "closing": "kalimat penutup singkat, boleh kosong jika tidak perlu"
}

ATURAN FIELD JSON:
1. sections wajib ada dan minimal 1 bagian.
2. Gunakan title yang jelas seperti "Tempat layanan", "Syarat", "Alur", "Biaya", "Durasi atau jam layanan", "Catatan", atau "Layanan yang bisa saya jelaskan".
3. Untuk syarat, alur, prosedur, dan daftar layanan, gunakan items agar UI bisa menampilkan daftar rapi.
4. Untuk info singkat yang bukan daftar, gunakan body.
5. Jangan menggabungkan banyak topik berbeda dalam satu body panjang. Pecah menjadi beberapa section.

STRUKTUR JAWABAN LAYANAN:
1. Mulai dengan satu kalimat pendek yang langsung menjawab kebutuhan pengguna. Jangan pakai sapaan waktu seperti pagi/siang/sore.
2. Untuk layanan administratif, susun jawaban dengan label bagian berikut jika datanya ada:
Tempat layanan:
Syarat:
Alur:
Biaya:
Durasi atau jam layanan:
Catatan:
3. Jika sebuah bagian tidak ada di konteks SOP, jangan dibuat-buat dan lewati bagian itu.
4. Jika pertanyaan meminta syarat, tulis semua syarat relevan dari SOP dalam daftar angka lengkap.
5. Jika konteks SOP memuat alur dan biaya untuk layanan yang sama, tetap sertakan secara ringkas walaupun pengguna hanya bertanya syarat.
6. Jangan menutup jawaban dengan kalimat panjang. Cukup satu kalimat bantuan singkat.
7. Jangan mencampur syarat pembuatan baru dengan perpanjangan kecuali pengguna memang menanyakan keduanya.
8. Format daftar harus rapi: setiap nomor atau strip berada di baris sendiri, tanpa baris kosong antar item.

KHUSUS PERTANYAAN UMUM:
Jika pengguna bertanya "apa saja yang bisa dijelaskan", "kamu bisa bantu apa", atau sejenisnya:
- intro berisi kalimat singkat bahwa kamu bisa membantu menjelaskan layanan Polsek Rembang.
- Buat section title "Layanan yang bisa saya jelaskan".
- Masukkan daftar layanan ke items, bukan paragraf.
- closing berisi ajakan singkat agar pengguna memilih layanan yang ingin ditanyakan.

KHUSUS KEJAHATAN, PENGAKUAN, ATAU DARURAT:
Jika pengguna mengaku melakukan kejahatan, ingin menyerahkan diri, atau bertanya harus ke mana setelah kejadian pidana, tetap bantu dengan tenang:
- Arahkan segera ke SPKT Polsek terdekat atau Polres.
- Jika ada korban atau situasi darurat, arahkan hubungi 110.
- Sarankan datang dengan identitas dan menjelaskan kejadian sejujur-jujurnya ke petugas.
- Jangan menghakimi, jangan bercanda, dan jangan memberi cara menghindari proses hukum.
- Jangan menutup dengan kalimat ringan seperti "semoga lancar". Tutup dengan "Ikuti arahan petugas ya, Kak."

INFORMASI PENTING:
- Nomor Hotline SPKT: 0822-2003-3742
- Alamat Polsek: Jl. P. Sudirman, Kabongan Lor, Kec. Rembang, Jawa Tengah 59219
- SPKT buka 24 jam, tapi layanan administrasi seperti SKCK hanya Senin-Jumat`;

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitSopIntoSections(sopText: string): SopSection[] {
  const sections: SopSection[] = [];
  const lines = normalizeText(sopText).split("\n");
  let currentTitle = "Dokumen SOP";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (isTopLevelSopHeading(line)) {
      if (currentLines.length) {
        sections.push({
          title: currentTitle,
          text: currentLines.join("\n").trim(),
        });
      }

      currentTitle = line.trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length) {
    sections.push({
      title: currentTitle,
      text: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((section) => section.text.length > 0);
}

function isTopLevelSopHeading(line: string) {
  const match = line.match(/^(\d+)\.\s+(.+)$/);

  if (!match) {
    return false;
  }

  const title = match[2].trim();
  const letters = title.match(/[A-Za-z]/g) ?? [];
  const uppercaseLetters = title.match(/[A-Z]/g) ?? [];
  const uppercaseRatio = letters.length ? uppercaseLetters.length / letters.length : 0;

  return title.startsWith("FAQ") || uppercaseRatio >= 0.75;
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
    sopIndexPromise = buildSopIndex(ai).catch((error) => {
      sopIndexPromise = null;
      throw error;
    });
  }

  return sopIndexPromise;
}

async function buildSopIndex(ai: GoogleGenAI): Promise<SopChunk[]> {
  const sopText = await fs.readFile(SOP_FILE_PATH, "utf8");
  const sourceHash = createHash("sha256")
    .update(sopText)
    .update(EMBEDDING_MODEL)
    .update(String(SOP_INDEX_VERSION))
    .digest("hex");
  const cachedIndex = await readCachedSopIndex(sourceHash);

  if (cachedIndex) {
    return cachedIndex;
  }

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

  await writeCachedSopIndex({
    sourceHash,
    embeddingModel: EMBEDDING_MODEL,
    chunks,
  });

  return chunks;
}

async function readCachedSopIndex(sourceHash: string) {
  try {
    const rawCache = await fs.readFile(SOP_INDEX_CACHE_PATH, "utf8");
    const cache = JSON.parse(rawCache) as SopIndexCache;

    if (
      cache.sourceHash === sourceHash &&
      cache.embeddingModel === EMBEDDING_MODEL &&
      Array.isArray(cache.chunks) &&
      cache.chunks.every((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
    ) {
      return cache.chunks;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeCachedSopIndex(cache: SopIndexCache) {
  try {
    await fs.mkdir(path.dirname(SOP_INDEX_CACHE_PATH), { recursive: true });
    await fs.writeFile(SOP_INDEX_CACHE_PATH, JSON.stringify(cache), "utf8");
  } catch (error) {
    console.warn("Gagal menulis cache embedding SOP. Request tetap dilanjutkan tanpa cache file.", error);
  }
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
  const overviewContext = isOverviewQuestion(params.userMessage)
    ? `\n\nKONTEKS OVERVIEW LAYANAN:\n${OVERVIEW_CONTEXT}`
    : "";
  const policeRelatedGuidance = isPoliceRelatedQuestion(params.userMessage)
    ? `\n\nKONTEKS PANDUAN UMUM KEPOLISIAN:\n${POLICE_RELATED_GUIDANCE}`
    : "";

  return `${SYSTEM_PROMPT}

KONTEKS SOP TERAMBIL:
${formatRetrievedContext(params.retrievedChunks)}${overviewContext}${policeRelatedGuidance}

RIWAYAT PERCAKAPAN:
${formatConversationHistory(params.history)}

INSTRUKSI AKHIR:
- Jawab pertanyaan pengguna terakhir.
- Prioritaskan konteks SOP terambil, bukan pengetahuan umum.
- Untuk syarat/prosedur/biaya, gunakan hanya poin yang tertulis di konteks SOP. Jangan menambahkan poin baru.
- Buat jawaban cukup detail: tempat layanan, syarat, alur, biaya, dan catatan penting jika datanya ada di konteks.
- Kalau pertanyaan masih berkaitan dengan kepolisian tetapi SOP tidak lengkap, tetap bantu dengan arahan umum yang aman dan praktis.
- Untuk pertanyaan umum tentang kemampuan asisten, isi daftar layanan pada sections[0].items, bukan paragraf panjang.
- Jika ini pesan pertama, boleh mulai dengan sapaan hangat.
- Balas HANYA JSON valid sesuai skema. Jangan gunakan markdown, code fence, atau teks lain di luar JSON.

Pengguna: ${params.userMessage}
Asisten:`;
}

function cleanAssistantResponse(text: string) {
  const sectionLabels = [
    "Tempat layanan:",
    "Syarat:",
    "Alur:",
    "Biaya:",
    "Durasi atau jam layanan:",
    "Jam layanan:",
    "Durasi:",
    "Catatan:",
  ];

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2")
    .replace(/([^\n])\s+(-\s+)/g, "$1\n$2")
    .replace(/menghubungi\s*\n\s*110/gi, "menghubungi 110")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const compactedLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return sectionLabels
    .reduce((result, label) => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return result.replace(new RegExp(`\\n?${escapedLabel}`, "g"), `\n\n${label}`);
    }, compactedLines)
    .replace(/^\n+/, "")
    .trim();
}

function parseFormattedAnswer(rawText: string): FormattedAnswer | null {
  const jsonText = extractJsonObject(rawText);

  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const data = parsed as Partial<FormattedAnswer>;
    const sections = Array.isArray(data.sections)
      ? data.sections.map(normalizeFormattedSection).filter((section): section is FormattedAnswerSection => Boolean(section))
      : [];

    if (!sections.length) {
      return null;
    }

    const formatted: FormattedAnswer = { sections };
    const intro = cleanFieldText(data.intro);
    const closing = cleanFieldText(data.closing);

    if (intro) {
      formatted.intro = intro;
    }

    if (closing) {
      formatted.closing = closing;
    }

    return formatted;
  } catch {
    return null;
  }
}

function extractJsonObject(rawText: string) {
  const trimmed = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function normalizeFormattedSection(section: unknown): FormattedAnswerSection | null {
  if (!section || typeof section !== "object") {
    return null;
  }

  const data = section as Partial<FormattedAnswerSection>;
  const title = cleanFieldText(data.title);
  const body = cleanFieldText(data.body);
  const items = Array.isArray(data.items)
    ? data.items
        .map(cleanFieldText)
        .filter((item): item is string => Boolean(item))
    : [];

  if (!title || (!body && !items.length)) {
    return null;
  }

  return {
    title,
    ...(body ? { body } : {}),
    ...(items.length ? { items } : {}),
  };
}

function cleanFieldText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formattedAnswerToPlainText(answer: FormattedAnswer) {
  const blocks: string[] = [];

  if (answer.intro) {
    blocks.push(answer.intro);
  }

  answer.sections.forEach((section) => {
    const lines = [`${section.title}:`];

    if (section.body) {
      lines.push(section.body);
    }

    if (section.items?.length) {
      const ordered = shouldUseOrderedList(section.title);
      section.items.forEach((item, index) => {
        lines.push(ordered ? `${index + 1}. ${item}` : `- ${item}`);
      });
    }

    blocks.push(lines.join("\n"));
  });

  if (answer.closing) {
    blocks.push(answer.closing);
  }

  return cleanAssistantResponse(blocks.join("\n\n"));
}

function shouldUseOrderedList(title: string) {
  return /(syarat|alur|prosedur|cara|langkah)/i.test(title);
}

function getGeminiApiKeys() {
  return getEnvList([
    process.env.GOOGLE_GENAI_API_KEYS,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY_2,
    process.env.GOOGLE_GENAI_API_KEY_3,
    process.env.GOOGLE_GENAI_API_KEY_4,
    process.env.GOOGLE_GENAI_API_KEY_5,
  ]);
}

function getEnvList(value: string | undefined, fallback?: string[]): string[];
function getEnvList(value: Array<string | undefined>, fallback?: string[]): string[];
function getEnvList(value: string | Array<string | undefined> | undefined, fallback: string[] = []) {
  const values = Array.isArray(value) ? value : [value];
  const entries = values
    .flatMap((entry) => entry?.split(",") ?? [])
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(entries.length ? entries : fallback));
}

function shouldFallbackToNextApiKey(error: unknown) {
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

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequestBody;
    const { message, image } = body;

    if (!message && !image) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    const apiKeys = getGeminiApiKeys();

    if (!apiKeys.length) {
      console.error("Gemini API key not found");
      return NextResponse.json(
        { error: "API key Gemini tidak ditemukan" },
        { status: 500 }
      );
    }

    let lastError: unknown;

    for (const [index, apiKey] of apiKeys.entries()) {
      try {
        return NextResponse.json(await createChatResponse(apiKey, body));
      } catch (error) {
        lastError = error;

        if (index < apiKeys.length - 1 && shouldFallbackToNextApiKey(error)) {
          console.warn(`Gemini API key ${index + 1} terkena limit, mencoba key berikutnya.`);
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error("Semua API key Gemini gagal dipakai");
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

async function createChatResponse(apiKey: string, body: ChatRequestBody): Promise<ChatResponseBody> {
  const { message, history, image } = body;
  const ai = new GoogleGenAI({ apiKey });
  const userMessage = message || "Tolong analisis gambar ini dan jelaskan apa yang kamu lihat.";
  const retrievalQuery = buildRetrievalQuery(userMessage, history);
  const retrievedChunks = await retrieveRelevantChunks(ai, retrievalQuery);
  const fullPrompt = buildPrompt({
    userMessage,
    history,
    retrievedChunks,
  });

  const response = await generateChatContent(ai, fullPrompt, image);
  const rawText = response.text ?? "";
  const formatted = parseFormattedAnswer(rawText);
  const text = formatted
    ? formattedAnswerToPlainText(formatted)
    : cleanAssistantResponse(rawText);

  if (!text) {
    throw new Error("Tidak ada respons dari AI");
  }

  return {
    response: text,
    ...(formatted ? { formatted } : {}),
  };
}

async function generateChatContent(ai: GoogleGenAI, fullPrompt: string, image?: string) {
  let lastError: unknown;

  for (const model of GENERATION_MODELS) {
    try {
      return await callGenerationModel(ai, model, fullPrompt, image);
    } catch (error) {
      lastError = error;

      if (shouldFallbackToNextApiKey(error) && model !== GENERATION_MODELS[GENERATION_MODELS.length - 1]) {
        console.warn(`Model ${model} sedang tidak tersedia, mencoba model berikutnya.`);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Semua model Gemini gagal dipakai");
}

async function callGenerationModel(ai: GoogleGenAI, model: string, fullPrompt: string, image?: string) {
  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

    return ai.models.generateContent({
      model,
      config: {
        temperature: 0.2,
        topP: 0.8,
        responseMimeType: "application/json",
      },
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
  }

  return ai.models.generateContent({
    model,
    config: {
      temperature: 0.2,
      topP: 0.8,
      responseMimeType: "application/json",
    },
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });
}

function buildRetrievalQuery(userMessage: string, history: HistoryMessage[] | undefined) {
  const recentUserMessages = history
    ?.filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content)
    .join("\n") ?? "";

  return normalizeText(`${recentUserMessages}\n${userMessage}`);
}

function isOverviewQuestion(message: string) {
  const normalized = message.toLowerCase();

  return [
    "apa aja",
    "apa saja",
    "bisa jelasin",
    "bisa bantu apa",
    "fitur apa",
    "layanan apa",
    "kamu bisa apa",
  ].some((phrase) => normalized.includes(phrase));
}

function isPoliceRelatedQuestion(message: string) {
  const normalized = message.toLowerCase();

  return [
    "polisi",
    "polsek",
    "polres",
    "spkt",
    "lapor",
    "melapor",
    "laporan",
    "kriminal",
    "pidana",
    "kejahatan",
    "membunuh",
    "bunuh",
    "pembunuhan",
    "mencuri",
    "curi",
    "penganiayaan",
    "korban",
    "menyerahkan diri",
    "mengakui",
    "kesalahan",
    "ditangkap",
    "hukum",
    "saksi",
    "bukti",
    "darurat",
    "110",
  ].some((keyword) => normalized.includes(keyword));
}
