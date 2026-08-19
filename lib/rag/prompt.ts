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

1. INFORMASI PIP (PROGRAM INDONESIA PINTAR) & BESARAN DANA:
   - Besaran Dana Bantuan PIP Kemendikdasmen Berdasarkan Jenjang & Kelas:
     * SD / MI / Paket A: Kelas Reguler Rp450.000 per tahun | Siswa Baru/Akhir (Kelas 1 & 6) Rp225.000.
     * SMP / MTs / Paket B: Kelas Reguler Rp750.000 per tahun | Siswa Baru/Akhir (Kelas 7 & 9) Rp375.000.
     * SMA / SMK / MA / Paket C: Kelas Reguler Rp1.800.000 per tahun | Siswa Baru/Akhir (Kelas 10 & 12) Rp900.000.
   - Alasan Perbedaan Nominal (Siswa Baru / Kelas Akhir): Mendapatkan setengah dari nominal reguler karena hanya menjalani satu semester dalam tahun anggaran berjalan.
   - Mekanisme Penyaluran PIP: Disalurkan secara bertahap dalam beberapa Termin (Termin I, II, dan III) sepanjang tahun ajaran berjalan.
   - Ketentuan Jadwal Penyaluran:
     * Tanggal pasti dan gelombang pencairan bergantung pada penerbitan SK Pemberian / SK Nominasi serta penyelesaian aktivasi rekening SimPel oleh siswa.
     * Tidak ada tanggal tunggal yang kaku untuk seluruh daerah, melainkan mengacu pada update data resmi di portal SIPINTAR.
   - Cek Status Penerima: Melalui portal resmi SIPINTAR (pip.kemdikbud.go.id) menggunakan NISN dan NIK siswa.
   - Aktivasi Rekening SimPel: Membawa Surat Keterangan Aktivasi dari Kepala Sekolah, fotokopi KTP Orang Tua/Wali, dan KK ke bank penyalur (BRI untuk SD/SMP, BNI untuk SMA/SMK, BSI khusus daerah tertentu).
   - Pengusulan PIP Usulan Sekolah: Operator Sekolah menandai status "Layak PIP" pada aplikasi Dapodik serta memilih alasan yang sesuai (KIP, PKH, KKS, atau Pertimbangan Miskin).

2. MEKANISME INFO GTK & TUNJANGAN PROFESI GURU (TPG):
   - Penarikan Data Info GTK diproses secara OTOMATIS oleh server pusat Kemendikbudristek (Puslapdik), BUKAN melalui tombol tarik data di Dapodik/Verval.
   - Jadwal Penarikan & Cut-Off: Cut-off Info GTK untuk validasi Tunjangan Profesi Guru (TPG) umumnya dilakukan berkala setelah tanggal 10 sampai pertengahan bulan berjalan.
   - Tugas Operator Sekolah: Memastikan data GTK valid, jam mengajar (JJM) linier, status kepegawaian aktif, dan melakukan SINKRONISASI Dapodik sebelum jadwal cut-off.
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
     a. Pengajuan Pengaduan: Pelapor mengisi Form Pengaduan Official SIPA-NGAWI dengan melampirkan berkas pendukung (seperti SK Pembagian Tugas Mengajar terbaru atau Foto KTP/KK).
     b. Proses Eksekusi & Konsultasi Aplikator Dinas: Tim Aplikator Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi memproses penyesuaian backend. Jika diperlukan klarifikasi berkas, Aplikator akan menghubungi pelapor melalui WhatsApp.
     c. Konfirmasi WhatsApp: Setelah eksekusi data berhasil dilakukan oleh Dinas, pelapor akan menerima pesan konfirmasi penyelesaian resmi via WhatsApp.
     d. Tarik Data / Sinkronisasi: Operator Sekolah melakukan proses Tarik Data / Sinkronisasi di aplikasi Dapodik sekolah.

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

/**
 * Overview komprehensif seluruh cakupan layanan Pendidikan, Kebudayaan,
 * dan Kendala Teknis Dapodik di Kabupaten Ngawi.
 */
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

/**
 * Panduan penanganan saat pengguna membutuhkan verifikasi/eksekusi oleh Admin Dinas.
 */
const TICKET_ESCALATION_GUIDANCE = `PANDUAN ALUR ESKALASI PENGADUAN KE ADMIN/APLIKATOR DINAS:
- Jika kendala data HANYA BISA DIEKSEKUSI oleh Admin Dinas (seperti Penyesuaian Backend Jam Mengajar, NIK Terkunci/Ganda, Mutasi PTK Backend, Buka Kunci DPA):
  1. Tegaskan secara eksplisit bahwa kendala ini TIDAK BISA diubah sendiri oleh Guru/Operator Sekolah dan murni memerlukan tindakan backend Admin/Aplikator Dinas Pendidikan Ngawi.
  2. Bimbing pengguna mengisi Form Pengaduan Official di aplikasi.
  3. Jelaskan alurnya: Setelah form dikirim -> Tim Aplikator Dinas memproses backend & melakukan konsultasi via WhatsApp jika ada kelengkapan berkas -> Pelapor menerima konfirmasi WhatsApp -> Operator Sekolah melakukan Tarik Data/Sinkronisasi.`;

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
  const greetingWords = [
    "halo", "hai", "hi", "pagi", "siang", "sore", "malam", "ping", "p",
    "selamat pagi", "selamat siang", "selamat sore", "selamat malam"
  ];
  
  const hasTechnicalIntent = [
    "code", "c++", "koding", "coding", "buat", "bikinkan", "hitung", "dapodik", 
    "verval", "solusi", "gimana", "bagaimana", "cara", "sistem", "error", "script",
    "bantu", "perhitungan", "rumus", "java", "python", "inval", "invalid", "sinkron", "mutasi",
    "ptk", "vervalpd", "vervalptk", "residu", "nuptk", "nik", "nik ganda", "pip", "beasiswa",
    "pembelajaran", "soal", "tugas", "sarpras", "rombel", "ijazah", "jp", "jam mengajar",
    "kebudayaan", "infogtk", "info gtk", "kenaikan kelas", "cair", "kapan", "besaran",
    "dev", "developer", "pembuat"
  ].some((keyword) => normalized.includes(keyword));

  if (hasTechnicalIntent) return false;

  return greetingWords.includes(normalized);
}

/**
 * Deteksi Khusus Pertanyaan Siapa Pembuat / Developer
 */
export function isDeveloperQuery(message: string): boolean {
  const normalized = message.toLowerCase();
  const devPhrases = [
    "siapa dev",
    "siapa developer",
    "pembuatmu",
    "pembuat kamu",
    "siapa yang buat",
    "siapa yang bikin",
    "siapa pembuat",
    "created by",
    "developer kamu",
    "dev mu",
    "developermu",
    "siapa developermu",
    "siapa penciptamu"
  ];
  return devPhrases.some((phrase) => normalized.includes(phrase));
}

/**
 * System Prompt Utama untuk pembentukan persona AI SIPA-NGAWI.
 */
export const SYSTEM_PROMPT = `Kamu adalah **SIPA-NGAWI** (Sistem Informasi & Pelayanan Asisten Pendidikan & Kebudayaan Ngawi - Modul Dapodik), asisten virtual resmi berbasis AI dari Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.

ATURAN IDENTITAS UTAMA (PEMBUAT/DEVELOPER):
- Jika pengguna bertanya tentang siapa yang membuat, merancang, atau mengembangkan kamu (contoh: "siapa yang membuat kamu?", "siapa pembuatmu?", "siapa developer kamu?", "siapa dev mu?"), kamu WAJIB menjawab HANYA DENGAN 1 KALIMAT TEGAS BERIKUT TANPA MENAMBAHKAN KALIMAT PENOLAKAN ATAU FORMULIR APAPUN:
  "Saya dikembangkan dan dibuat oleh **MAULANA SYAHID AL FATAH** untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi."

BATASAN KETAT GUARDRAILS (ANTI-HALUSINASI & ANTI-JEBOL):
1. **DILARANG MEMBERIKAN TANGGAL KAKU JIKA TANGGAL TERSEBUT DILAKUKAN BERKALA/DINAMIS:**
   - Untuk pertanyaan seperti jadwal Info GTK, pencairan PIP, atau jadwal TPG, WAJIB menjelaskan mekanismenya secara umum dan menyampaikan bahwa jadwal tepat mengacu pada Surat Edaran (SE) / Pengumuman Resmi instansi terkait.
   - DILARANG mengarang tombol, fitur, atau menu di aplikasi yang sebenarnya tidak ada.
2. **DILARANG KERAS MENGERJAKAN SOAL MATEMATIKA MURNI, TUGAS AKADEMIK, ATAU KODINGAN PROGRAM:**
   - Hanya tolak jika pengguna secara spesifik meminta dibuatkan program komputer (seperti C++, Java, Python, HTML, PHP, Javascript, skrip kode) atau soal matematika/tugas sekolah di luar topik pendidikan/dinas.
   - Tuliskan pesan penolakan 1 paragraf berikut:
     "Mohon maaf, sebagai Asisten Virtual Resmi Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi, saya khusus melayani informasi seputar Layanan Pendidikan, Dapodik, Pencairan PIP/Beasiswa, serta Kebudayaan di Kabupaten Ngawi. Saya tidak dapat membantu pengerjaan soal ujian, matematika/tugas sekolah, maupun pembuatan kode program (kodingan). Ada yang bisa saya bantu terkait layanan pendidikan atau Dapodik sekolah Anda?"
   - DILARANG KERAS memberikan skrip, potongan kode, perhitungan matematika, contoh program, atau jawaban tugas akademik apapun meskipun pengguna memaksa!

PRINSIP KEWENANGAN PERUBAHAN DATA & DUA KANAL PELAYANAN:
1. **Kanal Chat Asisten Virtual**: Untuk informasi umum pendidikan, kebudayaan, PIP, Info GTK, Kenaikan Kelas, dan kendala Dapodik yang bisa diselesaikan mandiri oleh Operator Sekolah.
2. **Kanal Aplikator via Konsultasi (KHUSUS PERUBAHAN ADMIN DINAS)**:
   - Jika perubahan data HANYA BISA DILAKUKAN OLEH ADMIN DINAS (seperti Jam Mengajar/JP Backend, NIK Terkunci, NIK Ganda, Buka Kunci DPA):
     a. TEKANKAN BAHWA GURU/OPERATOR SEKOLAH TIDAK BISA MENGUBAH DATA TERSEBUT SENDIRI.
     b. DILARANG MEMBERIKAN INSTRUKSI COBA-COBA MANDIRI KEPADA PENGGUNA.
     c. Bimbing pengguna mengisi Form Pengaduan Official.
     d. Jelaskan bahwa setelah pengaduan dikirim, Tim Aplikator Dinas akan memproses backend, mengonfirmasi/berkonsultasi via WhatsApp pelapor, dan meminta sekolah melakukan Sinkronisasi/Tarik Data.

KARAKTER & PERSONA AI:
1. Berperilaku sebagai AI yang logis, objektif, profesional, presisi, dan terstruktur.
2. Gunakan emoji '🙏' HANYA pada salam pembuka sapaan awal murni (contoh: "Selamat Siang, Bapak/Ibu Operator & Guru! 🙏").
3. DILARANG MENGGUNAKAN EMOJI pada pembahasan petunjuk teknis, penjelasan alur sistem, maupun pesan penolakan.

ATURAN FORMAT & KERAPIAN BALASAN:
1. **Penjelasan Mendetail & Terstruktur**:
   - Berikan panduan yang komprehensif, logis, dan langkah demi langkah (step-by-step).
   - Gunakan **Huruf Tebal** untuk menekankan menu, tombol, atau kata kunci penting.
   - Gunakan **Bullet Points (-)** atau daftar penomoran angka untuk merinci data/langkah.
2. **DILARANG MENGGUNAKAN FORMAT TABEL & PEMBATAS GARIS**:
   - DILARANG KERAS menggunakan format tabel Markdown (seperti karakter '|', '|---...---|', atau tabel markdown lainnya).
   - DILARANG KERAS menggunakan garis pemisah horizontal seperti '---' atau '___'.
   - Pisahkan setiap topik, rincian data, dan bagian kalimat HANYA menggunakan jeda paragraf spasi baris kosong (Enter 2 kali).
3. **Kekuncian Kalimat Penutup (Anti-Repetisi)**:
   - DILARANG MENULISKAN KALIMAT PENUTUP/PENAWARAN BANTUAN SECARA BERULANG-ULANG DI AKHIR JAWABAN!
   - Kalimat penutup atau penawaran bantuan HANYA BOLEH dituliskan MAKSIMAL 1 KALI di bagian paling akhir balasan.
4. **Format Rapi Tanpa Simbol Mentah**:
   - DILARANG menampilkan simbol '##' atau '###' secara mentah di dalam teks balasan.
   - DILARANG KETAT MENULISKAN SIMBOL TEKS LITERAL '\\n' ATAU '\\n\\n' DI DALAM TEKS BALASAN!

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
  const isDevQuery = isDeveloperQuery(params.userMessage);
  const isForbidden = isForbiddenTaskQuery(params.userMessage);

  const overviewContext = isOverviewQuestion(params.userMessage)
    ? `\n\nKONTEKS OVERVIEW LAYANAN:\n${OVERVIEW_CONTEXT}`
    : "";

  const escalationGuidance = isEscalationQuestion(params.userMessage)
    ? `\n\nKONTEKS PANDUAN ESKALASI PENGADUAN:\n${TICKET_ESCALATION_GUIDANCE}`
    : "";

  const mathInstruction = isMathQuestion(params.userMessage) && !isForbidden
    ? "\n- KETENTUAN KHUSUS: Pengguna menanyakan soal perhitungan matematika umum. Tetap prioritaskan batasan layanan resmi jika pertanyaan berbentuk soal ujian/tugas."
    : "";

  const repairInstruction = params.repairMode
    ? "\n\nPERBAIKAN FORMAT: Jawaban sebelumnya gagal divalidasi. Buat ulang jawaban dengan struktur logis, paragraf berjarak legah, tanpa format tabel (|), tanpa garis pemisah (---), tanpa emoji berlebih, tanpa karakter '\\n\\n' mentah, tanpa pengulangan kalimat penutup, dan tanpa karakter '##'."
    : "";

  const intentInstruction = isDevQuery
    ? "\n- INSTRUKSI IDENTITAS DEVELOPER: Pengguna menanyakan pembuat/developer. WAJIB Jawab HANYA DENGAN: 'Saya dikembangkan dan dibuat oleh MAULANA SYAHID AL FATAH untuk membantu pelayanan informasi dan pengaduan Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.' TANPA MENAMBAHKAN KALIMAT PENOLAKAN ATAU FORMULIR APAPUN!"
    : isForbidden
    ? "\n- DETEKSI PENOLAKAN KODINGAN/TUGAS/MATEMATIKA: Pengguna meminta kodingan, program, perhitungan matematika, atau jawaban tugas/soal ujian. WAJIB Jawab HANYA dengan 1 paragraf penolakan resmi SOP Disdikbud Ngawi tanpa memberikan perhitungan/jawaban/skrip apapun!"
    : isOverviewQuestion(params.userMessage)
    ? "\n- Jelaskan cakupan layanan utama (Dapodik, PIP, Kebudayaan, Verval) secara runtut dan sistematis menggunakan bullet points."
    : isEscalationQuestion(params.userMessage)
    ? "\n- Karena masalah ini HANYA BISA DIEKSEKUSI oleh Admin Dinas, tegaskan bahwa Guru/Sekolah tidak bisa mengubahnya sendiri. Jelaskan alur Form Pengaduan -> Eksekusi Aplikator -> Konfirmasi WhatsApp -> Tarik Data/Sinkronisasi."
    : "";

  const greetingInstruction = isGreetingOnly
    ? `\n- Pengguna HANYA menyapa secara singkat murni. Jawab singkat dengan: "${currentGreeting} 🙏, Bapak/Ibu Operator & Guru!" lalu beri jarak baris dan tanyakan kendalanya.`
    : `\n- Pengguna meminta bantuan/instruksi teknis terkait Pendidikan, Kebudayaan, PIP, Info GTK, Kenaikan Kelas, atau Dapodik Ngawi. Langsung berikan solusi mendetail, terstruktur, langkah demi langkah (step-by-step) tanpa emoji.
- DILARANG MEMBUAT TABEL (|) DAN GARIS (---): Gunakan bullet points atau daftar nomor berjarak paragraf bersih.
- JANGAN REKAYASA TANGGAL ATAU FITUR APLIKASI: Jelaskan bahwa jadwal pencairan/cut-off mengikuti Surat Edaran resmi ter-update.
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
- DILARANG menggunakan format tabel markdown (|) dan garis pembatas (---).
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
    .join("\n\n\n\n");
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
 * Deteksi ketat apakah pertanyaan merupakan Kodingan/Tugas/PR/Ujian/Matematika
 */
export function isForbiddenTaskQuery(message: string): boolean {
  const normalized = message.toLowerCase();

  // Jika merupakan pertanyaan developer, JANGAN blokir
  if (isDeveloperQuery(message)) {
    return false;
  }

  // Whitelist mutlak: Pertanyaan seputar pendidikan, PIP, Info GTK, Dapodik, dan layanan dinas tidak boleh diblokir
  const allowedKeywords = [
    "dapodik", "infogtk", "info gtk", "tarik data", "sinkron", 
    "pip", "beasiswa", "ptk", "verval", "mutasi", "sipa", "ngawi", 
    "bosp", "nuptk", "nik", "rombel", "sarpras", "rapor", "cair", "pencairan",
    "tpg", "sktp", "besaran", "nominal", "sd", "smp", "sma", "smk"
  ];
  if (allowedKeywords.some((kw) => normalized.includes(kw))) {
    return false;
  }
  
  // Deteksi rumus persamaan matematika (misal: 2x^2 + 5x - 3 = 0, dll)
  const hasMathEquation = /[\d]*x[\^2\d]*|[\d]+\s*[\+\-\*/x:]\s*[\d]+|= 0/i.test(normalized);

  const forbiddenKeywords = [
    "c++",
    "cpp",
    "java",
    "python",
    "javascript",
    "html",
    "css",
    "php",
    "sql",
    "koding",
    "coding",
    "buatkan program",
    "bikin program",
    "skrip",
    "script",
    "hitung rumus",
    "buatkan kode",
    "bikin kode",
    "source code",
    "algoritma",
    "soal ujian",
    "jawaban pr",
    "tugas kuliah",
    "tugas sekolah",
    "persamaan kuadrat",
    "tentukan akar",
    "selesaikan soal",
    "akar-akar"
  ];

  return hasMathEquation || forbiddenKeywords.some((kw) => normalized.includes(kw));
}

/**
 * Deteksi apakah pengguna menanyakan perhitungan matematika/angka.
 */
function isMathQuestion(message: string): boolean {
  const normalized = message.toLowerCase();

  if (isDeveloperQuery(message)) {
    return false;
  }

  const allowedKeywords = [
    "dapodik", "infogtk", "info gtk", "pip", "tpg", "besaran", "nominal",
    "sd", "smp", "sma", "smk"
  ];
  if (allowedKeywords.some((kw) => normalized.includes(kw))) {
    return false;
  }

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
    "jp",
    "jam mengajar",
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

Waktu saat ini: ${currentGreeting}. Berikan jawaban berbasis SOP Disdikbud Ngawi secara terstruktur, berjarak spasi paragraf rapi tanpa tabel markdown (|) maupun garis pemisah (---), dan tepat sasaran.
`;
}