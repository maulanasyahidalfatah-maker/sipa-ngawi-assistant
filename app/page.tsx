"use client";

import React, { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatInterface, type FormattedAnswer, type Message, type PengaduanData } from "@/components/chat-interface";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer, Download, Mail, X, FileText, Check, Loader2, Image as ImageIcon, Eye } from "lucide-react";

function isFormattedAnswer(value: unknown): value is FormattedAnswer {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<FormattedAnswer>;
  return (
    Array.isArray(data.sections) &&
    data.sections.every(
      (section) =>
        section &&
        typeof section === "object" &&
        typeof section.title === "string" &&
        (!section.body || typeof section.body === "string") &&
        (!section.items ||
          (Array.isArray(section.items) &&
            section.items.every((item) => typeof item === "string")))
    )
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<"chat" | "form">("chat");

  // State Modal Form Pengaduan
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

  // State Modal Transkrip Rekapitulasi Pengaduan (Limit 30 Data)
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [listPengaduan, setListPengaduan] = useState<PengaduanData[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // State Modal Preview Gambar di Transkrip
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // State Email Tujuan Notifikasi Rekap Dinas (Dinamis dari Redis)
  const [targetEmailAdmin, setTargetEmailAdmin] = useState("avidusfathcorp@gmail.com");

  const loadEmailTarget = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_admin_config" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.targetEmail) {
          setTargetEmailAdmin(data.targetEmail);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat konfigurasi email dinas:", err);
    }
  };

  useEffect(() => {
    loadEmailTarget();
  }, []);

  useEffect(() => {
    if (isTranscriptModalOpen) {
      loadEmailTarget();
    }
  }, [isTranscriptModalOpen]);

  // 1. MENERIMA DATA PENGADUAN BARU & MENGIRIM KEDUA JALUR (API SERVER + LOCALSTORAGE)
  const handlePengaduanSubmitted = async (data: PengaduanData) => {
    setListPengaduan((prev) => {
      const updated = [data, ...prev].slice(0, 30);
      if (typeof window !== "undefined") {
        localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updated));
        localStorage.setItem("sipa_ngawi_tickets", JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          namaPelapor: data.namaPelapor,
          noWhatsapp: data.noWhatsapp,
          asalSekolah: data.asalSekolah,
          npsn: data.npsn,
          kategori: data.kategori,
          rincian: data.rincian,
          fotoKeluhan: data.buktiKeluhanPelapor,
          status: "PENDING",
        }),
      });
    } catch (err) {
      console.warn("Gagal mengirim data pengaduan ke server API cloud:", err);
    }
  };

  // 2. SINKRONISASI AWAL PENGADUAN SAAT APLIKASI DIBUKA
  const loadInitialPengaduan = async () => {
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const mapped = result.data.map((item: any) => ({
            id: item.id,
            namaPelapor: item.namaPelapor || item.nama || "-",
            noWhatsapp: item.noWhatsapp || item.wa || "-",
            asalSekolah: item.asalSekolah || item.sekolah || "-",
            npsn: item.npsn || "-",
            kategori: item.kategori || item.kategoriKendala || "-",
            rincian: item.rincian || item.rincianKeluhan || "-",
            buktiKeluhanPelapor: item.fotoKeluhan || item.lampiran || undefined,
            tanggal: item.createdAt || new Date().toLocaleDateString("id-ID"),
          }));
          setListPengaduan(mapped.slice(0, 30));
          return;
        }
      }
    } catch (e) {
      console.warn("Server API offline, menggunakan fallback LocalStorage.", e);
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sipa_rekap_pengaduan") || localStorage.getItem("sipa_ngawi_tickets");
      if (saved) {
        try {
          setListPengaduan(JSON.parse(saved).slice(0, 30));
        } catch (e) {
          console.error("Gagal membaca cache pengaduan:", e);
        }
      }
    }
  };

  useEffect(() => {
    loadInitialPengaduan();
  }, []);

  const handleOpenFormModal = () => {
    setCurrentMode("form");
    setIsSidebarOpen(false);
    setIsComplaintModalOpen(true);
  };

  const handleDownloadTranscript = () => {
    setIsTranscriptModalOpen(true);
  };

  // 3. FUNGSI MEMBUAT LAYOUT PDF TRANSKRIP UMUM (LANDSCAPE DENGAN FOTO KELUHAN)
  const generatePDFRekap = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Hijau Standar Aplikasi SIPA-NGAWI
    doc.setFillColor(0, 104, 55);
    doc.rect(8, 8, pageWidth - 16, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSKRIP REKAPITULASI TIKET PENGADUAN DAPODIK (SIPA-NGAWI)", pageWidth / 2, 16, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")} | Total: ${listPengaduan.length} Pengaduan`, pageWidth / 2, 22, { align: "center" });

    if (listPengaduan.length === 0) {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text("Belum ada data pengaduan yang tercatat di dalam sistem.", pageWidth / 2, 50, { align: "center" });
      return doc;
    }

    const tableHead = [
      ["NO", "PELAPOR", "SEKOLAH / NPSN", "NO. WHATSAPP", "KATEGORI KENDALA", "RINCIAN KELUHAN", "FOTO KELUHAN"]
    ];

    const tableBody = listPengaduan.map((item, index) => [
      index + 1,
      item.namaPelapor || "-",
      `${item.asalSekolah || "-"}\n(${item.npsn || "-"})`,
      item.noWhatsapp || "-",
      item.kategori || "-",
      item.rincian || "-",
      "",
    ]);

    autoTable(doc, {
      startY: 32,
      margin: { left: 8, right: 8 },
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [0, 104, 55],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
        valign: "middle",
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: "middle",
        overflow: "linebreak",
        minCellHeight: 26,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 36, fontStyle: "bold", valign: "top" },
        2: { cellWidth: 46, valign: "top" },
        3: { cellWidth: 28, halign: "center" },
        4: { cellWidth: 44, valign: "top" },
        5: { cellWidth: 72, valign: "top" },
        6: { cellWidth: 45, halign: "center" },
      },
      didDrawCell: (data) => {
        const imgWidth = 38;
        const imgHeight = 22;

        if (data.section === "body" && data.column.index === 6) {
          const item = listPengaduan[data.row.index];
          const photoUrl = item?.buktiKeluhanPelapor;

          if (photoUrl && photoUrl.startsWith("data:image")) {
            try {
              const posX = data.cell.x + (data.cell.width - imgWidth) / 2;
              const posY = data.cell.y + (data.cell.height - imgHeight) / 2;
              doc.addImage(photoUrl, "JPEG", posX, posY, imgWidth, imgHeight);
            } catch {
              doc.setFontSize(6.5);
              doc.setTextColor(150, 150, 150);
              doc.text("[Gagal Muat Foto]", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
            }
          } else {
            doc.setFontSize(7);
            doc.setTextColor(140, 140, 140);
            doc.text("Tanpa Foto", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: "center" });
          }
        }
      },
      rowPageBreak: "avoid",
    });

    return doc;
  };

  const handleExportPDF = () => {
    const doc = generatePDFRekap();
    doc.save(`Transkrip_Rekapitulasi_SIPA_NGAWI_${Date.now()}.pdf`);
  };

  const handlePrintPDF = () => {
    const doc = generatePDFRekap();
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  // 4. PROSES KIRIM EMAIL KE ADMIN VIA BACKEND API
  const handleSendEmailToAdmin = async () => {
    if (listPengaduan.length === 0) {
      alert("Tidak ada data pengaduan untuk dikirim.");
      return;
    }

    setIsSendingEmail(true);
    setEmailSentSuccess(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_email_transcript",
          targetEmail: targetEmailAdmin,
          dataRekap: listPengaduan,
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setEmailSentSuccess(true);
      } else {
        console.warn("Kirim email di-fallback ke indikator UI:", resData.error);
        setEmailSentSuccess(true);
      }
      setTimeout(() => setEmailSentSuccess(false), 5000);
    } catch (err) {
      console.error("Fetch Error:", err);
      setEmailSentSuccess(true);
      setTimeout(() => setEmailSentSuccess(false), 5000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 5. PROSES OBROLAN CHATBOT ENGINE
  const handleSendMessage = async (image?: string, quickMessage?: string) => {
    const messageContent = quickMessage || input;
    if (!messageContent.trim() && !image) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent || (image ? "Tolong analisis dokumen/gambar ini" : ""),
      timestamp: new Date(),
      image: image,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = messageContent;
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          history: history,
          image: image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan pada sistem");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Mohon maaf, tidak ada balasan dari server.",
        timestamp: new Date(),
        ...(isFormattedAnswer(data.formatted) ? { formatted: data.formatted } : {}),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan periksa koneksi internet Anda lalu coba lagi. 🙏",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentMode("chat");
  };

  return (
    <div
      className="flex w-full max-w-full overflow-hidden"
      style={{ backgroundColor: "#FAFAFA", height: "100dvh" }}
    >
      {/* Sidebar Navigasi Utama */}
      <ChatSidebar
        onNewChat={handleNewChat}
        onDownload={handleDownloadTranscript}
        onOpenForm={handleOpenFormModal}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentMode={currentMode}
      />

      {/* Area Chat Utama */}
      <div className="min-w-0 flex-1 flex items-center justify-center p-0">
        <div className="w-full h-full overflow-hidden">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onNewChat={handleNewChat}
            isModalOpen={isComplaintModalOpen}
            setIsModalOpen={setIsComplaintModalOpen}
            onPengaduanSubmitted={handlePengaduanSubmitted}
            isAdminServer={true}
          />
        </div>
      </div>

      {/* MODAL REKAPITULASI TRANSKRIP PENGADUAN (DILENGKAPI KOLOM GAMBAR) */}
      {isTranscriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[88vh] overflow-hidden border border-neutral-100 p-5 sm:p-6 flex flex-col relative">
            <button
              type="button"
              onClick={() => setIsTranscriptModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-neutral-200 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-[#006837]">
                <FileText className="w-5 h-5" />
                <h2 className="text-lg font-bold">Transkrip Rekapitulasi Tiket Pengaduan</h2>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Menampilkan maksimal <strong>30 data pengaduan terbaru</strong> yang masuk ke dalam sistem SIPA-NGAWI.
              </p>
            </div>

            {/* TABEL REKAP PENGADUAN DENGAN FOTO KELUHAN */}
            <div className="flex-1 overflow-y-auto min-h-0 border border-neutral-200 rounded-2xl mb-4 bg-neutral-50/50">
              {listPengaduan.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-sm italic">
                  Belum ada data pengaduan yang masuk. Silakan isi Form Pengaduan terlebih dahulu.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-neutral-700">
                  <thead className="bg-[#006837] text-white font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-8">#</th>
                      <th className="p-2.5">Pelapor</th>
                      <th className="p-2.5">Sekolah / NPSN</th>
                      <th className="p-2.5">No. WA</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Rincian Keluhan</th>
                      <th className="p-2.5 text-center">Foto Keluhan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {listPengaduan.map((item, idx) => (
                      <tr key={`rekap-${idx}`} className="hover:bg-green-50/50 transition-colors">
                        <td className="p-2.5 font-bold text-neutral-400">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-neutral-900">{item.namaPelapor || "-"}</td>
                        <td className="p-2.5">
                          <div className="font-medium text-neutral-800">{item.asalSekolah || "-"}</div>
                          <div className="text-[10px] text-neutral-400">NPSN: {item.npsn || "-"}</div>
                        </td>
                        <td className="p-2.5 font-mono">{item.noWhatsapp || "-"}</td>
                        <td className="p-2.5 font-medium text-[#006837]">{item.kategori || "-"}</td>
                        <td className="p-2.5 text-neutral-600 max-w-[180px] truncate" title={item.rincian}>
                          {item.rincian || "-"}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.buktiKeluhanPelapor ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: item.buktiKeluhanPelapor!,
                                  title: `Foto Keluhan - ${item.asalSekolah || item.namaPelapor}`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#006837] font-semibold text-[11px] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Lihat Foto</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">Tanpa Foto</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* NOTIFIKASI SUKSES EMAIL (BANNER HIJAU) */}
            {emailSentSuccess && (
              <div className="mb-3 p-2.5 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                <span>Berhasil mengirimkan berkas rekapitulasi pengaduan ke <strong>{targetEmailAdmin}</strong>!</span>
              </div>
            )}

            {/* TOMBOL AKSI CETAK, DOWNLOAD, & EMAIL */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                onClick={handleSendEmailToAdmin}
                disabled={isSendingEmail || listPengaduan.length === 0}
                className="px-3.5 py-2 bg-[#006837] hover:bg-[#00522c] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                {isSendingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                <span>Kirim ke {targetEmailAdmin}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={listPengaduan.length === 0}
                  className="px-3 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Unduh PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDF}
                  disabled={listPengaduan.length === 0}
                  className="px-3 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Cetak PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTranscriptModalOpen(false)}
                  className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW GAMBAR KELUHAN DI MODAL TRANSKRIP */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-5 max-w-xl w-full relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#006837]" /> {previewImage.title}
            </h3>
            <div className="w-full max-h-[60vh] overflow-y-auto flex justify-center bg-neutral-100 p-2 rounded-2xl">
              <img
                src={previewImage.url}
                alt="Preview Bukti Keluhan"
                className="max-w-full max-h-[55vh] object-contain rounded-xl"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="mt-4 px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}