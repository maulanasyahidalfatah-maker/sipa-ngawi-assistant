"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  X,
  Eye,
  RefreshCw,
  Inbox,
  Trash2,
  LogOut,
  Image as ImageIcon,
  Calendar,
  BarChart3,
  Mail,
  Save,
  Check,
  Printer,
  Download,
  Send,
  AlertTriangle,
  Info,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AdminTicket {
  id: string;
  namaPelapor: string;
  nikPelapor?: string;
  noWhatsapp: string;
  asalSekolah: string;
  npsn: string;
  kategori: string;
  rincian: string;
  fotoKeluhan?: string;
  status: "PENDING" | "RESOLVED";
  buktiPerbaikan?: string;
  createdAt?: string;
  numericOrder?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "resolved">("semua");
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // State Banner Notifikasi Inline (Menempel langsung di atas tabel)
  const [inlineNotice, setInlineNotice] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  // State Modal Konfirmasi Reset
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // State Modal Transkrip Rekapitulasi
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

  // State Audit Pengarsipan
  const [hasDownloadedPDF, setHasDownloadedPDF] = useState(false);
  const [hasSentEmailToDinas, setHasSentEmailToDinas] = useState(false);

  // State Filter Rentang Tanggal
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State Konfigurasi Email Dinas
  const [targetEmail, setTargetEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  // State Modal Verifikasi Admin
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [proofFile, setAdminProofFile] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // State Modal Preview Gambar
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const showInlineNotice = (type: "success" | "warning" | "error", text: string) => {
    setInlineNotice({ type, text });
    setTimeout(() => {
      setInlineNotice(null);
    }, 6000);
  };

  const sanitizeAndSortTickets = (rawTickets: any[]): AdminTicket[] => {
    const parsed = rawTickets.map((item, idx) => {
      let rawNum = idx + 1;
      if (item.id && typeof item.id === "string") {
        const match = item.id.match(/\d+/);
        if (match) rawNum = parseInt(match[0], 10);
      } else if (item.ticketNumber) {
        const match = String(item.ticketNumber).match(/\d+/);
        if (match) rawNum = parseInt(match[0], 10);
      }

      const formattedId = `TK-${rawNum < 10 ? `00${rawNum}` : rawNum < 100 ? `0${rawNum}` : rawNum}`;

      return {
        id: item.id && item.id.startsWith("TK-") ? item.id : formattedId,
        namaPelapor: item.namaPelapor || item.nama || "-",
        nikPelapor: item.nikPelapor || item.nik || "-",
        noWhatsapp: item.noWhatsapp || item.wa || "-",
        asalSekolah: item.asalSekolah || item.sekolah || "-",
        npsn: item.npsn || "-",
        kategori: item.kategori || item.kategoriKendala || "-",
        rincian: item.rincian || item.rincianKeluhan || "-",
        fotoKeluhan: item.fotoKeluhan || item.lampiran || undefined,
        status: (item.status === "SELESAI" || item.status === "RESOLVED" ? "RESOLVED" : "PENDING") as "PENDING" | "RESOLVED",
        buktiPerbaikan: item.buktiPerbaikan || undefined,
        createdAt: item.createdAt || new Date().toLocaleDateString("id-ID"),
        numericOrder: rawNum,
      };
    });

    return parsed.sort((a, b) => (a.numericOrder || 0) - (b.numericOrder || 0));
  };

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setTickets(sanitizeAndSortTickets(result.data));
        }
      }
    } catch (e) {
      console.error("Gagal terhubung ke server:", e);
    }
    setIsLoading(false);
  };

  const loadEmailConfig = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_admin_config" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.targetEmail) {
          setTargetEmail(data.targetEmail);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat email dinas:", err);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDev = process.env.NODE_ENV === "development";
      let sessionRaw = localStorage.getItem("sipa_user_session");

      if (!sessionRaw && isDev) {
        const devSession = { role: "ADMIN", nama: "Developer Utama", email: "MAULANA-DEV@SIPA.COM" };
        localStorage.setItem("sipa_user_session", JSON.stringify(devSession));
        sessionRaw = JSON.stringify(devSession);
      }

      if (!sessionRaw) {
        router.push("/login");
        return;
      }
    }

    loadTickets();
    loadEmailConfig();
  }, [router]);

  const handleSaveEmailConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetEmail || !targetEmail.includes("@")) {
      showInlineNotice("warning", "Harap masukkan format email dinas yang valid!");
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_admin_config",
          email: targetEmail,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailSaved(true);
        showInlineNotice("success", `Alamat email dinas berhasil diperbarui ke: ${targetEmail}`);
        setTimeout(() => setEmailSaved(false), 3000);
      } else {
        showInlineNotice("error", data.error || "Gagal menyimpan email dinas.");
      }
    } catch (err) {
      showInlineNotice("error", "Terjadi kendala koneksi saat menyimpan email dinas.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sipa_user_session");
      document.cookie = "sipa_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    router.push("/login");
  };

  const getBatchResolvedTickets = (): AdminTicket[] => {
    return tickets.filter((t) => t.status === "RESOLVED").slice(0, 30);
  };

  const buildLandscapeReportPDF = () => {
    const batchTickets = getBatchResolvedTickets();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(0, 104, 55);
    doc.rect(8, 8, pageWidth - 16, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Transkrip Rekapitulasi Tiket Pengaduan", pageWidth / 2, 16, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("Menampilkan maksimal 30 data pengaduan terbaru yang masuk ke dalam sistem SIPA-NGAWI.", pageWidth / 2, 22, { align: "center" });
    doc.setFontSize(7.5);
    doc.text(`TANGGAL CETAK: ${new Date().toLocaleString("id-ID")} | DISPOSISI DINAS: ${targetEmail || "avidusfathcorp@gmail.com"}`, pageWidth / 2, 28, { align: "center" });

    const tableHead = [
      ["NO", "ID TIKET", "PELAPOR & SEKOLAH", "KATEGORI KENDALA", "RINCIAN KELUHAN", "FOTO KELUHAN", "STATUS", "BUKTI DINAS"]
    ];

    const tableBody = batchTickets.map((t, idx) => [
      idx + 1,
      `${t.id}\n${t.createdAt || "-"}`,
      `${t.namaPelapor}\nNIK: ${t.nikPelapor || "-"}\nWA: ${t.noWhatsapp}\n\n${t.asalSekolah}\nNPSN: ${t.npsn}`,
      t.kategori,
      t.rincian,
      "",
      "SUDAH DIBENAHI",
      "",
    ]);

    autoTable(doc, {
      startY: 36,
      margin: { left: 8, right: 8 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [0, 104, 55],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
        valign: "middle",
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        valign: "middle",
        overflow: "linebreak",
        minCellHeight: 28,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 20, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 46, valign: "top" },
        3: { cellWidth: 36, valign: "top" },
        4: { cellWidth: 60, valign: "top" },
        5: { cellWidth: 42, halign: "center" },
        6: { cellWidth: 25, halign: "center" },
        7: { cellWidth: 42, halign: "center" },
      },
      didDrawCell: (data) => {
        const imgWidth = 36;
        const imgHeight = 23;

        if (data.section === "body" && data.column.index === 5) {
          const ticket = batchTickets[data.row.index];
          if (ticket && ticket.fotoKeluhan && ticket.fotoKeluhan.startsWith("data:image")) {
            try {
              const posX = data.cell.x + (data.cell.width - imgWidth) / 2;
              const posY = data.cell.y + (data.cell.height - imgHeight) / 2;
              doc.addImage(ticket.fotoKeluhan, "JPEG", posX, posY, imgWidth, imgHeight);
            } catch {
              doc.setFontSize(6.5);
              doc.setTextColor(150, 150, 150);
              doc.text("[Gagal Muat Foto]", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
            }
          } else {
            doc.setFontSize(6.5);
            doc.setTextColor(140, 140, 140);
            doc.text("Tanpa Foto", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          }
        }

        if (data.section === "body" && data.column.index === 7) {
          const ticket = batchTickets[data.row.index];
          if (ticket && ticket.buktiPerbaikan && ticket.buktiPerbaikan.startsWith("data:image")) {
            try {
              const posX = data.cell.x + (data.cell.width - imgWidth) / 2;
              const posY = data.cell.y + (data.cell.height - imgHeight) / 2;
              doc.addImage(ticket.buktiPerbaikan, "JPEG", posX, posY, imgWidth, imgHeight);
            } catch {
              doc.setFontSize(6.5);
              doc.setTextColor(150, 150, 150);
              doc.text("[Gagal Muat Bukti]", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
            }
          } else {
            doc.setFontSize(6.5);
            doc.setTextColor(140, 140, 140);
            doc.text("Terverifikasi", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          }
        }
      },
      rowPageBreak: "avoid",
    });

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY > 155) {
      doc.addPage();
      finalY = 20;
    }

    const colLeft = 50;
    const colRight = pageWidth - 65;

    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.setFont("helvetica", "normal");
    doc.text("Mengetahui,", colLeft, finalY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("Kepala Dinas Pendidikan dan Kebudayaan", colLeft, finalY + 5, { align: "center" });
    doc.text("Kabupaten Ngawi", colLeft, finalY + 9, { align: "center" });

    doc.text("KABUL TUNGGUL WINARNO, S.IP.", colLeft, finalY + 28, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Pembina Utama Muda", colLeft, finalY + 32, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.text(`Ngawi, ${new Date().toLocaleDateString("id-ID")}`, colRight, finalY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("Petugas Admin Verifikator Dapodik", colRight, finalY + 5, { align: "center" });
    doc.text("SIPA-NGAWI", colRight, finalY + 9, { align: "center" });

    doc.text("TIM TEKNIS IT DAPODIK", colRight, finalY + 28, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Disdikbud Kabupaten Ngawi", colRight, finalY + 32, { align: "center" });

    return doc;
  };

  const handleDownloadPDF = () => {
    const batch = getBatchResolvedTickets();
    if (batch.length === 0) {
      showInlineNotice("warning", "Belum ada tiket berstatus 'SUDAH DIBENAHI' untuk diunduh!");
      return;
    }

    setIsExportingPDF(true);
    try {
      const doc = buildLandscapeReportPDF();
      doc.save(`Transkrip_Rekapitulasi_Tiket_${batch.length}_Data_${new Date().toISOString().slice(0, 10)}.pdf`);
      setHasDownloadedPDF(true);
      showInlineNotice("success", `Berkas transkrip rekapitulasi (${batch.length} data) berhasil diunduh ke komputer.`);
    } catch (err) {
      showInlineNotice("error", "Gagal membuat dokumen PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrintPDF = () => {
    const batch = getBatchResolvedTickets();
    if (batch.length === 0) {
      showInlineNotice("warning", "Belum ada tiket berstatus 'SUDAH DIBENAHI' untuk dicetak!");
      return;
    }
    const doc = buildLandscapeReportPDF();
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const handleSendReportEmail = async () => {
    const batch = getBatchResolvedTickets();
    if (batch.length === 0) {
      showInlineNotice("warning", "Belum ada tiket berstatus 'SUDAH DIBENAHI' untuk dikirim ke email!");
      return;
    }

    const recipient = targetEmail || "avidusfathcorp@gmail.com";
    setIsSendingEmail(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email_transcript",
          targetEmail: recipient,
          dataRekap: batch,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasSentEmailToDinas(true);
        showInlineNotice("success", `Berhasil mengirimkan berkas rekapitulasi pengaduan ke ${recipient}!`);
      } else {
        throw new Error(data.error || "Gagal mengirim email.");
      }
    } catch (err: any) {
      showInlineNotice("error", err.message || "Gagal menghubungi server email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleInitiateReset = () => {
    const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED");

    if (resolvedTickets.length < 30) {
      showInlineNotice(
        "warning",
        `Reset ditolak! Saat ini baru ada ${resolvedTickets.length} aduan yang berstatus SUDAH DIBENAHI. Kuota reset wajib minimal 30 aduan selesai.`
      );
      return;
    }

    if (!hasSentEmailToDinas) {
      showInlineNotice(
        "warning",
        "Syarat belum lengkap! Laporan 30 tiket selesai harus dikirim ke email dinas terlebih dahulu via tombol 'Kirim PDF'."
      );
      return;
    }

    if (!hasDownloadedPDF) {
      showInlineNotice(
        "warning",
        "Syarat belum lengkap! Laporan 30 tiket selesai harus diunduh terlebih dahulu via tombol 'Unduh Transkrip PDF'."
      );
      return;
    }

    setShowResetConfirmModal(true);
  };

  const executeResetBatch = async () => {
    setShowResetConfirmModal(false);
    setIsLoading(true);

    const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED");
    const allPendingTickets = tickets.filter((t) => t.status === "PENDING");

    const remainingResolved = resolvedTickets.slice(30);
    const updatedTicketList = [...allPendingTickets, ...remainingResolved];

    setTickets(sanitizeAndSortTickets(updatedTicketList));

    if (typeof window !== "undefined") {
      localStorage.setItem("sipa_rekap_pengaduan_backup", JSON.stringify(updatedTicketList));
      localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updatedTicketList));
      localStorage.setItem("sipa_ngawi_tickets", JSON.stringify(updatedTicketList));
      localStorage.setItem("sipa_pengaduan_list", JSON.stringify(updatedTicketList));
    }

    try {
      await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replaceAllWith: updatedTicketList }),
      }).catch(() => {});
    } catch (e) {
      console.error("Gagal sinkronisasi data:", e);
    }

    setHasDownloadedPDF(false);
    setHasSentEmailToDinas(false);
    setIsLoading(false);

    showInlineNotice(
      "success",
      `Berhasil! Tepat 30 aduan selesai telah diarsipkan. ${allPendingTickets.length} aduan yang berstatus pending tetap aman tersimpan.`
    );
  };

  const handleAdminVerify = async (fileBase64: string) => {
    if (!selectedTicket) return;
    setIsSubmittingProof(true);

    const updated = tickets.map((t) => (t.id === selectedTicket.id ? { ...t, status: "RESOLVED" as const, buktiPerbaikan: fileBase64 } : t));
    setTickets(sanitizeAndSortTickets(updated));

    try {
      await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTicket.id, status: "RESOLVED", buktiPerbaikan: fileBase64 }),
      });
    } catch (e) {
      console.error(e);
    }

    const waMsg = encodeURIComponent(
      `Halo Bapak/Ibu ${selectedTicket.namaPelapor},\n\nPengaduan Anda untuk *${selectedTicket.asalSekolah} (${selectedTicket.npsn})* telah *SELESAI DITINDAKLANJUTI* oleh Admin Disdikbud Ngawi.`
    );
    window.open(`https://wa.me/${selectedTicket.noWhatsapp}?text=${waMsg}`, "_blank");

    setIsSubmittingProof(false);
    setSelectedTicket(null);
    setAdminProofFile(null);
    showInlineNotice("success", `Tiket ${selectedTicket.id} berhasil diselesaikan.`);
  };

  const filteredTickets = tickets.filter((item) => {
    if (filterStatus === "pending" && item.status !== "PENDING") return false;
    if (filterStatus === "resolved" && item.status !== "RESOLVED") return false;

    if (startDate || endDate) {
      if (!item.createdAt) return false;

      let ticketDate: Date;
      if (item.createdAt.includes("/")) {
        const [day, month, year] = item.createdAt.split("/").map(Number);
        ticketDate = new Date(year, month - 1, day);
      } else {
        ticketDate = new Date(item.createdAt);
      }

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (ticketDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (ticketDate > end) return false;
      }
    }

    return true;
  });

  const totalTickets = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === "PENDING").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const batchReadyCount = Math.min(resolvedCount, 30);
  const transcriptPreviewTickets = tickets.slice(0, 30);

  return (
    <div className="w-full h-screen overflow-y-auto bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto pb-16">
        
        {/* HEADER AREA */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          
          {/* POJOK KIRI */}
          <div className="flex flex-col items-start gap-2.5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard Admin SIPA-NGAWI
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Panel Pengelolaan &amp; Verifikasi Pengaduan Data Dapodik Disdikbud Kab. Ngawi
              </p>
            </div>

            <form onSubmit={handleSaveEmailConfig} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-xs w-full sm:w-auto">
              <Mail className="w-3.5 h-3.5 text-[#006837] shrink-0" />
              <input
                type="email"
                required
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="Email Tujuan Rekap Dinas..."
                className="text-xs text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none w-56 sm:w-64"
                title="Alamat email dinas penerima berkas rekapitulasi"
              />
              <button
                type="submit"
                disabled={isSavingEmail}
                className="flex items-center gap-1 bg-[#006837] hover:bg-[#00522c] text-white px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 shrink-0"
              >
                {isSavingEmail ? (
                  "..."
                ) : emailSaved ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>Tersimpan</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SISI KANAN: BARIS TOMBOL AKSI UTAMA */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setIsTranscriptModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#006837] hover:bg-[#00522c] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Buka Form Transkrip Rekapitulasi Tiket Pengaduan"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{hasDownloadedPDF ? "Transkrip Terunduh ✓" : `Unduh Transkrip PDF (${batchReadyCount})`}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              disabled={resolvedCount === 0}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
              title="Cetak Laporan PDF Langsung"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              onClick={handleSendReportEmail}
              disabled={isSendingEmail || resolvedCount === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              title="Kirim Laporan ke Email Dinas"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingEmail ? "Mengirim..." : hasSentEmailToDinas ? "Email Terkirim ✓" : "Kirim PDF"}</span>
            </button>

            <button
              type="button"
              onClick={loadTickets}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#006837]" : ""}`} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              onClick={handleInitiateReset}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors shadow-xs ${
                resolvedCount >= 30
                  ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              }`}
              title={resolvedCount < 30 ? `Wajib 30 aduan selesai untuk reset (Saat ini: ${resolvedCount}/30)` : "Reset kloter 30 data selesai"}
            >
              {resolvedCount < 30 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Reset ({resolvedCount}/30)</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* WIDGET STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Pengaduan Masuk</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalTickets}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600">Belum Dibenahi (Pending)</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600">Sudah Dibenahi (Resolved)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* BARIS FILTER */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus("semua")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "semua" ? "bg-[#006837] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua ({totalTickets})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "pending" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("resolved")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "resolved" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium">Tanggal:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#006837]"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-[#006837]"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-red-600 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Reset Tanggal
              </button>
            )}
          </div>
        </div>

        {/* BANNER NOTIFIKASI ELEGAN INLINE (PERSIS DI ATAS TABEL) */}
        {inlineNotice && (
          <div
            className={`mb-4 p-3 border rounded-xl text-xs flex items-center justify-between shadow-xs transition-all ${
              inlineNotice.type === "success"
                ? "bg-green-100 border-green-300 text-green-800"
                : inlineNotice.type === "warning"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {inlineNotice.type === "success" ? (
                <div className="w-5 h-5 rounded-full bg-green-200 text-green-700 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}
              <span className="font-medium">{inlineNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setInlineNotice(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TABEL UTAMA DASHBOARD ADMIN (FIFO) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="p-3.5 whitespace-nowrap w-12 text-center">NO</th>
                  <th className="p-3.5 whitespace-nowrap">ID TIKET</th>
                  <th className="p-3.5 whitespace-nowrap">PELAPOR, NIK &amp; WA</th>
                  <th className="p-3.5 whitespace-nowrap">SEKOLAH / NPSN</th>
                  <th className="p-3.5 whitespace-nowrap">KATEGORI, RINCIAN &amp; FOTO KELUHAN</th>
                  <th className="p-3.5 whitespace-nowrap">STATUS</th>
                  <th className="p-3.5 whitespace-nowrap text-center">AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Inbox className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600 text-sm">Belum Ada Data Pengaduan Masuk</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket, index) => (
                    <tr key={`${ticket.id}-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400 whitespace-nowrap">
                        {index + 1}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {ticket.id}
                        <div className="text-[10px] text-slate-400 font-normal">{ticket.createdAt}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ticket.namaPelapor}</div>
                        <div className="text-slate-500 font-mono text-[11px]">NIK: {ticket.nikPelapor || "-"}</div>
                        <div className="text-slate-400 font-mono text-[11px]">WA: {ticket.noWhatsapp}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ticket.asalSekolah}</div>
                        <div className="text-slate-400 font-mono text-[11px]">NPSN: {ticket.npsn}</div>
                      </td>

                      <td className="p-3.5 min-w-[300px]">
                        <div className="font-semibold text-[#006837] mb-0.5">{ticket.kategori}</div>
                        <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px] mb-2">
                          {ticket.rincian}
                        </div>
                        {ticket.fotoKeluhan ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: ticket.fotoKeluhan!,
                                title: `Foto Kendala Pelapor (${ticket.asalSekolah})`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006837] font-semibold text-[10px] border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" /> Lihat Foto Keluhan Pelapor
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tanpa lampiran foto</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {ticket.status === "RESOLVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SUDAH DIBENAHI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> BELUM DIBENAHI
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-center">
                        {ticket.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-3 py-1.5 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs font-semibold cursor-pointer mx-auto shadow-xs"
                          >
                            Unggah Bukti &amp; Selesaikan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: ticket.buktiPerbaikan || "",
                                title: `Bukti Hasil Perbaikan Dinas (${ticket.asalSekolah})`,
                              })
                            }
                            className="text-[#006837] hover:underline font-semibold text-xs flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Lihat Bukti Dinas
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL FORM TRANSKRIP REKAPITULASI */}
      {isTranscriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-slate-200 p-5 sm:p-7 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setIsTranscriptModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-[#006837]">
                <FileText className="w-5 h-5" />
                <h2 className="text-xl font-bold tracking-tight">Transkrip Rekapitulasi Tiket Pengaduan</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Menampilkan maksimal <strong>30 data pengaduan terbaru</strong> yang masuk ke dalam sistem SIPA-NGAWI.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl mb-4 bg-slate-50/40">
              {transcriptPreviewTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm italic">
                  Belum ada data pengaduan yang tercatat di dalam sistem.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-[#006837] text-white font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Pelapor</th>
                      <th className="p-3">Sekolah / NPSN</th>
                      <th className="p-3">No. WA</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Rincian Keluhan</th>
                      <th className="p-3 text-center">Foto Keluhan</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi Dinas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {transcriptPreviewTickets.map((item, idx) => (
                      <tr key={`transkrip-${idx}`} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="p-3 font-bold text-slate-400 text-center">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{item.namaPelapor}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{item.asalSekolah}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NPSN: {item.npsn}</div>
                        </td>
                        <td className="p-3 font-mono whitespace-nowrap">{item.noWhatsapp}</td>
                        <td className="p-3 font-medium text-[#006837] whitespace-nowrap">{item.kategori}</td>
                        <td className="p-3 text-slate-600 max-w-[220px] truncate" title={item.rincian}>
                          {item.rincian}
                        </td>
                        
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.fotoKeluhan ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.fotoKeluhan!,
                                  title: `Foto Kendala Pelapor (${item.asalSekolah})`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006837] font-semibold text-[11px] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat Foto</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Tanpa Foto</span>
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {item.status === "RESOLVED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SELESAI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          {item.status === "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setIsTranscriptModalOpen(false);
                                setSelectedTicket(item);
                              }}
                              className="px-2.5 py-1 bg-[#006837] hover:bg-[#00522c] text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-xs"
                            >
                              Verifikasi
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.buktiPerbaikan || "",
                                  title: `Bukti Hasil Perbaikan Dinas (${item.asalSekolah})`,
                                })
                              }
                              className="text-[#006837] hover:underline font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> Bukti Dinas
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isExportingPDF || resolvedCount === 0}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPDF}
                disabled={resolvedCount === 0}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTranscriptModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG KONFIRMASI RESET */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Arsipkan Kloter</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Sistem akan mengarsipkan <strong>tepat 30 pengaduan</strong> yang telah berstatus <strong>SUDAH DIBENAHI</strong>.
            </p>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{pendingCount} Tiket PENDING tetap aman dan tidak terhapus.</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Info className="w-3.5 h-3.5" />
                <span>Sisa tiket selesai ({resolvedCount - 30}) tetap disimpan untuk kloter berikutnya.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeResetBatch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Ya, Arsipkan 30 Data Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UNGGAH BUKTI PERBAIKAN ADMIN */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative border border-slate-100 shadow-xl">
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Selesaikan Tiket {selectedTicket.id}</h3>
            <p className="text-xs text-slate-500 mb-4">Unggah bukti perbaikan untuk sekolah <strong>{selectedTicket.asalSekolah}</strong>.</p>

            <div className="space-y-3 text-xs">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setAdminProofFile(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setSelectedTicket(null)} className="px-4 py-2 border rounded-xl cursor-pointer">Batal</button>
                <button
                  disabled={!proofFile || isSubmittingProof}
                  onClick={() => proofFile && handleAdminVerify(proofFile)}
                  className="px-4 py-2 bg-[#006837] text-white rounded-xl font-semibold disabled:opacity-40 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" /> Simpan &amp; Selesaikan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW GAMBAR / PDF */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full relative flex flex-col items-center">
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" /> {previewImage.title}
            </h3>
            <div className="w-full max-h-[70vh] overflow-y-auto flex justify-center bg-slate-100 p-3 rounded-2xl">
              {previewImage.url.startsWith("data:application/pdf") ? (
                <iframe src={previewImage.url} className="w-full h-[500px] rounded-xl" title="Lampiran PDF" />
              ) : (
                <img src={previewImage.url} alt="Preview Bukti" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
              )}
            </div>
            <button onClick={() => setPreviewImage(null)} className="mt-4 px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}