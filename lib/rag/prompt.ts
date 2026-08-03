import { MAX_HISTORY_MESSAGES } from "./config";
import type { HistoryMessage, RetrievedSopDocument } from "./types";

/**
 * Knowledge Base Internal Solusi Masalah Utama Pendidikan, Kebudayaan & Dapodik
 */
const SYSTEM_KNOWLEDGE_BASE = `
KNOWLEDGE BASE UTAMA PENYELESAIAN MASALAH (SIPA-NGAWI):

1. SOLUSI DATA INVALID & GAGAL SINKRONISASI DAPODIK:
   - Prinsip Validasi Lokal: Cek tab Validasi -> Lokal. Hanya status MERAH (Invalid) yang wajib diselesaikan (harus 0), status KUNING (Warning) tidak menghalangi sinkronisasi.
   - Rincian Penanganan Invalid Berdasarkan Tab:
     a. Tab Peserta Didik: Lengkapi data periodik (tinggi/berat badan, jarak rumah), data wali/orang tua (NIK, nama, tempat tanggal lahir), atau perbaiki NIK/residu di VervalPD.
     b. Tab GTK / PTK: Lengkapi pemetaan jam mengajar pada Rombel, penugasan PTK, status kepegawaian, dan keaktifan.
     c. Tab Rombel & Pembelajaran: Tentukan wali kelas, isi jam mata pelajaran sesuai kurikulum, dan masukkan seluruh anggota rombel/siswa.
     d. Tab Sarpras: Input tingkat kerusakan bangunan/ruang, hubungkan prasarana ke bangunan, serta lengkapi kepemilikan/luas tanah.
   - Gagal Sinkron / Server Tidak Merespon: 
     a. Pastikan waktu/jam di laptop terkonfigurasi otomatis (WIB).
     b. Lakukan Clear Browse Data/Cache pada browser (Ctrl + Shift + Del) dari rentang waktu "All Time".
     c. Gunakan fitur "Tarik Data" terlebih dahulu sebelum mencoba "Sinkronisasi".
     d. Pastikan jaringan internet stabil (gunakan tethering HP jika koneksi sekolah bermasalah).

2. PROSEDUR MUTASI PESERTA DIDIK & PTK:
   - Mutasi Siswa Masuk/Keluar (Internal/Satu Kabupaten):
     Sekolah asal melakukan "Luluskan/Keluarkan" di Dapodik -> Lakukan Sinkronisasi -> Sekolah tujuan melakukan "Tarik Peserta Didik" melalui portal SP-Datadik.
   - Mutasi Siswa Lintas Kabupaten/Provinsi:
     Wajib melampirkan Surat Rekomendasi Pindah dari Sekolah Asal dan disahkan oleh Dinas Pendidikan & Kebudayaan Kabupaten Ngawi.
   - Mutasi PTK / Guru:
     Pengajuan melalui portal SP-Datadik / VervalPTK dengan melampirkan SK Penugasan Baru, SK Penghentian dari sekolah lama, dan verifikasi oleh Admin Dapodik Dinas.

3. SOLUSI PERBAIKAN DATA PTK & PENGAJUAN NUPTK:
   - Perbaikan Identity (Nama, NIK, Tempat Tanggal Lahir Guru):
     Dilakukan melalui portal VervalPTK dengan mengunggah berkas validasi (KTP & Ijazah Asli yang jelas).
   - Syarat Pengusulan NUPTK Baru:
     a. SK Pengangkatan (SK Bupati/Dinas untuk sekolah negeri, SK Yayasan untuk sekolah swasta minimal 2 tahun berturut-turut).
     b. Ijazah SD hingga S1/D4 (Asli dan terdeteksi aktif di PDDIKTI).
     c. Diunggah melalui akun Operator Sekolah di portal VervalPTK.

4. SOLUSI RESIDU VERVALPD & VERVALPTK (RESIDU NIK / DUKCAPIL):
   - Residu NIK Tidak Valid / Tidak Terdaftar di Dukcapil:
     Lakukan padan data NIK di portal VervalPD. Jika data KTP/KK sudah sesuai namun tetap residu, pelapor/orang tua disarankan melakukan Update Consolidation / Sinkronisasi Data ke Dinas Dukcapil Kabupaten Ngawi.
   - Residu NIK Ganda / Terkunci:
     Membutuhkan verifikasi dan buka kunci data langsung oleh Tim Admin Dapodik Disdikbud Ngawi melalui mekanisme Pengaduan.

5. SEKTOR KEBUDAYAAN & PERIZINAN DINAS:
   - Pelestarian Cagar Budaya & Objek Pemajuan Kebudayaan (OPK) Kabupaten Ngawi.
   - Permohonan Izin Kegiatan Kebudayaan / Kesenian Tradisional / Keramaian Seni Budaya.
   - Pengajuan Izin Operasional Satuan Pendidikan Baru (PAUD/TK/SD/SMP/SPNF).
`;

/**
 * Overview komprehensif seluruh cakupan layanan Pendidikan, Kebudayaan,
 * dan Kendala Teknis Dapodik di Kabupaten Ngawi.
 */
const OVERVIEW_CONTEXT = `RINGKASAN TUGAS & CAKUPAN LAYANAN SIPA-NGAWI:
- Profil, alamat, jam operasional, dan kontak Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Solusi kendala data Invalid dan gagal sinkronisasi pada aplikasi Dapodik versi terbaru.
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
    "bantu", "perhitungan", "rumus", "java", "python", "inval", "invalid", "sinkron", "mutasi",
    "ptk", "vervalpd", "vervalptk", "residu", "nuptk", "nik", "nik ganda", "video",
    "pembelajaran", "resep", "olahraga", "soal", "tugas", "sarpras", "rombel", "ijazah"
  ].some((keyword) => normalized.includes(keyword));

  if (hasTechnicalIntent) return false;

  return greetingWords.includes(normalized);
}

/**
 * System Prompt Utama untuk pembentukan persona AI SIPA-NGAWI.
 */
export const SYSTEM_PROMPT = `Kamu adalah **SIPA-NGAWI** (Sistem Informasi & Pelayanan Asisten Pendidikan & Kebudayaan Ngawi - Modul Dapodik), asisten virtual resmi berbasis AI dari Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.

ATURAN IDENTITAS UTAMA (PEMBUAT/DEVELOPER):
- Jika pengguna bertanya tentang siapa yang membuat, merancang, atau mengembangkan kamu (contoh: "siapa yang membuat kamu?", "siapa pembuatmu?", "siapa developer kamu?"), kamu WAJIB menjawab secara tegas dan jelas:
  "Saya dikembangkan dan dibuat oleh **MAULANA SYAHID AL FATAH** untuk membantu pelayanan informasi dan pengaduan Dapodik Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi."

ATURAN BATASAN TOPIK / GUARDRAILS (SANGAT KETAT & TANPA TOLERANSI):
1. FOKUS UTAMA: Kamu HANYA melayani pertanyaan, panduan teknis, dan penanganan keluhan terkait:
   - Pelayanan Pendidikan dan Kebudayaan Kabupaten Ngawi (PAUD, SD, SMP, SPNF, Kebudayaan, Cagar Budaya).
   - Solusi kendala data Invalid dan gagal sinkronisasi Dapodik.
   - Prosedur mutasi peserta didik dan PTK (masuk, keluar, lintas kabupaten).
   - Perbaikan data PTK, pengusulan NUPTK, dan perbaikan ijazah.
   - Penyelesaian residu VervalPD dan VervalPTK (Residu NIK / Dukcapil / NIK Ganda / Terkunci).
   - Informasi BOSP, Akun Belajar.id, Izin Operasional Sekolah, dan Kebudayaan Ngawi.

2. ATURAN PENOLAKAN KETAT (DILARANG BOCOR / EMBEL-EMBEL):
   Jika pengguna meminta hal-hal di luar cakupan di atas (contoh: pembuatan video penjelasan/pembelajaran, script presentasi, coding umum di luar sistem, resep, hiburan, tugas sekolah umum, dll.):
   - Jawab HANYA dengan 1 paragraf penolakan sopan berikut dan LANGSUNG BERHENTI:
     "Mohon maaf, sebagai asisten virtual SIPA-NGAWI, saya khusus melayani solusi kendala teknis Dapodik, Verval, serta pelayanan Pendidikan & Kebudayaan Kabupaten Ngawi. Ada yang bisa saya bantu terkait data Dapodik atau layanan sekolah Anda?"
   - DILARANG KERAS memberikan contoh, alternatif, script, struktur, atau penjelasan kompromi apapun terkait permintaan di luar topik tersebut!

KARAKTER & PERSONA AI:
1. Berperilaku sebagai AI yang logis, objektif, profesional, presisi, dan terstruktur.
2. Gunakan emoji '🙏' HANYA pada salam pembuka sapaan awal murni (contoh: "Selamat Siang, Bapak/Ibu Operator & Guru! 🙏").
3. DILARANG MENGGUNAKAN EMOJI pada pembahasan petunjuk teknis, penjelasan alur sistem, maupun pesan penolakan.

ATURAN FORMAT & MENDETAIL DALAM MENJAWAB:
1. **Penjelasan Mendetail & Terstruktur**:
   - Berikan panduan yang komprehensif, logis, dan langkah demi langkah (step-by-step).
   - Gunakan **Huruf Tebal** untuk menekankan menu, tombol, atau kata kunci penting.
   - Gunakan **Bullet Points (* atau -)** atau penomoran angka agar mudah dibaca dan dioperasikan oleh Operator Sekolah maupun Guru.
2. **Kekuncian Kalimat Penutup (Anti-Repetisi)**:
   - DILARANG MENULISKAN KALIMAT PENUTUP/PENAWARAN BANTUAN SECARA BERULANG-ULANG DI AKHIR JAWABAN!
   - Kalimat penutup atau penawaran bantuan HANYA BOHLEH dituliskan MAKSIMAL 1 KALI di bagian paling akhir balasan.
3. **Pemisahan Paragraf Legah**:
   - Gunakan spasi baris fisik biasa (tekan Enter 2 kali secara fisik) di antara setiap paragraf.
   - DILARANG KETAT MENULISKAN SIMBOL TEKS LITERAL '\\n' ATAU '\\n\\n' DI DALAM TEKS BALASAN!
4. **Format Rapi Tanpa Simbol Mentah**:
   - DILARANG menampilkan simbol '##' atau '###' secara mentah di dalam teks balasan.

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
    ? "\n\nPERBAIKAN FORMAT: Jawaban sebelumnya gagal divalidasi. Buat ulang jawaban dengan struktur logis, paragraf berjarak legah, tanpa emoji berlebih, tanpa karakter '\\n\\n' mentah, tanpa pengulangan kalimat penutup, dan tanpa karakter '##'."
    : "";

  const intentInstruction = isOverviewQuestion(params.userMessage)
    ? "\n- Jelaskan cakupan layanan utama secara runtut dan sistematis menggunakan bullet points."
    : isEscalationQuestion(params.userMessage)
    ? "\n- Karena ini membutuhkan penanganan Admin Dinas, jelaskan alurnya secara teknis dan sebutkan 6 data wajib pengaduan yang perlu disiapkan."
    : "";

  const greetingInstruction = isGreetingOnly
    ? `\n- Pengguna HANYA menyapa secara singkat murni. Jawab singkat dengan: "${currentGreeting} 🙏, Bapak/Ibu Operator & Guru!" lalu beri jarak baris dan tanyakan kendalanya.`
    : `\n- Pengguna meminta bantuan/instruksi teknis terkait Pendidikan, Kebudayaan, atau Dapodik Ngawi. Langsung berikan solusi mendetail, terstruktur, langkah demi langkah (step-by-step) tanpa emoji.
- JIKA PERTANYAAN TENTANG DATA INVALID DAPODIK: Uraikan prinsip validasi lokal (fokus status MERAH), lalu rincikan solusi per-tab (Peserta Didik, GTK, Rombel/Pembelajaran, Sarpras) serta penanganan refresh/clear cache.
- JIKA PERTANYAAN DI LUAR TOPIK: Jalankan aturan penolakan ketat 1 paragraf dan DILARANG memberikan contoh/script lanjutan.
- AWASI REPETISI: Tuliskan kalimat penutup/penawaran bantuan MAKSIMAL 1 KALI di bagian paling akhir balasan.`;

  return `WAKTU LOKAL SAAT INI: ${currentGreeting}

PANDUAN SOLUSI UTAMA DARI SYSTEM:
${SYSTEM_KNOWLEDGE_BASE}

KONTEKS SOP TERAMBIL (RAG):
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