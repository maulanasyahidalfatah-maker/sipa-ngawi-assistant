import { existsSync, readFileSync } from "fs";
import path from "path";

loadLocalEnv();

type EvalCase = {
  name: string;
  message: string;
  expectedSection?: string;
  mustInclude?: string[];
  minBodySections?: number;
  history?: { role: string; content: string }[];
};

const cases: EvalCase[] = [
  {
    name: "SKCK baru",
    message: "Syarat membuat SKCK?",
    expectedSection: "LAYANAN SKCK",
    mustInclude: ["Fotokopi KTP", "Rp 30.000"],
    minBodySections: 2,
  },
  {
    name: "Kehilangan dokumen dan uang",
    message: "Dokumen penting dan uang saya hilang, harus gimana?",
    expectedSection: "LAYANAN SKTLK",
    mustInclude: ["SPKT", "KTP", "GRATIS"],
    minBodySections: 2,
  },
  {
    name: "Lokasi baru",
    message: "Polsek Rembang sekarang di mana?",
    expectedSection: "LOKASI",
    mustInclude: ["belakang kantor Satlantas Polres Rembang"],
  },
  {
    name: "SIM di Polsek",
    message: "Bisa buat SIM di Polsek?",
    expectedSection: "FAQ",
    mustInclude: ["tidak", "Satpas"],
  },
  {
    name: "Penipuan online",
    message: "Cara lapor penipuan online?",
    expectedSection: "PENIPUAN ONLINE",
    mustInclude: ["Bukti Transfer", "Screenshot percakapan"],
    minBodySections: 2,
  },
  {
    name: "Kebisingan warga",
    message: "gmn cara lapor kebisingan di depan rumah kku ada sound horeng aku sangat terganggu",
    expectedSection: "PENGADUAN",
    mustInclude: ["SPKT", "bukti", "RT/RW", "Bhabinkamtibmas"],
    minBodySections: 3,
  },
  {
    name: "Menyerahkan diri",
    message: "Saya mau menyerahkan diri",
    mustInclude: ["SPKT", "Ikuti arahan petugas"],
  },
  {
    name: "Overview layanan",
    message: "Kamu bisa bantu apa?",
    mustInclude: ["SKCK", "Laporan kehilangan"],
  },
  {
    name: "Follow-up biaya SKCK",
    message: "berapa biayanya?",
    expectedSection: "LAYANAN SKCK",
    mustInclude: ["Rp 30.000"],
    history: [
      { role: "user", content: "Syarat membuat SKCK?" },
      { role: "assistant", content: "Untuk SKCK, Polsek melayani SKCK untuk keperluan tingkat kecamatan atau swasta." },
    ],
  },
];

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const [{ createChatResponse }, { getGeminiApiKeys, shouldFallbackToNextModelOrKey }, { buildRetrievalQuery, retrieveRelevantDocuments }] = await Promise.all([
    import("../lib/rag/service"),
    import("../lib/rag/config"),
    import("../lib/rag/retriever"),
  ]);

  const apiKeys = getGeminiApiKeys();
  const apiKey = apiKeys[0];

  if (!apiKey) {
    console.error("Tidak ada Gemini API key. Isi GOOGLE_GENAI_API_KEY, GOOGLE_GENAI_API_KEYS, atau GOOGLE_API_KEY di .env.local.");
    process.exit(1);
  }

  let failures = 0;

  for (const testCase of cases) {
    console.log(`\n=== ${testCase.name} ===`);
    const retrievalQuery = buildRetrievalQuery(testCase.message, testCase.history);
    const retrieved = await retrieveRelevantDocuments(apiKey, retrievalQuery);

    console.log("Retrieved:");
    retrieved.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. ${result.document.metadata.sectionTitle} [${result.score.toFixed(3)}]`);
    });

    const expectedSection = testCase.expectedSection;

    if (expectedSection && !retrieved.some((result) => result.document.metadata.sectionTitle.includes(expectedSection))) {
      failures += 1;
      console.error(`FAIL: retrieval tidak memuat section "${expectedSection}"`);
    }

    const response = await createResponseWithFallback({
      apiKeys,
      createChatResponse,
      shouldFallbackToNextModelOrKey,
      message: testCase.message,
      history: testCase.history,
    });

    if (!response.formatted.sections.length) {
      failures += 1;
      console.error("FAIL: formatted.sections kosong");
    }

    if (response.response.includes("belum bisa disusun")) {
      failures += 1;
      console.error("FAIL: jawaban jatuh ke fallback format");
    }

    const bodySectionCount = response.formatted.sections.filter((section) => section.body?.trim()).length;

    if (testCase.minBodySections !== undefined && bodySectionCount < testCase.minBodySections) {
      failures += 1;
      console.error(`FAIL: jawaban hanya punya ${bodySectionCount} section body, minimal ${testCase.minBodySections}`);
    }

    testCase.mustInclude?.forEach((needle) => {
      if (!response.response.toLowerCase().includes(needle.toLowerCase())) {
        failures += 1;
        console.error(`FAIL: jawaban tidak memuat "${needle}"`);
      }
    });

    console.log("Answer:");
    console.log(response.response);
  }

  if (failures > 0) {
    console.error(`\nEval selesai dengan ${failures} kegagalan.`);
    process.exit(1);
  }

  console.log("\nEval selesai tanpa kegagalan schema dasar.");
}

async function createResponseWithFallback(params: {
  apiKeys: string[];
  createChatResponse: typeof import("../lib/rag/service").createChatResponse;
  shouldFallbackToNextModelOrKey: typeof import("../lib/rag/config").shouldFallbackToNextModelOrKey;
  message: string;
  history?: { role: string; content: string }[];
}) {
  let lastError: unknown;

  for (const [index, apiKey] of params.apiKeys.entries()) {
    try {
      return await params.createChatResponse(apiKey, {
        message: params.message,
        history: params.history,
      });
    } catch (error) {
      lastError = error;

      if (index < params.apiKeys.length - 1 && params.shouldFallbackToNextModelOrKey(error)) {
        console.warn(`API key ${index + 1} gagal sementara, mencoba key berikutnya.`);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Semua API key gagal dipakai");
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}
