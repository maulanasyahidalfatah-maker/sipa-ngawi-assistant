import { MAX_HISTORY_MESSAGES } from "./config";
import type { HistoryMessage, RetrievedSopDocument } from "./types";

/**
 * Overview komprehensif seluruh cakupan layanan Pendidikan, Kebudayaan,
 * dan Kendala Teknis Dapodik di Kabupaten Ngawi.
 */
const OVERVIEW_CONTEXT = `RINGKASAN TUGAS & CAKUPAN LAYANAN SIPA-NGAWI:
- Profil, alamat, jam operasional, dan kontak Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Solusi kendala data Inval dan gagal sinkronisasi pada aplikasi Dapodik versi terbaru.
- Petunjuk teknis penginputan dan verifikasi data Peserta Didik Baru (TK/SD/SMP/SPNF).
- Prosedur mutasi/pindah sekolah Peserta Didik (masuk, keluar, dan lintas kabupaten).
- Petunjuk teknis perbaikan dan pembaruan data PTK (Guru dan Tenaga Kependidikan).
- Pengusulan NUPTK baru, penyesuaian kualifikasi ijazah, dan sertifikasi guru.
- Alur penyelesaian residu data pada portal VervalPD dan VervalPTK.
- Penanganan kasus NIK ganda, NIK terkunci, atau residu data Dukcapil.
- Informasi akun Pembelajaran (Belajar.id) untuk Operator, Guru, dan Siswa.
- Pengajuan izin operasional sekolah, pendirian satuan pendidikan, dan perizinan terkait.
- Informasi Bantuan Operasional Satuan Pendidikan (BOSP) dan verifikasi rekening sekolah.
- Pelestarian kebudayaan lokal, pendaftaran cagar budaya, dan izin kegiatan kebudayaan Ngawi.
- Eskalasi pengaduan data bermasalah yang memerlukan eksekusi Admin Dapodik Dinas.`;

/**
 * Panduan penanganan saat pengguna membutuhkan verifikasi/eksekusi oleh Admin Dinas.
 */
const TICKET_ESCALATION_GUIDANCE = `PANDUAN ALUR ESKALASI PENGADUAN KE ADMIN DAPODIK DINAS:
- Jika kendala data tidak bisa diselesaikan secara mandiri oleh Operator Sekolah (contoh: NIK Terkunci/Ganda, Mutasi PTK Lintas Kabupaten/Provinsi, Invalid Fatal Server, Buka Kunci DPA):
  1. Jelaskan secara objektif dan sistematis bahwa permasalahan tersebut membutuhkan verifikasi atau eksekusi langsung di server Dinas oleh Tim Admin Dapodik Disdikbud Ngawi.
  2. Bimbing pengguna secara bertahap untuk menyiapkan 6 data wajib pengaduan:
     a. Nama Lengkap Pelapor / Operator
     b. Asal Sekolah
     c. NPSN Sekolah
     d. Nomor WhatsApp Aktif
     e. Kategori Kendala (Penginputan Siswa / Data PTK-Guru / Kendala Sinkron-Inval / Mutasi)
     f. Rincian Keluhan / Kendala Penginputan Data
  3. Arahkan pengguna untuk menekan tombol "Buat Pengaduan Dapodik" pada menu aplikasi agar data tercatat otomatis di database Google Sheets Dinas.`;

/**
 * Helper untuk mendapatkan salam waktu lokal Indonesia (WIB) yang akurat.
 */
function getWibGreeting(): string {
  const jakartaTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const hour = new Date(jakartaTimeStr).getHours();

  if (hour >= 4 && hour < 10) return "Selamat Pagi";
  if (hour >= 10 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

/**
 * Helper untuk mendeteksi apakah pesan PURE sapaan singkat saja.
 */
function isPureGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const greetingWords = ["halo", "hai", "hi", "pagi", "siang", "sore", "malam", "ping", "p", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"];
  
  const hasTechnicalIntent = [
    "code", "c++", "koding", "coding", "buat", "bikinkan", "hitung", "dapodik", 
    "verval", "solusi", "gimana", "bagaimana", "cara", "sistem", "error", "script",
    "bantu", "perhitungan", "rumus", "java", "python", "inval", "sinkron"
  ].some((keyword) => normalized.includes(keyword));

  if (hasTechnicalIntent) return false;

  return greetingWords.includes(normalized);
}

/**
 * System Prompt Utama untuk pembentukan persona AI SIPA-NGAWI.
 */
export const SYSTEM_PROMPT = `Kamu adalah **SIPA-NGAWI** (Sistem Informasi & Pelayanan Asisten Pendidikan & Kebudayaan Ngawi - Modul Dapodik), asisten virtual resmi berbasis AI dari Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.

KARAKTER & PERSONA AI:
1. Berperilaku sebagai AI yang logis, objektif, profesional, presisi, dan terstruktur.
2. Gunakan emoji '🙏' HANYA pada salam pembuka sapaan awal murni (contoh: "Selamat Siang, Bapak/Ibu Operator & Guru! 🙏").
3. DILARANG MENGGUNAKAN EMOJI pada pembahasan kode pemrograman, logika matematika, petunjuk teknis, maupun penjelasan alur sistem.

ATURAN FORMAT BALASAN (WAJIB DITURUTI KETAT):
1. **Pemisahan Paragraf Legah**:
   - Gunakan spasi baris fisik biasa (tekan Enter 2 kali secara fisik) di antara setiap paragraf.
   - DILARANG KETAT MENULISKAN SIMBOL TEKS LITERALE '\\n' ATAU '\\n\\n' DI DALAM TEKS BALASAN!
2. **Format Sapaan Singkat**:
   Jika pengguna HANYA menyapa murni (seperti "halo", "hai", "pagi", "siang"):
   - Jawab singkat dengan salam waktu sesuai instruksi sistem + emoji 🙏.
   - Beri jarak 1 baris kosong di bawah sapaan lalu tanyakan kendalanya.

3. **Penanganan Pemrograman / Kode**:
   - Jika pengguna meminta kode atau penjelasan teknis, LANGSUNG berikan solusinya tanpa sapaan kaku.
   - Sajikan kode di dalam blok kode (\`\`\`bahasa_pemrograman ... \`\`\`) yang bersih.
   - Sertakan penjelasan fungsi logis dari kode tersebut secara teknis tanpa emoji.

4. **Format Rapi Tanpa Simbol Mentah**:
   - DILARANG menampilkan simbol '##' atau '###' secara mentah di dalam teks balasan.
   - Gunakan huruf tebal (**teks**) untuk penekanan kata penting.
   - Gunakan Bullet Points (* atau -) untuk daftar urutan langkah.

INFORMASI PENTING INSTANSI:
- Instansi: Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Alamat Resmi: Jl. Sukowati No. 51, Karangasri, Kec. Ngawi, Kabupaten Ngawi, Jawa Timur 63211.
- Telepon Resmi: (0351) 749021.
- Jam Operasional Kantor: Senin - Jumat, Pukul 07.30 - 15.30 WIB.`;

/**
 * Membangun User Prompt lengkap beserta injeksi RAG, riwayat, dan panduan konteks.
 */
export function buildUserPrompt(params: {
  userMessage: string;
  history?: HistoryMessage[];
  retrievedDocuments: RetrievedSopDocument[];
  repairMode?: boolean;
}) {
  const currentGreeting = getWibGreeting();
  const isGreetingOnly = isPureGreeting(params.userMessage);

  const overviewContext = isOverviewQuestion(params.userMessage)
    ? `\n\nKONTEKS OVERVIEW LAYANAN:\n${OVERVIEW_CONTEXT}`
    : "";

  const escalationGuidance = isEscalationQuestion(params.userMessage)
    ? `\n\nKONTEKS PANDUAN ESKALASI PENGADUAN:\n${TICKET_ESCALATION_GUIDANCE}`
    : "";

  const mathInstruction = isMathQuestion(params.userMessage)
    ? "\n- KETENTUAN KHUSUS: Pengguna menanyakan soal perhitungan matematika. Wajib sajikan jawaban menggunakan pola struktur matematika logis (Soal, Rumus/Metode Perhitungan, Persamaan/Kuadrat jika ada, dan Hasil Akhir tebal) TANPA EMOJI."
    : "";

  const repairInstruction = params.repairMode
    ? "\n\nPERBAIKAN FORMAT: Jawaban sebelumnya gagal divalidasi. Buat ulang jawaban dengan struktur logis, paragraf berjarak legah, tanpa emoji berlebih, tanpa karakter '\\n\\n' mentah, dan tanpa karakter '##'."
    : "";

  const intentInstruction = isOverviewQuestion(params.userMessage)
    ? "\n- Jelaskan cakupan layanan utama secara runtut dan sistematis menggunakan bullet points."
    : isEscalationQuestion(params.userMessage)
    ? "\n- Karena ini membutuhkan penanganan Admin Dinas, jelaskan alurnya secara teknis dan sebutkan 6 data wajib pengaduan yang perlu disiapkan."
    : "";

  const greetingInstruction = isGreetingOnly
    ? `\n- Pengguna HANYA menyapa secara singkat murni. Jawab singkat dengan: "${currentGreeting} 🙏, Bapak/Ibu Operator & Guru!" lalu beri jarak baris dan tanyakan kendalanya.`
    : `\n- Pengguna meminta bantuan/instruksi teknis. DILARANG menyapa dengan template kaku! Langsung berikan jawaban, kode, atau solusi yang diminta secara presisi, logis, dan terstruktur tanpa emoji.`;

  return `WAKTU LOKAL SAAT INI: ${currentGreeting}

KONTEKS SOP TERAMBIL:
${formatRetrievedContext(params.retrievedDocuments)}${overviewContext}${escalationGuidance}

RIWAYAT PERCAKAPAN:
${formatConversationHistory(params.history)}

INSTRUKSI AKHIR:${greetingInstruction}
- Pisahkan setiap paragraf dengan menekan tombol Enter dua kali secara fisik. DILARANG KETAT MENIKTIKKAN SIMBOL '\\n' ATAU '\\n\\n' SECARA HARFIAH DALAM TEKS!
- DILARANG menyisipkan emoji pada pembahasan teknis, instruksi, maupun kode pemrograman.
- HINDARI simbol mentah '##' dalam balasan.${mathInstruction}${intentInstruction}${repairInstruction}

Pengguna: ${params.userMessage}`;
}

/**
 * Helper untuk memformat dokumen RAG yang berhasil diambil dari database SOP.
 */
function formatRetrievedContext(results: RetrievedSopDocument[]): string {
  if (!results || !results.length) {
    return "Tidak ada konteks SOP spesifik yang ditemukan untuk pertanyaan ini.";
  }

  return results
    .map((result, index) => {
      return `KONTEKS ${index + 1}
ID: ${result.document.metadata.chunkId}
Judul: ${result.document.metadata.sectionTitle}
Skor relevansi: ${result.score.toFixed(3)}
Isi:
${result.document.pageContent}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Helper untuk memformat riwayat percakapan sebelumnya.
 */
function formatConversationHistory(history: HistoryMessage[] | undefined): string {
  if (!history?.length) {
    return "Belum ada riwayat percakapan.";
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const roleLabel = message.role === "user" ? "Pengguna" : "SIPA-NGAWI";
      return `${roleLabel}: ${message.content}`;
    })
    .join("\n");
}

/**
 * Deteksi apakah pengguna menanyakan perhitungan matematika/angka.
 */
function isMathQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  const hasMathSymbols = /[\d]+\s*[\+\-\*/x:]\s*[\d]+/.test(normalized);
  const mathKeywords = [
    "tambah",
    "kurang",
    "kali",
    "bagi",
    "berapa",
    "hitung",
    "perhitungan",
    "jumlah dari",
    "hasil dari",
  ];

  return (
    hasMathSymbols ||
    (mathKeywords.some((kw) => normalized.includes(kw)) && /\d/.test(normalized))
  );
}

/**
 * Deteksi apakah pengguna menanyakan cakupan kemampuan / overview layanan.
 */
function isOverviewQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "apa aja",
    "apa saja",
    "bisa jelasin",
    "bisa bantu apa",
    "fitur apa",
    "layanan apa",
    "kamu bisa apa",
    "sipa bisa apa",
    "menu layanan",
  ].some((phrase) => normalized.includes(phrase));
}

/**
 * Deteksi apakah pertanyaan membutuhkan alur pengaduan / eskalasi ke Admin Dinas.
 */
function isEscalationQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "ganda",
    "terkunci",
    "lapor",
    "pengaduan",
    "keluhan",
    "admin",
    "dinas",
    "salah nik",
    "invalid fatal",
    "buka kunci",
    "reset",
  ].some((keyword) => normalized.includes(keyword));
}

/**
 * Helper ekspor kompatibilitas untuk integrasi prompt RAG.
 */
export function generateDapodikPrompt(userMessage: string, sopContext: string): string {
  const currentGreeting = getWibGreeting();
  return `
[SOP & KNOWLEDGE BASE DAPODIK DISDIKBUD NGAWI]
${sopContext}

[SISTEM PROMPT]
${SYSTEM_PROMPT}

[PERTANYAAN PENGGUNA]
${userMessage}

Waktu saat ini: ${currentGreeting}. Berikan jawaban berbasis SOP Dapodik Ngawi secara terstruktur, berjarak paragraf, tanpa emoji di penjelasan teknis, dan tepat sasaran.
`;
}