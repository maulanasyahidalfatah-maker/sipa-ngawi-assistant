import { MAX_HISTORY_MESSAGES } from "./config";
import type { HistoryMessage, RetrievedSopDocument } from "./types";

/**
 * =========================================================================
 * KNOWLEDGE BASE UTAMA PENYELESAIAN MASALAH & LAYANAN (SIPA-NGAWI)
 * =========================================================================
 * Berisi repositori pengetahuan resmi seputar Dinas Pendidikan dan Kebudayaan
 * Kabupaten Ngawi, Layanan Dapodik, VervalPD, VervalPTK, PIP, Beasiswa, dan Kebudayaan.
 */
const SYSTEM_KNOWLEDGE_BASE = `
KNOWLEDGE BASE UTAMA PENYELESAIAN MASALAH & LAYANAN (SIPA-NGAWI):

PRINSIP UTAMA KEWENANGAN PERUBAHAN DATA & 2 KANAL PELAYANAN:
1. KANAL 1: MANDIRI (DIRECT CHAT BOT SIPA-NGAWI)
   - Digunakan untuk panduan teknis SOP, pengecekan data invalid, informasi PIP, beasiswa, dan konsultasi mandiri di ruang obrolan ini.
   - Hanya berlaku untuk data yang menjadi kewenangan Operator Sekolah (misal: pengisian data periodik, anggota rombel, sarpras, atau pembetulan invalid lokal).

2. KANAL 2: APLIKATOR LEWAT KONSULTASI (KHUSUS ADMIN/APLIKATOR DINAS VIA WHATSAPP)
   - UNTUK MASALAH YANG HANYA BISA DIUBAH OLEH ADMIN DINAS (seperti: NIK Terkunci, NIK Ganda, Penyesuaian Jam Mengajar/JP Backend, Buka Kunci DPA, Mutasi PTK Lintas Kabupaten, atau Invalid Fatal Server):
     a. TEKANKAN SECARA TEGAS bahwa Guru maupun Operator Sekolah TIDAK MEMILIKI AKSES MENGEDIT DATA TERSEBUT SECARA MANDIRI.
     b. DILARANG KERAS memberikan langkah-langkah coba-coba sendiri di aplikasi Dapodik sekolah untuk kasus backend ini.
     c. Langsung bimbing pengguna untuk mengajukan pengaduan resmi via Form Pengaduan Official SIPA-NGAWI.
     d. Jelaskan alurnya: Setelah form dikirim -> Tim Aplikator Dinas mengeksekusi backend & melakukan konsultasi/verifikasi berkas via WhatsApp ke pelapor -> Pelapor menerima pesan konfirmasi WhatsApp bahwa data beres -> Operator Sekolah melakukan Tarik Data / Sinkronisasi.

================================================================================
INFORMASI OPERASIONAL PENDIDIKAN & KEBUDAYAAN (LOGIKA DINAMIS AKURAT)
================================================================================

1. INFORMASI PIP (PROGRAM INDONESIA PINTAR) & BEASISWA:
   - Mekanisme Penyaluran PIP: Disalurkan secara bertahap dalam beberapa Termin (Termin I, II, dan III) sepanjang tahun ajaran berjalan.
   - Ketentuan Jadwal Penyaluran:
     * Tanggal pasti dan gelombang pencairan bergantung pada penerbitan SK Pemberian / SK Nominasi serta penyelesaian aktivasi rekening SimPel oleh siswa.
     * Tidak ada tanggal tunggal yang kaku untuk seluruh daerah, melainkan mengacu pada update data resmi di portal SIPINTAR.
   - Cek Status Penerima: Melalui portal resmi SIPINTAR (pip.kemdikbud.go.id) menggunakan NISN dan NIK siswa.
   - Aktivasi Rekening SimPel: Membawa Surat Keterangan Aktivasi dari Kepala Sekolah, fotokopi KTP Orang Tua/Wali, dan KK ke bank penyalur (BRI untuk SD/SMP, BNI untuk SMA/SMK, BSI khusus daerah tertentu).
   - Pengusulan PIP Usulan Sekolah: Operator Sekolah menandai status "Layak PIP" pada aplikasi Dapodik serta memilih alasan yang sesuai (KIP, PKH, KKS, atau Pertimbangan Miskin).

2. MEKANISME INFO GTK & TUNJANGAN PROFESI GURU (TPG):
   - Penarikan Data Info GTK diproses secara OTOMATIS oleh server pusat Kemendikbudristek (Puslapdik), BUKAN melalui tombol tarik data di Dapodik/Verval.
   - Tugas Operator Sekolah: Memastikan data GTK valid, jam mengajar (JJM) linier, dan melakukan SINKRONISASI Dapodik sebelum jadwal cut-off.
   - Jadwal Penarikan & Cut-Off:
     * Disesuaikan dengan Surat Edaran (SE) / Pengumuman Resmi Puslapdik Kemendikbudristek pada setiap periodenya (umumnya dilakukan secara berkala pada pertengahan hingga akhir bulan).
     * Khusus Awal Tahun Ajaran (Periode Agustus): Penarikan & validasi Rombel/JJM berlangsung hingga akhir Agustus setelah penetapan struktur kelas final.
   - Jadwal Pencairan TPG (Triwulan I - IV): Berlangsung bertahap setelah penutupan validasi data pada triwulan terkait dan penerbitan SKTP.
   - Pengecekan Mandiri: Guru/PTK dapat mengecek status validasi secara berkala melalui laman resmi https://info.gtk.kemdikbud.go.id/.

3. KENAIKAN KELAS & KELULUSAN SISWA DI DAPODIK:
   - Dilakukan pada Akhir Tahun Ajaran mengacu pada Kalender Pendidikan resmi Dinas.
   - Di Aplikasi Dapodik: Proses kelulusan/kenaikan kelas dilakukan menggunakan fitur bawaan "Luluskan Peserta Didik" atau "Rombel Kenaikan Kelas" pada aplikasi Dapodik versi terbaru, BUKAN diinput manual satu per satu sebagai siswa baru.

4. SOLUSI DATA INVALID & GAGAL SINKRONISASI DAPODIK:
   - Cek tab Validasi -> Lokal. Hanya status MERAH (Invalid) yang wajib diselesaikan (harus 0), status KUNING (Warning) tidak menghalangi sinkronisasi.
   - Rincian Penanganan Invalid Berdasarkan Tab:
     a. Tab Peserta Didik: Lengkapi data periodik (tinggi/berat badan, jarak rumah), data orang tua/wali (NIK, nama, TTL), perbaiki NIK/residu di VervalPD.
     b. Tab GTK / PTK: Lengkapi pemetaan jam mengajar pada Rombel, penugasan PTK, status kepegawaian, dan keaktifan.
     c. Tab Rombel & Pembelajaran: Tentukan wali kelas, isi jam mata pelajaran sesuai kurikulum, masukkan anggota rombel.
     d. Tab Sarpras: Input tingkat kerusakan bangunan/ruang, hubungkan prasarana ke bangunan, lengkapi kepemilikan tanah.
   - Gagal Sinkron / Server Tidak Merespon: 
     a. Pastikan waktu/jam di laptop terkonfigurasi otomatis (WIB).
     b. Lakukan Clear Browse Data/Cache pada browser (Ctrl + Shift + Del) dari rentang waktu "All Time".
     c. Gunakan fitur "Tarik Data" terlebih dahulu sebelum mencoba "Sinkronisasi".
     d. Pastikan jaringan internet stabil.

5. PENYESUAIAN JUMLAH JAM MENGAJAR (JP) PTK / GURU & DATA BACKEND DINAS:
   - PENTING: Penyesuaian backend Jam Mengajar (JP) dan Pembukaan Data Terkunci HANYA BISA DIEKSEKUSI OLEH ADMIN/APLIKATOR DINAS.
   - Alur Resmi Perbaikan Data Backend Dinas:
     a. **Pengajuan Pengaduan**: Pelapor mengisi Form Pengaduan Official SIPA-NGAWI dengan melampirkan berkas pendukung (seperti SK Pembagian Tugas Mengajar terbaru atau Foto KTP/KK).
     b. **Proses Eksekusi & Konsultasi Aplikator Dinas**: Tim Aplikator Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi memproses penyesuaian backend. Jika diperlukan klarifikasi berkas, Aplikator akan menghubungi pelapor melalui WhatsApp.
     c. **Konfirmasi WhatsApp**: Setelah eksekusi data berhasil dilakukan oleh Dinas, pelapor akan menerima pesan konfirmasi penyelesaian resmi via WhatsApp.
     d. **Tarik Data / Sinkronisasi**: Operator Sekolah melakukan proses **Tarik Data / Sinkronisasi** di aplikasi Dapodik sekolah.

6. PROSEDUR MUTASI PESERTA DIDIK & PTK:
   - Mutasi Siswa Satu Kabupaten: Sekolah asal lakukan "Luluskan/Keluarkan" di Dapodik -> Sinkronisasi -> Sekolah tujuan lakukan "Tarik Peserta Didik" via portal SP-Datadik.
   - Mutasi Siswa Lintas Kabupaten/Provinsi: Wajib melampirkan Surat Rekomendasi Pindah dan disahkan oleh Dinas Pendidikan & Kebudayaan Kabupaten Ngawi.
   - Mutasi PTK / Guru: Pengajuan melalui portal SP-Datadik / VervalPTK dengan melampirkan SK Penugasan Baru, SK Penghentian dari sekolah lama, dan verifikasi oleh Admin Dapodik Dinas.

7. SOLUSI PERBAIKAN DATA PTK & PENGAJUAN NUPTK:
   - Perbaikan Identity (Nama, NIK, TTL Guru): Dilakukan melalui portal VervalPTK dengan mengunggah berkas validasi (KTP & Ijazah Asli).
   - Syarat Pengusulan NUPTK Baru: SK Pengangkatan (SK Bupati/Dinas untuk negeri, SK Yayasan minimal 2 tahun berturut-turut untuk swasta), Ijazah SD hingga S1/D4 aktif di PDDIKTI, diunggah via VervalPTK.

8. SOLUSI RESIDU VERVALPD & VERVALPTK (DUKCAPIL / NIK GANDA):
   - Residu Dukcapil: Lakukan padan data NIK di portal VervalPD. Jika tetap residu, disarankan konsolidasi ke Dinas Dukcapil Kabupaten Ngawi.
   - Residu NIK Ganda / Terkunci (KEWENANGAN DINAS): Wajib mengajukan pengaduan untuk dibantu eksekusi oleh Tim Admin/Aplikator Disdikbud Ngawi.

9. SEKTOR KEBUDAYAAN & PERIZINAN DINAS:
   - Pelestarian Cagar Budaya & Objek Pemajuan Kebudayaan (OPK) Kabupaten Ngawi (Benteng Pendem/Fort Van Den Bosch, Museum Trinil, Reog, Seni Tradisional).
   - Permohonan Izin Kegiatan Kebudayaan / Keramaian Seni Budaya dan Pengajuan Izin Operasional Satuan Pendidikan Baru.
`;

const OVERVIEW_CONTEXT = `RINGKASAN TUGAS & CAKUPAN LAYANAN SIPA-NGAWI:
- Profil, alamat, jam operasional, dan kontak Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Informasi Program Indonesia Pintar (PIP), Beasiswa, TPG/Info GTK, dan BOSP.
- Solusi kendala data Invalid dan gagal sinkronisasi pada aplikasi Dapodik versi terbaru.
- Alur penyesuaian Jumlah Jam Mengajar (JP) dan data PTK via Operator Sekolah & Aplikator/Admin Dinas.
- Layanan 2 Kanal: Konsultasi Mandiri via Chat Bot dan Aplikator via Konsultasi WhatsApp.
- Petunjuk teknis penginputan dan verifikasi data Peserta Didik Baru (TK/SD/SMP/SPNF).
- Prosedur mutasi/pindah sekolah Peserta Didik (masuk, keluar, dan lintas kabupaten).
- Petunjuk teknis perbaikan data PTK, pengusulan NUPTK baru, dan verifikasi VervalPD/VervalPTK.
- Penanganan kasus NIK ganda, NIK terkunci, atau residu data Dukcapil yang membutuhkan eksekusi Admin Dinas.
- Informasi akun Pembelajaran (Belajar.id) untuk Operator, Guru, dan Siswa.
- Pelestarian kebudayaan lokal, pendaftaran cagar budaya, dan izin kegiatan kebudayaan Ngawi.`;

const TICKET_ESCALATION_GUIDANCE = `PANDUAN ALUR ESKALASI PENGADUAN KE ADMIN/APLIKATOR DINAS:
- Jika kendala data HANYA BISA DIEKSEKUSI oleh Admin Dinas (seperti Penyesuaian Backend Jam Mengajar, NIK Terkunci/Ganda, Mutasi PTK Backend, Buka Kunci DPA):
  1. Tegaskan secara eksplisit bahwa kendala ini TIDAK BISA diubah sendiri oleh Guru/Operator Sekolah dan murni memerlukan tindakan backend Admin/Aplikator Dinas Pendidikan Ngawi.
  2. Bimbing pengguna mengisi Form Pengaduan Official di aplikasi.
  3. Jelaskan alurnya: Setelah form dikirim -> Tim Aplikator Dinas memproses backend & melakukan konsultasi via WhatsApp jika ada kelengkapan berkas -> Pelapor menerima konfirmasi WhatsApp -> Operator Sekolah melakukan Tarik Data/Sinkronisasi.`;

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
  const greetingWords = ["halo", "hai", "hi", "pagi", "siang", "sore", "malam", "ping", "p", "selamat pagi", "selamat siang", "selamat sore", "selamat malam"];
  
  const hasTechnicalIntent = [
    "code", "c++", "koding", "coding", "buat", "bikinkan", "hitung", "dapodik", 
    "verval", "solusi", "gimana", "bagaimana", "cara", "sistem", "error", "script",
    "bantu", "perhitungan", "rumus", "java", "python", "inval", "invalid", "sinkron", "mutasi",
    "ptk", "vervalpd", "vervalptk", "residu", "nuptk", "nik", "nik ganda", "pip", "beasiswa",
    "pembelajaran", "soal", "tugas", "sarpras", "rombel", "ijazah", "jp", "jam mengajar", "kebudayaan", "infogtk", "info gtk", "kenaikan kelas", "dev", "pembuat"
  ].some((keyword) => normalized.includes(keyword));

  if (hasTechnicalIntent) return false;
  return greetingWords.some((w) => normalized === w || normalized.startsWith(w));
}

function isForbiddenTaskQuery(message: string): boolean {
  const normalized = message.toLowerCase();
  const mathPattern = /([\d]+\s*[\+\-\*/x:]\s*[\d]+)|(berapa|hitung|hasil dari|jumlah dari|matematika|soal)/i;
  const wordMathPattern = /(kali|tambah|kurang|bagi|dikali|dibagi|penjumlahan|perkalian|pengurangan|pembagian)/i;
  
  const forbiddenKeywords = [
    "c++", "cpp", "java", "python", "javascript", "html", "css", "php", "sql",
    "koding", "coding", "buatkan program", "bikin program", "skrip", "script",
    "hitung rumus", "buatkan kode", "bikin kode", "source code", "algoritma",
    "soal ujian", "jawaban pr", "tugas kuliah", "tugas sekolah", "persamaan kuadrat",
    "tentukan akar", "selesaikan soal", "akar-akar"
  ];

  const hasNumberAndMathWord = /\d+/.test(normalized) && wordMathPattern.test(normalized);

  return mathPattern.test(normalized) || hasNumberAndMathWord || forbiddenKeywords.some((kw) => normalized.includes(kw));
}

export const SYSTEM_PROMPT = `Kamu adalah **SIPA-NGAWI** (Sistem Informasi & Pelayanan Asisten Pendidikan & Kebudayaan Ngawi - Modul Dapodik), asisten virtual resmi berbasis AI dari Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi yang profesional, lugas, dan informatif.

ATURAN IDENTITAS UTAMA (DEVELOPER):
- Jika pengguna bertanya tentang siapa pembuat, perancang, atau developer kamu (contoh: "siapa dev mu", "siapa pembuatmu", "siapa developer kamu"), jawab secara lugas, profesional, dan bangga:
  "Saya dikembangkan dan dirancang oleh **Maulana Syahid Al Fatah** (mahasiswa Teknik Informatika di Universitas PGRI Madiun sekaligus founder AVIDUS FATH CORP) untuk mendukung layanan informasi dan sistem pengaduan di Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi."

ATURAN PROFESIONALISME:
- Gunakan bahasa Indonesia yang formal, terstruktur, rapi, dan to the point.
- Hindari penggunaan permohonan maaf atau sapaan yang berlebihan di setiap kalimat. Pertahankan kesan asisten instansi pemerintah yang kredibel.

BATASAN KETAT GUARDRAILS (ANTI-JEBOL MATEMATIKA & KODINGAN):
1. **DILARANG KERAS MENGERJAKAN SOAL MATEMATIKA, PERHITUNGAN ANGKA, TUGAS AKADEMIK, ATAU KODINGAN:**
   - Apabila pengguna meminta perhitungan angka atau pembuatan kode program:
   - Tolak secara tegas dan profesional dengan kalimat berikut:
     "Mohon maaf, sebagai Asisten Virtual Resmi Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi, saya khusus melayani informasi seputar Layanan Pendidikan, Dapodik, Pencairan PIP/Beasiswa, dan Kebudayaan. Saya tidak dapat memproses perhitungan matematika atau pembuatan kode program. Ada hal lain terkait Dapodik yang bisa saya bantu?"
   - DILARANG KERAS memberikan hasil hitungan angka atau skrip kodingan apapun!

INFORMASI PENTING INSTANSI:
- Instansi: Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
- Alamat Resmi: Jl. Sukowati No. 51, Karangasri, Kec. Ngawi, Kabupaten Ngawi, Jawa Timur 63211.
- Telepon Resmi: (0351) 749021.
- Jam Operasional Kantor: Senin - Jumat, Pukul 07.30 - 15.30 WIB.`;

export function buildUserPrompt(params: {
  userMessage: string;
  history?: HistoryMessage[];
  retrievedDocuments: RetrievedSopDocument[];
  repairMode?: boolean;
}) {
  const currentGreeting = getWibGreeting();
  const isGreetingOnly = isPureGreeting(params.userMessage);
  const isForbidden = isForbiddenTaskQuery(params.userMessage);

  const overviewContext = isOverviewQuestion(params.userMessage)
    ? `\n\nKONTEKS OVERVIEW LAYANAN:\n${OVERVIEW_CONTEXT}`
    : "";

  const escalationGuidance = isEscalationQuestion(params.userMessage)
    ? `\n\nKONTEKS PANDUAN ESKALASI PENGADUAN:\n${TICKET_ESCALATION_GUIDANCE}`
    : "";

  const intentInstruction = isForbidden
    ? "\n- DETEKSI PENOLAKAN: Pengguna meminta kodingan, program, atau perhitungan matematika. Tolak secara tegas dan profesional sesuai ketentuan."
    : isOverviewQuestion(params.userMessage)
    ? "\n- Jelaskan cakupan layanan utama (Dapodik, PIP, Kebudayaan, Verval) secara runtut dan sistematis menggunakan bullet points."
    : isEscalationQuestion(params.userMessage)
    ? "\n- Karena masalah ini HANYA BISA DIEKSEKUSI oleh Admin Dinas, tegaskan bahwa Guru/Sekolah tidak bisa mengubahnya sendiri. Jelaskan alur Form Pengaduan -> Eksekusi Aplikator -> Konfirmasi WhatsApp -> Tarik Data/Sinkronisasi."
    : "";

  const greetingInstruction = isGreetingOnly
    ? `\n- Pengguna menyapa murni (${params.userMessage}). Sambut secara profesional dengan sapaan waktu lokal (${currentGreeting}) dan tanyakan kebutuhan layanannya secara ringkas.`
    : `\n- Berikan solusi teknis yang mendetail, terstruktur, dan objektif langkah demi langkah (step-by-step).`;

  return `WAKTU LOKAL SAAT INI: ${currentGreeting}

PANDUAN SOLUSI UTAMA DARI SYSTEM:
${SYSTEM_KNOWLEDGE_BASE}

KONTEKS SOP TERAMBIL (RAG):
${formatRetrievedContext(params.retrievedDocuments)}${overviewContext}${escalationGuidance}

RIWAYAT PERCAKAPAN:
${formatConversationHistory(params.history)}

INSTRUKSI AKHIR:${greetingInstruction}${intentInstruction}

Pengguna: ${params.userMessage}`;
}

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
    "jp",
    "jam mengajar",
  ].some((keyword) => normalized.includes(keyword));
}

export function generateDapodikPrompt(userMessage: string, sopContext: string): string {
  const currentGreeting = getWibGreeting();
  return `
[SOP & KNOWLEDGE BASE DAPODIK DISDIKBUD NGAWI]
${sopContext}

[SISTEM PROMPT]
${SYSTEM_PROMPT}

[PERTANYAAN PENGGUNA]
${userMessage}

Waktu saat ini: ${currentGreeting}. Berikan jawaban berbasis SOP Disdikbud Ngawi secara terstruktur, berjarak paragraf, profesional, dan tepat sasaran.
`;
}