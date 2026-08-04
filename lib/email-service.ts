import nodemailer from "nodemailer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface TicketItem {
  timestamp: string;
  namaPelapor: string;
  asalSekolah: string;
  npsn: string;
  noWhatsapp: string;
  kategoriKendala: string;
  rincianKeluhan: string;
  ticketNumber?: string;
}

/**
 * 1. Generator Berkas PDF Transkrip Rekapitulasi Pengaduan
 */
export function generateComplaintsPDF(tickets: TicketItem[]): Buffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header Dokumen Resmi Disdikbud Ngawi
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 104, 55); // Warna Hijau #006837
  doc.text("DINAS PENDIDIKAN DAN KEBUDAYAAN KABUPATEN NGAWI", 14, 15);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("Laporan Transkrip Rekapitulasi Pengaduan Dapodik (SIPA-NGAWI)", 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString("id-ID")}`, 14, 27);
  doc.text(`Total Pengaduan: ${tickets.length} Tiket`, 14, 31);

  // Tabel Rekapitulasi Pengaduan
  const tableHead = [
    [
      "No Tiket",
      "Tanggal",
      "Pelapor",
      "Sekolah / NPSN",
      "No. WA",
      "Kategori",
      "Rincian Keluhan",
    ],
  ];

  const tableBody = tickets.map((t, idx) => [
    t.ticketNumber ? `#${t.ticketNumber}` : `#${idx + 1}`,
    t.timestamp ? new Date(t.timestamp).toLocaleDateString("id-ID") : "-",
    t.namaPelapor,
    `${t.asalSekolah}\n(${t.npsn})`,
    t.noWhatsapp,
    t.kategoriKendala,
    t.rincianKeluhan,
  ]);

  autoTable(doc, {
    startY: 36,
    head: tableHead,
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [0, 104, 55],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 28 },
      3: { cellWidth: 35 },
      4: { cellWidth: 28 },
      5: { cellWidth: 35 },
      6: { cellWidth: "auto" },
    },
  });

  // Convert PDF document to Buffer
  const pdfArrayBuffer = doc.output("arraybuffer");
  return Buffer.from(pdfArrayBuffer);
}

/**
 * 2. Fungsi Pengirim Email Batch PDF ke avidusfathcorp@gmail.com via Nodemailer (Gmail SMTP)
 */
export async function sendBatchReportEmail(
  tickets: TicketItem[],
  totalCount: number
) {
  const senderEmail = process.env.SMTP_EMAIL || "avidusfathcorp@gmail.com";
  const senderPass = process.env.SMTP_PASSWORD || "nzto qijf zbxj lqxs";
  const targetEmail = process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com";

  try {
    // 1. Inisialisasi Transporter Nodemailer (Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: senderEmail,
        pass: senderPass,
      },
    });

    // 2. Generate PDF Buffer secara otomatis
    const pdfBuffer = generateComplaintsPDF(tickets);

    // 3. Eksekusi Pengiriman Email beserta Lampiran PDF
    const info = await transporter.sendMail({
      from: `"SIPA-NGAWI System" <${senderEmail}>`,
      to: targetEmail,
      subject: `[REKAP 30 PENGADUAN] Transkrip Pengaduan Dapodik Disdikbud Ngawi - Tiket #${totalCount}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #006837; margin-bottom: 5px;">Laporan Rekapitulasi Pengaduan Official</h2>
          <p style="color: #666; font-size: 13px; margin-top: 0;">SIPA-NGAWI Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />
          
          <p>Halo Admin / Pengelola,</p>
          <p>Sistem telah mencatat akumulasi <strong>${tickets.length} data pengaduan baru</strong> (Total Keseluruhan: <strong>${totalCount} Tiket</strong>) dari para operator dan guru sekolah di Kabupaten Ngawi.</p>
          
          <div style="background-color: #f4fbf7; padding: 12px; border-left: 4px solid #006837; margin: 15px 0;">
            <strong>Lampiran Transkrip PDF:</strong><br />
            Berkas PDF transkrip resmi rekapitulasi data keluhan telah dibuat otomatis dan terlampir pada email ini.
          </div>

          <p style="font-size: 12px; color: #888; margin-top: 25px;">
            Email ini dikirim secara otomatis oleh Sistem Layanan Virtual SIPA-NGAWI.<br />
            Tujuan: <strong>${targetEmail}</strong>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Transkrip_Pengaduan_SIPA_NGAWI_${Date.now()}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log(
      `✉️ [SIPA-NGAWI] Email rekap PDF (${tickets.length} data) berhasil dikirim via Gmail SMTP ke ${targetEmail}. Message ID:`,
      info.messageId
    );
  } catch (error) {
    console.error("❌ Error sending Gmail SMTP email with PDF:", error);
  }
}