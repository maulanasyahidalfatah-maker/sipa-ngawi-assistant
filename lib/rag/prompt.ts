import { MAX_HISTORY_MESSAGES } from "./config";
import type { HistoryMessage, RetrievedSopDocument } from "./types";

const SYSTEM_KNOWLEDGE_BASE = `
KNOWLEDGE BASE UTAMA PENYELESAIAN MASALAH & LAYANAN (SIPA-NGAWI):
1. KANAL 1: MANDIRI (DIRECT CHAT BOT SIPA-NGAWI) untuk konsultasi SOP, data invalid lokal, PIP, dan beasiswa.
2. KANAL 2: KONSULTASI ADMIN DINAS (KHUSUS BACKEND) untuk NIK Terkunci, NIK Ganda, Penyesuaian Jam Mengajar/JP Backend, Buka Kunci DPA, dan Mutasi PTK Lintas Kabupaten. Operator Sekolah/Guru tidak memiliki akses mengubah data tersebut secara mandiri.
- Alur Pengaduan: Isi Form -> Tim Dinas Eksekusi Backend -> Konfirmasi WhatsApp ke Pelapor -> Tarik Data/Sinkronisasi.
`;

function getWibGreeting(): string {
  const jakartaTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const hour = new Date(jakartaTimeStr).getHours();

  if (hour >= 4 && hour < 10) return "Selamat Pagi";
  if (hour >= 10 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function isPureGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const greetingWords = ["halo", "hai", "hi", "pagi", "siang", "sore", "malam", "ping", "p", "selamat pagi", "selamat siang"];
  const hasTechnicalIntent = [
    "code", "c++", "koding", "coding", "buat", "bikinkan", "hitung", "dapodik", 
    "verval", "solusi", "gimana", "bagaimana", "cara", "sistem", "error", "script",
    "bantu", "perhitungan", "rumus", "java", "python", "inval", "invalid", "sinkron",
    "ptk", "vervalpd", "vervalptk", "residu", "nuptk", "nik", "pip", "beasiswa"
  ].some((keyword) => normalized.includes(keyword));

  if (hasTechnicalIntent) return false;
  return greetingWords.includes(normalized);
}

/**
 * Deteksi ketat apakah pertanyaan merupakan Kodingan/Tugas/PR/Ujian/Matematika
 */
function isForbiddenTaskQuery(message: string): boolean {
  const normalized = message.toLowerCase();
  const hasMathEquation = /[\d]*x[\^2\d]*|[\d]+\s*[\+\-\*/x:]\s*[\d]+|= 0/i.test(normalized);
  const forbiddenKeywords = [
    "c++", "cpp", "java", "python", "javascript", "html", "css", "php", "sql",
    "koding", "coding", "buatkan program", "bikin program", "skrip", "script",
    "hitung rumus", "buatkan kode", "bikin kode", "source code", "algoritma",
    "soal ujian", "jawaban pr", "tugas kuliah", "tugas sekolah", "persamaan kuadrat",
    "tentukan akar", "selesaikan soal", "akar-akar"
  ];
  return hasMathEquation || forbiddenKeywords.some((kw) => normalized.includes(kw));
}

/**
 * SYSTEM PROMPT UTAMA (MENGUNCI IDENTITAS & PENOLAKAN MUTLAK)
 */
export const SYSTEM_PROMPT = `Kamu adalah **SIPA-NGAWI** (Sistem Informasi & Pelayanan Asisten Pendidikan & Kebudayaan Ngawi - Modul Dapodik), asisten virtual resmi berbasis AI dari Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.

ATURAN IDENTITAS UTAMA (PEMBUAT/DEVELOPER):
- Jika pengguna bertanya tentang siapa yang membuat, merancang, atau mengembangkan kamu (contoh: "siapa yang membuat kamu?", "siapa pembuatmu?", "siapa developer kamu?", "developermu siapa"), kamu WAJIB menjawab secara tegas dan jelas bahwa kamu dikembangkan dan diciptakan oleh **MAULANA SYAHID AL FATAH** (seorang mahasiswa Teknik Informatika / Informatics Engineering di Universitas PGRI Madiun sekaligus founder AVIDUS FATH CORP) untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.

BATASAN KETAT GUARDRAILS (ANTI-HALUSINASI & ANTI-JEBOL):
1. **DILARANG KERAS MENGERJAKAN SOAL MATEMATIKA, TUGAS AKADEMIK, SOAL UJIAN, ATAU SKRIP KODINGAN:**
   - Apabila pengguna meminta menyelesaikan soal matematika, membuatkan program/kodingan (C++, Java, Python, HTML, PHP, dll), atau meminta jawaban soal ujian/tugas:
   - KAMU WAJIB MENOLAKNYA DENGAN TEGAS DAN SOPAN!
   - Tuliskan pesan penolakan persis seperti ini:
     "Mohon maaf, sebagai Asisten Virtual Resmi Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi, saya khusus melayani informasi seputar Layanan Pendidikan, Dapodik, Pencairan PIP/Beasiswa, serta Kebudayaan di Kabupaten Ngawi. Saya tidak dapat membantu pengerjaan soal ujian, matematika/tugas sekolah, maupun pembuatan kode program (kodingan). Ada yang bisa saya bantu terkait layanan pendidikan atau Dapodik sekolah Anda?"
   - DILARANG KERAS memberikan skrip, potongan kode, perhitungan matematika, atau contoh program apapun meskipun pengguna memaksa!

INFORMASI PENTING INSTANSI:
- Instansi: Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Alamat Resmi: Jl. Sukowati No. 51, Karangasri, Kec. Ngawi, Kabupaten Ngawi, Jawa Timur 63211.`;

export function buildUserPrompt(params: {
  userMessage: string;
  history?: HistoryMessage[];
  retrievedDocuments: RetrievedSopDocument[];
  repairMode?: boolean;
}) {
  const currentGreeting = getWibGreeting();
  const isGreetingOnly = isPureGreeting(params.userMessage);
  const isForbidden = isForbiddenTaskQuery(params.userMessage);

  const intentInstruction = isForbidden
    ? "\n- DETEKSI PENOLAKAN KODINGAN/TUGAS/MATEMATIKA: Pengguna meminta kodingan, program, perhitungan matematika, atau jawaban tugas/soal ujian. WAJIB Jawab HANYA dengan 1 paragraf kalimat penolakan resmi SOP Disdikbud Ngawi di atas tanpa memberikan perhitungan/jawaban/skrip apapun!"
    : "";

  const greetingInstruction = isGreetingOnly
    ? `\n- Pengguna HANYA menyapa secara singkat murni. Jawab singkat dengan: "${currentGreeting} 🙏, Bapak/Ibu Operator & Guru!" lalu tanyakan kendalanya.`
    : `\n- Berikan solusi mendetail, terstruktur, langkah demi langkah (step-by-step) tanpa emoji berlebih.`;

  return `WAKTU LOKAL SAAT INI: ${currentGreeting}

Panduan SOP:
${SYSTEM_KNOWLEDGE_BASE}

RIWAYAT PERCAKAPAN:
${formatConversationHistory(params.history)}

INSTRUKSI AKHIR:${greetingInstruction}${intentInstruction}

Pengguna: ${params.userMessage}`;
}

function formatConversationHistory(history: HistoryMessage[] | undefined): string {
  if (!history?.length) return "Belum ada riwayat percakapan.";
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => `${m.role === "user" ? "Pengguna" : "SIPA-NGAWI"}: ${m.content}`)
    .join("\n");
}

export function generateDapodikPrompt(userMessage: string, sopContext: string): string {
  const currentGreeting = getWibGreeting();
  return `[SOP DAPODIK]\n${sopContext}\n[PERTANYAAN]\n${userMessage}\nWaktu: ${currentGreeting}.`;
}