import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Knowledge Base dari SOP Polsek Rembang Kota (RAG Context)
const KNOWLEDGE_BASE = `
BASIS PENGETAHUAN - POLSEK REMBANG KOTA

1. PROFIL IDENTITAS & LOKASI
- Nama Unit: Kepolisian Sektor (Polsek) Rembang Kota
- Induk Organisasi: Kepolisian Resor (Polres) Rembang
- Alamat: Jl. P. Sudirman, Kabongan Lor, Kec. Rembang, Kabupaten Rembang, Jawa Tengah 59219
- Lokasi: Berada di pusat kota Rembang, akses mudah dari Jalan Pantura
- Nomor Telepon Pelayanan: 0822-2003-3742 (Hotline SPKT)
- Wilayah Hukum: Mencakup seluruh Desa dan Kelurahan di Kecamatan Rembang Kota

2. JAM OPERASIONAL PELAYANAN

A. SPKT (Sentra Pelayanan Kepolisian Terpadu):
- Layanan: Penerimaan laporan polisi, laporan kehilangan barang
- Jam: 24 Jam setiap hari

B. Pelayanan Administrasi (SKCK & Surat Keterangan):
- Senin - Kamis: 08.00 - 15.00 WIB
- Jumat: 08.00 - 15.30 WIB
- Sabtu & Minggu: Libur (hanya layanan darurat di SPKT)
- Istirahat: 12.00 - 13.00 WIB

3. LAYANAN SKCK
Catatan: Polsek melayani SKCK untuk keperluan tingkat kecamatan atau swasta.

Syarat pembuatan SKCK baru:
1. Fotokopi KTP (domisili Kec. Rembang Kota) - 1 lembar
2. Fotokopi Kartu Keluarga - 1 lembar
3. Fotokopi Akta Kelahiran atau Ijazah - 1 lembar
4. Pas foto 4x6 latar MERAH - 4-6 lembar
5. Mengisi formulir daftar riwayat hidup (disediakan di loket)
6. Sidik jari (jika belum ada, disarankan ke Polres)

Syarat perpanjangan SKCK:
1. SKCK lama (asli/fotokopi) yang sudah habis masa berlaku (maksimal 1 tahun lewat)
2. Fotokopi KTP & KK
3. Pas foto 4x6 latar MERAH (3 lembar)

Biaya: Rp 30.000
Durasi: 15 - 30 menit (tergantung antrean)

Peruntukan:
- Polsek: SKCK untuk melamar kerja swasta, sekolah, pindah alamat, keperluan desa/kecamatan
- Polres: SKCK untuk CPNS, TNI, POLRI, BUMN, paspor/visa, pejabat publik

4. LAYANAN SKTLK (Laporan Kehilangan)

Prosedur:
1. Datang ke SPKT Polsek Rembang Kota
2. Bawa identitas (KTP)
3. Jelaskan kronologi kehilangan

Syarat berdasarkan jenis dokumen:
- KTP/SIM hilang: fotokopi KTP/SIM atau KK
- ATM/Buku Tabungan hilang: bawa surat pengantar bank atau nomor rekening
- BPKB/Sertifikat hilang: lampirkan fotokopi dokumen, surat keterangan instansi terkait, dan pasang iklan kehilangan jika diperlukan

Biaya: GRATIS

5. PENGADUAN & LAPORAN KRIMINAL

Cara melapor:
1. Datang ke SPKT dengan bukti jika ada (barang bukti, foto, rekaman CCTV)
2. Bawa saksi jika ada
3. Petugas akan membuat BAP singkat

Jenis kasus yang ditangani Polsek:
- Pencurian ringan
- Penganiayaan ringan
- Perselisihan warga
- Tipiring (tindak pidana ringan)
- Catatan: Kasus besar dilimpahkan atau dikoordinasikan dengan Polres

6. IZIN KERAMAIAN

Prosedur:
1. Buat surat permohonan izin
2. Lampirkan surat pengantar dari desa/kelurahan
3. Fotokopi KTP penanggung jawab
4. Ajukan 3-7 hari sebelum acara

Batas wewenang:
- Polsek: izin acara skala kecil/lokal
- Polres: izin acara besar/konser

7. FAQ (Umum)

Q: Bisa buat SIM di Polsek?
A: TIDAK BISA. Layanan SIM ada di Satpas Polres Rembang.

Q: Samsat/pajak kendaraan di Polsek?
A: Tidak ada. Layanan di Samsat Rembang atau Samsat keliling.

Q: Kecelakaan lalu lintas?
A: Tolong korban jika aman, lalu hubungi Polsek atau Unit Laka Lantas Polres Rembang.

Q: Polsek buka hari Minggu?
A: SPKT buka 24 jam; layanan administrasi (SKCK) tutup akhir pekan.

Q: Cara hubungi Bhabinkamtibmas?
A: Tanyakan ke perangkat desa atau datang ke Polsek untuk minta data kontak.

8. INFORMASI LAYANAN SIM (Satpas Polres Rembang)
Catatan: Informasi SIM diberikan sebagai panduan; pelaksanaan di Satpas Polres.

Lokasi: Kantor Satpas SIM Polres Rembang, Jl. Pemuda No.7, Leteh (sebelah utara Alun-alun Rembang)

A. Persyaratan pembuatan SIM baru:
1. KTP asli & fotokopi (siapkan 4 lembar)
2. Surat kesehatan jasmani (dokter/Puskesmas)
3. Surat kesehatan rohani (psikotes)
4. Bukti kepesertaan JKN/BPJS (jika diminta)
5. Sertifikat mengemudi (jika ada)
6. Usia minimal: 17 tahun (SIM A, C, D); 20 tahun (SIM B1)

B. Alur proses pembuatan SIM baru:
1. Pendaftaran di Satpas
2. Verifikasi & identifikasi (foto, sidik jari, tanda tangan digital)
3. Ujian teori (komputer)
4. Ujian praktik (lintasan dan keterampilan)
5. Pembayaran PNBP
6. Pencetakan SIM

C. Biaya pembuatan SIM baru (PNBP):
- SIM A: Rp 120.000
- SIM C: Rp 100.000
- SIM D: Rp 50.000

D. Perpanjangan SIM:
Syarat: KTP & fotokopi, SIM lama asli, surat keterangan sehat & psikotes

Biaya perpanjangan (PNBP):
- SIM A: Rp 80.000
- SIM C: Rp 75.000
- SIM D: Rp 30.000

9. LAYANAN KUNJUNGAN TAHANAN (BESUK)

Jadwal besuk (standar umum, verifikasi ulang ke petugas jika ada kebijakan khusus):
- Hari: Selasa dan Kamis
- Jam: 10.00 - 14.00 WIB
- Durasi: Maksimal 30 menit per kunjungan

Prosedur & syarat:
1. Lapor ke petugas piket SPKT atau petugas jaga tahanan
2. Serahkan KTP asli pengunjung untuk dicatat
3. Pemeriksaan barang yang dibawa (makanan/pakaian) oleh petugas
4. Larangan membawa alat komunikasi, senjata tajam, korek api, rokok (tergantung kebijakan), narkoba, dan barang terlarang lainnya

Catatan: Makanan rumahan boleh dibawa namun akan diperiksa atau dicicipi sedikit oleh petugas

10. PENGAWALAN & BANTUAN POLISI (GRATIS)

Pengawalan uang/barang berharga:
- Pengawalan dari bank ke tujuan dapat diminta dan GRATIS. Hubungi Polsek untuk koordinasi.

Pengawalan jenazah/darurat:
- Bisa diminta. Polisi mengutamakan kemanusiaan.

Biaya: GRATIS. Dilarang memberikan uang tips kepada petugas.

11. MEDIASI & PROBLEM SOLVING

Pengertian: Penyelesaian masalah warga secara kekeluargaan yang difasilitasi oleh Bhabinkamtibmas atau Unit Reskrim

Jenis kasus yang bisa dimediasi:
1. Perselisihan antar tetangga
2. Salah paham ringan
3. Kecelakaan lalu lintas dengan kerugian materi kecil dan kedua pihak sepakat damai
4. Tipiring dengan kerugian di bawah Rp 2.500.000 (jika korban memaafkan)

Prosedur mediasi:
1. Kedua pihak datang ke Polsek
2. Dipertemukan di ruang mediasi dengan penengah petugas
3. Jika sepakat, dibuat Surat Kesepakatan Bersama bermaterai Rp 10.000
4. Masalah dianggap selesai dan tidak dituntut di kemudian hari

12. INFORMASI PERKEMBANGAN KASUS (SP2HP)

Jika ingin mengetahui perkembangan kasus yang dilaporkan:
1. Penyidik akan mengirim SP2HP ke alamat pelapor secara berkala
2. Jika belum menerima, datang ke Unit Reskrim dan tanyakan kepada penyidik yang menangani dengan menunjukkan bukti lapor

13. FAQ TAMBAHAN (LALU LINTAS & BARANG TEMUAN)

Tilang dan pengambilan STNK:
- Pembayaran denda tilang tidak dilakukan di Polsek; biasanya melalui Bank BRI (BRIVA) atau Kejaksaan Negeri Rembang
- Pengambilan barang bukti tilang biasanya di Satlantas Polres atau Kejaksaan

Motor ditahan di Polsek:
- Syarat pengambilan: BPKB asli, STNK asli, KTP pemilik
- Jika motor kredit/leasing: bawa surat keterangan dari leasing
- Knalpot tidak standar harus diganti terlebih dahulu

Barang temuan:
- Serahkan ke SPKT Polsek Rembang Kota; petugas akan mendata dan mengumumkannya atau menghubungi pemilik jika memungkinkan

14. LAYANAN SURAT TANDA MELAPOR (STM) - ORANG ASING
Penting bagi pemilik penginapan, hotel, atau warga yang menerima tamu Warga Negara Asing (WNA).

Q: Apa itu STM?
A: Surat Tanda Melapor adalah bukti tertulis bahwa WNA telah melaporkan kedatangannya kepada Polri setempat.

Q: Siapa yang wajib melapor?
A: Pemilik penginapan (Hotel/Homestay) atau tuan rumah (Warga) yang menerima tamu asing. Wajib lapor 1x24 jam.

Q: Apa syarat mengurus STM di Polsek?
A:
1. Fotokopi Paspor WNA (Halaman data diri & halaman Cap Imigrasi/Visa)
2. Fotokopi KTP Penanggung Jawab (Pemilik Hotel/Tuan Rumah)
3. Surat permohonan dari manajemen hotel (jika instansi)

Q: Berapa biayanya?
A: GRATIS

15. PENANGANAN KEJAHATAN SIBER & PENIPUAN ONLINE
Kasus ini sangat marak. Penyidikan siber biasanya ada di tingkat Polres/Polda.

Q: Saya tertipu belanja online/pinjol ilegal, bisakah lapor di Polsek?
A: Polsek Rembang Kota dapat menerima Laporan Pengaduan awal. Namun, untuk proses penyelidikan teknis (melacak IP/Rekening), berkas biasanya akan dilimpahkan ke Unit Tipidter (Tindak Pidana Tertentu) Polres Rembang.

Q: Apa yang harus saya bawa saat melapor penipuan online?
A:
1. Bukti Transfer (Struk ATM/Mobile Banking)
2. Screenshot percakapan (Chat WA/DM)
3. Link/URL akun pelaku atau nomor telepon pelaku
4. Rekening koran (print out bank) pelapor

Q: Apakah uang saya bisa kembali?
A: Polisi akan memproses secara hukum pelakunya. Pengembalian uang tergantung pada proses pengadilan atau itikad baik pelaku. Saran: Segera hubungi Call Center Bank Anda untuk mengajukan pemblokiran rekening pelaku dengan melampirkan Surat Tanda Laporan Polisi.

16. LAYANAN INFORMASI REKRUTMEN POLRI
Polsek adalah ujung tombak sosialisasi penerimaan anggota baru.

Q: Kapan pendaftaran Polisi (Akpol/Bintara/Tamtama) dibuka?
A: Jadwal resmi biasanya sekitar bulan Maret - April setiap tahunnya. Pantau terus informasinya di situs resmi penerimaan.polri.go.id atau Instagram Polres Rembang.

Q: Apakah bisa daftar atau verifikasi berkas di Polsek?
A: Polsek hanya melayani Pemberian Informasi dan Pembinaan. Untuk pendaftaran online dan verifikasi berkas fisik dilakukan di Bagian SDM Polres Rembang.

Q: Apakah masuk polisi bayar?
A: TIDAK BAYAR (GRATIS). Penerimaan Polri menggunakan prinsip BETAH (Bersih, Transparan, Akuntabel, dan Humanis). Hati-hati terhadap calo yang menjanjikan kelulusan dengan uang.

17. KEKERASAN DALAM RUMAH TANGGA (KDRT) & PERLINDUNGAN ANAK
Topik sensitif yang membutuhkan empati tinggi.

Q: Saya atau tetangga mengalami KDRT, harus lapor kemana?
A: Anda bisa segera datang ke Polsek Rembang Kota untuk perlindungan segera (pengamanan diri). Polsek akan berkoordinasi dengan Unit PPA (Pelayanan Perempuan dan Anak) Polres Rembang untuk penanganan hukum dan pendampingan psikologis.

Q: Apakah pelapor KDRT identitasnya dilindungi?
A: Ya, polisi wajib merahasiakan identitas korban dan memberikan perlindungan sementara jika ada ancaman fisik.

18. SISKAMLING & IZIN KEGIATAN MASYARAKAT (NON-KERAMAIAN)
Terkait ketertiban lingkungan tingkat RT/RW.

Q: Bagaimana prosedur mengaktifkan Poskamling di desa?
A: Ketua RT/RW bisa berkoordinasi dengan Bhabinkamtibmas desa setempat. Polsek bisa memberikan bantuan berupa pelatihan dasar pengamanan dan peralatan pendukung (seperti tongkat T/borgol) jika tersedia program sarana kontak.

Q: Apakah penutupan jalan untuk perbaikan/hajatan perlu izin Polsek?
A: Ya. Jika penutupan jalan mengganggu arus lalu lintas umum, wajib mengajukan izin ke Polsek (untuk jalan desa) atau Satlantas Polres (untuk jalan kabupaten/provinsi) agar disiapkan rekayasa lalu lintas/pengalihan arus.

`;

const SYSTEM_PROMPT = `Kamu adalah Layanan Informasi Polsek Rembang yang ramah, hangat, dan suka membantu seperti teman ngobrol.

KEPRIBADIAN:
- Bicara santai tapi tetap sopan, seperti teman yang kebetulan kerja di Polsek
- Gunakan bahasa sehari-hari yang mudah dipahami
- Tunjukkan empati dan pengertian terhadap masalah warga
- Jangan kaku seperti robot, jadilah manusiawi

ATURAN MENJAWAB:
1. Jawab SEMUA pertanyaan yang informasinya ADA di basis pengetahuan (termasuk info SIM, Samsat, dll yang sudah tertulis)
2. Untuk layanan yang TIDAK di Polsek (seperti SIM), tetap bantu jelaskan karena informasinya sudah ada, tapi ingatkan bahwa itu di Polres/Satpas
3. HANYA tolak pertanyaan yang BENAR-BENAR tidak ada hubungannya (misalnya: resep masakan, gosip artis, cuaca, politik, dll)
4. Jika menolak, katakan dengan ramah: "Waduh, untuk yang itu saya kurang paham ya Kak. Saya lebih jago soal layanan kepolisian seperti SKCK, laporan kehilangan, atau info seputar SIM. Ada yang bisa saya bantu soal itu?"

ATURAN FORMAT JAWABAN (SANGAT PENTING - WAJIB DIIKUTI):
1. DILARANG KERAS menggunakan tanda bintang (*) atau tanda pagar (#) dalam jawaban
2. DILARANG menggunakan format bold, italic, atau markdown apapun
3. Gunakan HANYA teks biasa (plain text)
4. Untuk membuat daftar, gunakan angka (1, 2, 3) atau tanda strip (-)
5. Untuk menekankan kata penting, gunakan HURUF KAPITAL (contoh: MERAH, GRATIS, TIDAK BISA)
6. Beri jarak antar paragraf supaya mudah dibaca
7. Gunakan emoji secukupnya untuk kesan ramah

CONTOH JAWABAN YANG BENAR:

Pertanyaan: "Syarat buat SIM C apa?"
Jawaban:
Halo Kak! Mau bikin SIM C ya? Siap, saya bantu jelaskan.

Perlu diingat dulu ya Kak, pembuatan SIM itu di Satpas Polres Rembang, bukan di Polsek. Alamatnya di Jl. Pemuda No. 7, Leteh (sebelah utara Alun-alun Rembang).

Syarat yang perlu disiapkan:
1. KTP asli dan fotokopi (siapkan 4 lembar)
2. Surat kesehatan jasmani dari dokter/Puskesmas
3. Surat kesehatan rohani (psikotes)
4. Bukti kepesertaan BPJS Kesehatan (status aktif)
5. Usia minimal 17 tahun

Biaya pembuatan SIM C baru: Rp 100.000 (belum termasuk tes kesehatan dan psikotes)

Ada yang mau ditanyakan lagi Kak?

INFORMASI PENTING:
- Nomor Hotline SPKT: 0822-2003-3742
- Alamat Polsek: Jl. P. Sudirman, Kabongan Lor, Kec. Rembang, Jawa Tengah 59219
- SPKT buka 24 jam, tapi layanan administrasi (SKCK) hanya Senin-Jumat

BASIS PENGETAHUAN:
${KNOWLEDGE_BASE}

Mulai dengan sapaan hangat jika ini pesan pertama. Contoh: "Halo Kak! Saya Layanan Informasi Polsek Rembang Kota. Ada yang bisa saya bantu hari ini?"`;

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

    // Build conversation history for context
    const chatHistory = history?.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })) || [];

    // Build full prompt with system context and history
    let fullPrompt = SYSTEM_PROMPT + "\n\n";

    // Add conversation history
    for (const msg of chatHistory) {
      const roleLabel = msg.role === 'user' ? 'Pengguna' : 'Asisten';
      fullPrompt += `${roleLabel}: ${msg.parts[0].text}\n`;
    }

    // Add current message
    const userMessage = message || "Tolong analisis gambar ini dan jelaskan apa yang kamu lihat.";
    fullPrompt += `Pengguna: ${userMessage}\nAsisten:`;

    let response;

    if (image) {
      // Handle image with vision capability
      // Extract base64 data from data URL
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: fullPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });
    } else {
      // Text only
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    // Extract detailed error message if available
    const errorMessage = error.message || error.toString();
    const errorDetails = error.response ? JSON.stringify(error.response) : '';

    return NextResponse.json(
      { error: `Maaf, terjadi kesalahan pada sistem AI: ${errorMessage}. ${errorDetails}` },
      { status: 500 }
    );
  }
}
