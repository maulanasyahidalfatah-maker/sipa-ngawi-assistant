import { existsSync, readFileSync } from "fs";
import path from "path";

// Load environment variables dari .env.local secara otomatis
loadLocalEnv();

type EvalCase = {
  name: string;
  message: string;
  expectedSection?: string;
  mustInclude?: string[];
  minBodySections?: number;
  history?: { role: string; content: string }[];
};

// DAFTAR TEST CASE EVALUASI RAG KHUSUS SISTEM SIPA-NGAWI
const cases: EvalCase[] = [
  {
    name: "Solusi Data Inval Dapodik",
    message: "Bagaimana cara mengatasi data inval jam mengajar guru di Dapodik?",
    expectedSection: "DAPODIK",
    mustInclude: ["inval", "pembelajaran", "jam mengajar"],
    minBodySections: 1,
  },
  {
    name: "Residu VervalPD Siswa",
    message: "Kenapa data siswa masuk residu VervalPD dan bagaimana solusinya?",
    expectedSection: "VERVALPD",
    mustInclude: ["NIK", "Dukcapil", "residu"],
    minBodySections: 1,
  },
  {
    name: "Mutasi Siswa Lintas Sekolah",
    message: "Bagaimana alur mutasi siswa masuk dari luar kabupaten Ngawi?",
    expectedSection: "MUTASI",
    mustInclude: ["surat rekomendasi", "Dinas", "surat pindah"],
    minBodySections: 1,
  },
  {
    name: "Form Pengaduan Resmi Disdikbud",
    message: "Saya mau buat pengaduan masalah NUPTK guru honorer",
    expectedSection: "PENGADUAN",
    mustInclude: ["Form Pengaduan", "NPSN", "Operator"],
    minBodySections: 1,
  },
  {
    name: "Overview Layanan Virtual SIPA-NGAWI",
    message: "SIPA NGAWI bisa bantu apa saja?",
    mustInclude: ["Dapodik", "VervalPD", "VervalPTK", "Pengaduan"],
  },
  {
    name: "Follow-up Mutasi PTK Guru",
    message: "apa saja syarat berkasnya?",
    expectedSection: "VERVALPTK",
    mustInclude: ["SK", "tugas"],
    history: [
      { role: "user", content: "Bagaimana alur mutasi PTK atau Guru?" },
      { role: "assistant", content: "Prosedur mutasi PTK dilakukan melalui persetujuan admin dinas di aplikasi VervalPTK." },
    ],
  },
];

main().catch((error) => {
  console.error("Fatal Error pada Evaluasi RAG:", error);
  process.exit(1);
});

async function main() {
  const [
    { createChatResponse },
    configModule,
    { buildRetrievalQuery, retrieveRelevantDocuments },
  ] = await Promise.all([
    import("../lib/rag/service"),
    import("../lib/rag/config"),
    import("../lib/rag/retriever"),
  ]);

  // Ambil keys dari Qwen atau fallback ke Gemini config helper
  const apiKeys =
    typeof (configModule as any).getQwenApiKeys === "function"
      ? (configModule as any).getQwenApiKeys()
      : typeof (configModule as any).getGeminiApiKeys === "function"
      ? (configModule as any).getGeminiApiKeys()
      : [process.env.QWEN_API_KEY || process.env.GOOGLE_GENAI_API_KEY || ""].filter(Boolean);

  const apiKey = apiKeys[0] || process.env.QWEN_API_KEY || "";

  if (!apiKey) {
    console.error("❌ ERROR: Tidak ada API key yang valid. Pastikan QWEN_API_KEY atau GOOGLE_GENAI_API_KEY terisi di .env.local.");
    process.exit(1);
  }

  const shouldFallback = configModule.shouldFallbackToNextModelOrKey;
  let failures = 0;

  for (const testCase of cases) {
    console.log(`\n========================================`);
    console.log(`🧪 EVAL CASE: ${testCase.name}`);
    console.log(`========================================`);

    // Retrieval SOP test (jika embedding tersedia)
    try {
      const retrievalQuery = buildRetrievalQuery(testCase.message, testCase.history);
      const retrieved = await retrieveRelevantDocuments(apiKey, retrievalQuery);

      console.log("\n📄 Dokumen Terambil (Top 3):");
      retrieved.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.document.metadata.sectionTitle} [Score: ${result.score.toFixed(3)}]`);
      });

      const expectedSection = testCase.expectedSection;
      if (
        expectedSection &&
        !retrieved.some((result) =>
          result.document.metadata.sectionTitle.toLowerCase().includes(expectedSection.toLowerCase())
        )
      ) {
        console.warn(`⚠️ Warning: Retrieval tidak memuat section spesifik "${expectedSection}"`);
      }
    } catch (retrievalError) {
      console.warn("⚠️ Retrieval dokumen dilewati / fallback:", retrievalError instanceof Error ? retrievalError.message : retrievalError);
    }

    const response = await createResponseWithFallback({
      apiKeys,
      createChatResponse,
      shouldFallbackToNextModelOrKey: shouldFallback,
      message: testCase.message,
      history: testCase.history,
    });

    if (!response.formatted || !response.formatted.sections || !response.formatted.sections.length) {
      failures += 1;
      console.error("❌ FAIL: response.formatted.sections kosong");
    }

    if (response.response.includes("belum bisa disusun") || response.response.includes("maaf, terjadi kendala")) {
      failures += 1;
      console.error("❌ FAIL: Jawaban jatuh ke fallback format / error message");
    }

    const bodySectionCount = response.formatted?.sections?.filter((section) => section.body?.trim()).length || 0;

    if (testCase.minBodySections !== undefined && bodySectionCount < testCase.minBodySections) {
      failures += 1;
      console.error(`❌ FAIL: Jawaban hanya punya ${bodySectionCount} section body (minimal ${testCase.minBodySections})`);
    }

    testCase.mustInclude?.forEach((needle) => {
      if (!response.response.toLowerCase().includes(needle.toLowerCase())) {
        failures += 1;
        console.error(`❌ FAIL: Jawaban tidak memuat kata kunci "${needle}"`);
      }
    });

    console.log("\n💬 Jawaban Asisten Virtual:");
    console.log(response.response);
  }

  console.log(`\n========================================`);
  if (failures > 0) {
    console.error(`❌ EVAL SELESAI: Ditemukan ${failures} kegagalan.`);
    process.exit(1);
  }

  console.log("✅ EVAL SELESAI: Semua skenario RAG SIPA-NGAWI lulus validasi 100%!");
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
        console.warn(`⚠️ API key ke-${index + 1} gagal sementara, mencoba key berikutnya...`);
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