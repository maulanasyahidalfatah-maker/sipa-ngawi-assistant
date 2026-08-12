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
  Download,
  Calendar,
  BarChart3,
} from "lucide-react";

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
  createdAt?: string; // Format DD/MM/YYYY
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "resolved">("semua");
  const [isLoading, setIsLoading] = useState(false);

  // State Filter Rentang Tanggal
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State Modal Verifikasi Admin
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [proofFile, setAdminProofFile] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // State Modal Preview Gambar
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // FUNGSI MEMPERBAIKI DAN MEMBERSIHKAN FORMAT TIKET
  const sanitizeAndSortTickets = (rawTickets: any[]): AdminTicket[] => {
    return rawTickets.map((item, idx) => {
      const num = idx + 1;
      const formattedId = `TK-${num < 10 ? `00${num}` : num < 100 ? `0${num}` : num}`;

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
        status: item.status === "SELESAI" ? "RESOLVED" : item.status || "PENDING",
        buktiPerbaikan: item.buktiPerbaikan || undefined,
        createdAt: item.createdAt || new Date().toLocaleDateString("id-ID"),
      };
    });
  };

  // LOAD DATA DARI SERVER & LOCAL STORAGE DENGAN PENCEGAHAN DUPLIKASI (DEDUPLICATION)
  const loadTickets = async () => {
    setIsLoading(true);

    let localBackup: AdminTicket[] = [];
    if (typeof window !== "undefined") {
      const savedBackup = localStorage.getItem("sipa_rekap_pengaduan_backup");
      const savedRekap = localStorage.getItem("sipa_rekap_pengaduan");
      const raw = savedBackup || savedRekap;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localBackup = sanitizeAndSortTickets(parsed);
          }
        } catch (e) {
          console.error("Gagal membaca backup lokal:", e);
        }
      }
    }

    let serverTickets: AdminTicket[] = [];
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          serverTickets = sanitizeAndSortTickets(result.data);
        }
      }
    } catch (e) {
      console.warn("Gagal terhubung ke API backend:", e);
    }

    // GABUNGKAN DATA MENGGUNAKAN MAP BERDASARKAN ID TIKET UNTUK MENCEGAH DATA BERGANDA
    const ticketMap = new Map<string, AdminTicket>();
    
    // Masukkan data lokal terlebih dahulu
    localBackup.forEach((t) => ticketMap.set(t.id, t));

    // Timpa atau tambahkan dari server (Server diutamakan jika statusnya RESOLVED)
    serverTickets.forEach((t) => {
      const existing = ticketMap.get(t.id);
      if (!existing || (existing.status === "PENDING" && t.status === "RESOLVED")) {
        ticketMap.set(t.id, t);
      }
    });

    const mergedTickets = Array.from(ticketMap.values());
    setTickets(mergedTickets);

    setIsLoading(false);
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
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sipa_user_session");
      document.cookie = "sipa_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    router.push("/login");
  };

  // FITUR EKSPOR DATA KE EXCEL / CSV NATIVE (UTF-8 BOM COMPATIBLE WITH EXCEL)
  const handleExportExcel = () => {
    if (filteredTickets.length === 0) {
      alert("Tidak ada data pengaduan untuk diekspor!");
      return;
    }

    const headers = [
      "ID Tiket",
      "Tanggal",
      "Nama Pelapor",
      "NIK Pelapor",
      "No WhatsApp",
      "Asal Sekolah",
      "NPSN",
      "Kategori",
      "Rincian Keluhan",
      "Status",
    ];

    const rows = filteredTickets.map((t) => [
      `"${t.id}"`,
      `"${t.createdAt || "-"}"`,
      `"${t.namaPelapor}"`,
      `"${t.nikPelapor || "-"}"`,
      `"${t.noWhatsapp}"`,
      `"${t.asalSekolah}"`,
      `"${t.npsn}"`,
      `"${t.kategori}"`,
      `"${t.rincian.replace(/"/g, '""')}"`,
      `"${t.status === "RESOLVED" ? "Sudah Dibenahi" : "Belum Dibenahi"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rekap_Pengaduan_SIPA_NGAWI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FITUR RESET DATA KELUHAN PERMANEN
  const handleResetData = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus SEMUA data pengaduan? Tindakan ini tidak dapat dibatalkan!")) return;

    setIsLoading(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sipa_rekap_pengaduan_backup");
      localStorage.removeItem("sipa_rekap_pengaduan");
      localStorage.removeItem("sipa_ngawi_tickets");
      localStorage.removeItem("sipa_pengaduan_list");
    }

    try {
      await fetch("/api/tickets", { method: "DELETE" });
    } catch (e) {
      console.error("Gagal menghapus data dari server:", e);
    }

    setTickets([]);
    setIsLoading(false);
    alert("Seluruh data keluhan berhasil dibersihkan secara permanen!");
  };

  // VERIFIKASI & SELESAIKAN TIKET OLEH ADMIN
  const handleAdminVerify = async (fileBase64: string) => {
    if (!selectedTicket) return;
    setIsSubmittingProof(true);

    const updated = tickets.map((t) => (t.id === selectedTicket.id ? { ...t, status: "RESOLVED" as const, buktiPerbaikan: fileBase64 } : t));
    setTickets(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem("sipa_rekap_pengaduan_backup", JSON.stringify(updated));
      localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updated));
    }

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
  };

  // LOGIKA FILTERING TIKET (STATUS & RENTANG TANGGAL)
  const filteredTickets = tickets.filter((item) => {
    // Filter Status
    if (filterStatus === "pending" && item.status !== "PENDING") return false;
    if (filterStatus === "resolved" && item.status !== "RESOLVED") return false;

    // Filter Rentang Tanggal
    if (startDate || endDate) {
      if (!item.createdAt) return false;

      // Parsing format tanggal DD/MM/YYYY atau YYYY-MM-DD
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

  // STATISTIK RINGKAS
  const totalTickets = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === "PENDING").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;

  return (
    <div className="w-full h-screen overflow-y-auto bg-slate-50 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto pb-16">
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin SIPA-NGAWI</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Panel Pengelolaan &amp; Verifikasi Pengaduan Data Dapodik Disdikbud Kab. Ngawi
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* TOMBOL EKSPOR EXCEL (.CSV) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              title="Ekspor ke File Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.csv)</span>
            </button>

            {/* TOMBOL REFRESH / SYNC */}
            <button
              type="button"
              onClick={loadTickets}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#006837]" : ""}`} />
              <span>Sync</span>
            </button>

            {/* TOMBOL RESET DATA KELUHAN */}
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Reset</span>
            </button>

            {/* TOMBOL LOGOUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* WIDGET STATISTIK RINGKAS */}
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

        {/* BARIS FILTER: TAB STATUS & RENTANG TANGGAL */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* TAB FILTER STATUS */}
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

          {/* FILTER RENTANG TANGGAL */}
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

        {/* TABEL PENGADUAN UTAMA */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10 shadow-xs">
                <tr>
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
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Inbox className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600 text-sm">Belum Ada Data Pengaduan Masuk</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket, index) => (
                    <tr key={`${ticket.id}-${index}`} className="hover:bg-slate-50 transition-colors">
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
                            className="px-3 py-1.5 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs font-semibold cursor-pointer mx-auto"
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

      {/* MODAL UNGGAH BUKTI PERBAIKAN ADMIN */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative border border-slate-100 shadow-xl">
            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
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
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
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