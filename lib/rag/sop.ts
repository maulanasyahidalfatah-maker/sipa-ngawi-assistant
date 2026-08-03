import { Document } from "@langchain/core/documents";
import { promises as fs } from "fs";
import path from "path";
import { CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from "./config";
import type { SopDocument, SopMetadata } from "./types";

// Path menuju file SOP.txt di akar proyek
const SOP_FILE_PATH = path.join(process.cwd(), "SOP.txt");

export type SopSection = {
  title: string;
  text: string;
};

export type SopChunk = {
  id: string;
  title: string;
  text: string;
  part: number;
};

/**
 * Interface Data SOP Internal untuk pencarian cepat berbasis Kata Kunci / Kategori
 */
export interface SOPItem {
  id: string;
  category: "Inval/Sinkron" | "Peserta Didik" | "Data PTK" | "Verval" | "Kebudayaan" | "Umum";
  title: string;
  keywords: string[];
  content: string;
}

/**
 * Database SOP Teknis Komprehensif Dapodik & Kebudayaan Disdikbud Kabupaten Ngawi
 */
export const DAPODIK_SOP_DATABASE: SOPItem[] = [
  {
    id: "sop-001",
    category: "Inval/Sinkron",
    title: "Solusi Kendala Data Inval & Gagal Sinkronisasi Dapodik",
    keywords: [
      "inval",
      "invalid",
      "gagal sinkron",
      "sinkronisasi",
      "koneksi server",
      "kunci rombel",
      "validasi lokal",
      "periodik"
    ],
    content: `1. Penyebab Data Inval: Data periodik sarpras/rombongan belajar belum lengkap, jam mengajar PTK/Guru belum sesuai kurikulum atau melebihi batas maksimal, NISN/NIK belum valid di Pemadanan Dukcapil, atau anggota rombel belum memiliki wali kelas.
2. Langkah Penyelesaian Inval: Buka Modul Validasi -> Klik Validasi Lokal -> Cek tab Akademik, Sarpras, PTK, dan Peserta Didik -> Klik item bernotifikasi merah (Invalid) untuk memperbaiki data hingga berubah menjadi hijau (Valid).
3. Langkah Jika Gagal Sinkronisasi: Pastikan zona jam & tanggal komputer sinkron dengan internet, bersihkan Cache Browser (Ctrl + Shift + Del) atau gunakan Incognito Window, pastikan jaringan internet stabil, dan lakukan sinkronisasi di luar jam sibuk (misal pukul 21.00 - 05.00 WIB) jika server pusat overload.`
  },
  {
    id: "sop-002",
    category: "Peserta Didik",
    title: "Petunjuk Teknis Penginputan & Mutasi Peserta Didik Baru",
    keywords: [
      "siswa baru",
      "peserta didik",
      "mutasi siswa",
      "tarik pd",
      "nisn",
      "nik ganda",
      "pindah sekolah",
      "registrasi"
    ],
    content: `1. Siswa Baru TK/PAUD/SD/SMP: Gunakan fitur Tarik Peserta Didik melalui portal SP-Datadik (sp.datadik.kemdikbud.go.id) menggunakan akun SSO sekolah, masukkan NPSN sekolah asal dan NIK/NISN siswa, lalu lakukan sinkronisasi di aplikasi Dapodik lokal.
2. Siswa Keluar / Mutasi Keluar: Buka Aplikasi Dapodik -> Pilih Peserta Didik -> Klik Registrasi -> Isi kolom 'Keluar Karena' (Mutasi/Lulus/DO) beserta Tanggal Keluar -> Lakukan Sinkronisasi -> Cetak Surat Keterangan Pindah via SP-Datadik untuk disahkan Disdikbud Ngawi.
3. Kendala NIK Ganda / Terkunci: Koordinasikan dengan Wali Murid untuk melakukan pemadanan KTP/KK di Disdukcapil Ngawi, kemudian lakukan pembaruan data via portal VervalPD.`
  },
  {
    id: "sop-003",
    category: "Data PTK",
    title: "Perbaikan & Pembaruan Data PTK (Guru & Tenaga Kependidikan)",
    keywords: [
      "ptk",
      "guru",
      "nuptk",
      "tunjangan",
      "ijazah",
      "sertifikasi",
      "perbaikan nama ptk",
      "sk pengangkatan"
    ],
    content: `1. Perbaikan Identitas Utama PTK (Nama, NIK, Tempat/Tgl Lahir, Nama Ibu Kandung): Tidak dapat diubah langsung di aplikasi Dapodik lokal. Gunakan portal VervalPTK (vervalptk.data.kemdikbud.go.id) via akun SSO sekolah, upload scan KTP dan Ijazah Asli, lalu tunggu verifikasi dari Admin Disdikbud Ngawi.
2. Penambahan PTK Baru / Guru Honorer: Pengusulan PTK Baru diajukan ke Kantor Disdikbud Ngawi dengan membawa berkas SK Pengangkatan, Surat Pembagian Tugas Mengajar, KTP, KK, dan Ijazah Terakhir untuk diinputkan ke sistem SDM-PDSPK.`
  },
  {
    id: "sop-004",
    category: "Verval",
    title: "Alur Verifikasi dan Validasi VervalPD & VervalPTK",
    keywords: [
      "vervalpd",
      "vervalptk",
      "sso",
      "sdm pdspk",
      "residu",
      "pemadanan dukcapil",
      "ijazah"
    ],
    content: `1. Akses VervalPD (vervalpd.data.kemdikbud.go.id): Digunakan untuk merapikan residu NISN, perbaikan NIK, dan koordinat tempat tinggal siswa. Residu diselesaikan dengan mengunggah Akta Kelahiran/KK asli siswa.
2. Akses VervalPTK (vervalptk.data.kemdikbud.go.id): Digunakan untuk pengajuan NUPTK baru, penyesuaian kualifikasi ijazah, dan validasi NIK Guru.
3. Waktu Verifikasi Dinas: Tim Admin Dapodik Disdikbud Ngawi memproses verifikasi berkala pada hari kerja (Senin - Jumat, pukul 07.30 - 15.30 WIB).`
  },
  {
    id: "sop-005",
    category: "Kebudayaan",
    title: "Informasi Kebudayaan & Pelestarian Cagar Budaya Kabupaten Ngawi",
    keywords: [
      "kebudayaan",
      "cagar budaya",
      "benteng pendem",
      "benteng van den bosch",
      "museum trinil",
      "tari seni ngawi",
      "izin kegiatan"
    ],
    content: `1. Pelestarian Cagar Budaya: Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi memfasilitasi pendataan, pendaftaran cagar budaya (seperti Benteng Van Den Bosch/Pendem dan Situs Trinil), serta perizinan kegiatan kebudayaan.
2. Layanan Edukasi Kebudayaan: Disdikbud Ngawi mendukung kegiatan muatan lokal seni budaya Jawa, tari tradisional khas Ngawi, serta kunjungan edukasi cagar budaya bagi satuan pendidikan.`
  }
];

/**
 * Membaca isi teks dari file SOP.txt di akar proyek (Fallback ke database internal)
 */
export async function loadSopText(): Promise<string> {
  try {
    return await fs.readFile(SOP_FILE_PATH, "utf8");
  } catch (error) {
    console.warn("File SOP.txt tidak ditemukan di root proyek, menggunakan SOP Database internal.");
    return DAPODIK_SOP_DATABASE.map((s) => `${s.title}\n${s.content}`).join("\n\n");
  }
}

/**
 * Memuat dan mengonversi teks SOP menjadi array Dokumen LangChain
 */
export async function loadSopDocuments(): Promise<SopDocument[]> {
  const sopText = await loadSopText();
  return splitSopIntoSections(sopText).flatMap((section) => {
    return splitSectionIntoChunks(section).map((chunk) => {
      const metadata: SopMetadata = {
        source: "SOP.txt",
        sectionTitle: chunk.title,
        chunkId: chunk.id,
        part: chunk.part,
      };

      return new Document<SopMetadata>({
        id: chunk.id,
        pageContent: chunk.text,
        metadata,
      });
    });
  });
}

/**
 * Normalisasi string teks dari baris baru yang berlebihan
 */
export function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Memecah teks SOP menjadi Seksi-seksi berdasarkan Heading/Judul Utama
 */
function splitSopIntoSections(sopText: string): SopSection[] {
  const sections: SopSection[] = [];
  const lines = normalizeText(sopText).split("\n");
  let currentTitle = "SOP Layanan Dapodik Disdikbud Ngawi";
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

/**
 * Memeriksa apakah suatu baris merupakan judul/heading seksi utama
 */
function isTopLevelSopHeading(line: string): boolean {
  const match = line.match(/^(\d+)\.\s+(.+)$/);

  if (!match) {
    return false;
  }

  const title = match[2].trim();
  const letters = title.match(/[A-Za-z]/g) ?? [];
  const uppercaseLetters = title.match(/[A-Z]/g) ?? [];
  const uppercaseRatio = letters.length ? uppercaseLetters.length / letters.length : 0;

  return (
    title.startsWith("FAQ") ||
    title.startsWith("SOP") ||
    uppercaseRatio >= 0.75 ||
    /^[A-Z0-9 &/.-]+(?:\s+\([^)]+\))?$/.test(title)
  );
}

/**
 * Memecah satu Seksi menjadi beberapa Chunk berdasarkan batas karakter
 */
function splitSectionIntoChunks(section: SopSection): SopChunk[] {
  if (section.text.length <= CHUNK_MAX_CHARS) {
    return [
      {
        id: createChunkId(section.title, 1),
        title: section.title,
        text: section.text,
        part: 1,
      },
    ];
  }

  const paragraphs = section.text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: SopChunk[] = [];
  let current = section.title;
  let previousTail = "";

  for (const paragraph of paragraphs) {
    const candidate = `${current}\n\n${paragraph}`;

    if (candidate.length > CHUNK_MAX_CHARS && current !== section.title) {
      const part = chunks.length + 1;
      chunks.push({
        id: createChunkId(section.title, part),
        title: section.title,
        text: current,
        part,
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
    const part = chunks.length + 1;
    chunks.push({
      id: createChunkId(section.title, part),
      title: section.title,
      text: current,
      part,
    });
  }

  return chunks;
}

/**
 * Membuat Slug ID unik untuk setiap Chunk
 */
function createChunkId(title: string, part: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "sop-dapodik"}-${part}`;
}

/**
 * Fungsi pencarian SOP berbasis kata kunci/konten untuk injeksi cepat RAG
 */
export function searchSOP(query: string): string {
  const lowerQuery = query.toLowerCase();
  const matchedSOPs = DAPODIK_SOP_DATABASE.filter(
    (sop) =>
      sop.keywords.some((kw) => lowerQuery.includes(kw)) ||
      sop.title.toLowerCase().includes(lowerQuery) ||
      sop.content.toLowerCase().includes(lowerQuery)
  );

  if (matchedSOPs.length === 0) {
    return DAPODIK_SOP_DATABASE.map((s) => `${s.title}:\n${s.content}`).join("\n\n");
  }

  return matchedSOPs.map((s) => `${s.title}:\n${s.content}`).join("\n\n");
}