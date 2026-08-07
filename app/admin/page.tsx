"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, Upload, FileText, X, Eye, RefreshCw } from "lucide-react";

interface AdminTicket {
  id: string;
  namaPelapor: string;
  noWhatsapp: string;
  asalSekolah: string;
  npsn: string;
  kategori: string;
  rincian: string;
  status: "PENDING" | "RESOLVED";
  buktiPerbaikan?: string;
  createdAt?: string;
}

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "resolved">("semua");
  const [isLoading, setIsLoading] = useState(false);
  
  // State Modal Verifikasi Admin
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [proofFile, setAdminProofFile] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // State Modal Lihat Bukti
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // 1. DUMMY DATA DEFAULT
  const defaultMockData: AdminTicket[] = [
    {
      id: "TK-001",
      namaPelapor: "Ahmad Jalaluddin",
      noWhatsapp: "08123456789",
      asalSekolah: "SDN 1 Ngawi",
      npsn: "20500001",
      kategori: "Kendala Data PTK-Guru",
      rincian: "Perubahan NUPTK guru honorer belum tervalidasi di sistem pusat.",
      status: "PENDING",
      createdAt: new Date().toLocaleDateString("id-ID"),
    },
    {
      id: "TK-002",
      namaPelapor: "Siti Rahmawati",
      noWhatsapp: "08987654321",
      asalSekolah: "SMPN 2 Geneng",
      npsn: "20500002",
      kategori: "Penginputan Siswa Baru",
      rincian: "Siswa mutasi masuk belum terdaftar di rombel kelas 8.",
      status: "PENDING",
      createdAt: new Date().toLocaleDateString("id-ID"),
    },
  ];

  // 2. SINKRONISASI DATA DARI LOCALSTORAGE & EVENT PUBLIK
  const loadTickets = () => {
    setIsLoading(true);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sipa_rekap_pengaduan");

      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            const formattedTickets: AdminTicket[] = parsedData.map((item: any, idx: number) => {
              const num = idx + 1;
              const defaultId = `TK-0${num < 10 ? `0${num}` : num}`;

              return {
                id: item.id || item.ticketNumber ? (item.id || `TK-${item.ticketNumber}`) : defaultId,
                namaPelapor: item.namaPelapor || "-",
                noWhatsapp: item.noWhatsapp || "-",
                asalSekolah: item.asalSekolah || "-",
                npsn: item.npsn || "-",
                kategori: item.kategori || item.kategoriKendala || "-",
                rincian: item.rincian || item.rincianKeluhan || "-",
                status: item.status || "PENDING",
                buktiPerbaikan: item.buktiPerbaikan || undefined,
                createdAt: item.createdAt || new Date().toLocaleDateString("id-ID"),
              };
            });

            // Gabungkan data pengaduan baru dengan dummy jika dummy belum ada
            const merged = [...formattedTickets];
            defaultMockData.forEach((mock) => {
              if (!merged.some((t) => t.id === mock.id)) {
                merged.push(mock);
              }
            });

            setTickets(merged);
          } else {
            setTickets(defaultMockData);
          }
        } catch (e) {
          console.error("Gagal membaca cache pengaduan admin:", e);
          setTickets(defaultMockData);
        }
      } else {
        setTickets(defaultMockData);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();

    // Listener otomatis jika ada pengaduan baru masuk di tab publik browser yang sama
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sipa_rekap_pengaduan") {
        loadTickets();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 3. PROSES UNGGAH BUKTI PERBAIKAN & MENGUBAH STATUS TIKET
  const handleAdminVerify = (fileBase64: string) => {
    if (!selectedTicket) return;

    setIsSubmittingProof(true);

    setTimeout(() => {
      const updatedTickets = tickets.map((ticket) => {
        if (ticket.id === selectedTicket.id) {
          return {
            ...ticket,
            status: "RESOLVED" as const,
            buktiPerbaikan: fileBase64,
          };
        }
        return ticket;
      });

      setTickets(updatedTickets);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updatedTickets));
        } catch (e) {
          alert("Ukuran file terlalu besar untuk disimpan di localStorage! Gunakan berkas gambar < 1MB.");
        }
      }

      // Kirim Notifikasi WA Bot ke Pelapor
      const waMsg = encodeURIComponent(
        `Halo Bapak/Ibu ${selectedTicket.namaPelapor},\n\n` +
        `Pengaduan Anda untuk sekolah *${selectedTicket.asalSekolah} (${selectedTicket.npsn})* telah *SELESAI DITINDAKLANJUTI* oleh Admin Disdikbud Kab. Ngawi.\n\n` +
        `Terima kasih telah menggunakan layanan Asisten Virtual SIPA-NGAWI.`
      );
      window.open(`https://wa.me/${selectedTicket.noWhatsapp}?text=${waMsg}`, "_blank");

      setIsSubmittingProof(false);
      setSelectedTicket(null);
      setAdminProofFile(null);
    }, 800);
  };

  const filteredTickets = tickets.filter((item) => {
    if (filterStatus === "pending") return item.status === "PENDING";
    if (filterStatus === "resolved") return item.status === "RESOLVED";
    return true;
  });

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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadTickets}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Refresh Data Pengaduan"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Online</span>
            </div>
          </div>
        </div>

        {/* TAB FILTER */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setFilterStatus("semua")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "semua"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Semua ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "pending"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Menunggu ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("resolved")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "resolved"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Selesai ({resolvedCount})
          </button>
        </div>

        {/* TABEL PENGADUAN UTAMA */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">ID TIKET</th>
                  <th className="p-3.5 whitespace-nowrap">PELAPOR &amp; WA</th>
                  <th className="p-3.5 whitespace-nowrap">SEKOLAH / NPSN</th>
                  <th className="p-3.5 whitespace-nowrap">KATEGORI &amp; RINCIAN</th>
                  <th className="p-3.5 whitespace-nowrap">STATUS</th>
                  <th className="p-3.5 whitespace-nowrap">AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Tidak ada tiket pengaduan di kategori ini.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket, index) => (
                    <tr key={`${ticket.id}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{ticket.id}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ticket.namaPelapor}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{ticket.noWhatsapp}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{ticket.asalSekolah}</div>
                        <div className="text-slate-400 font-mono text-[11px]">NPSN: {ticket.npsn}</div>
                      </td>
                      
                      <td className="p-3.5 min-w-[280px]">
                        <div className="font-semibold text-blue-600 mb-0.5">{ticket.kategori}</div>
                        <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                          {ticket.rincian}
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {ticket.status === "RESOLVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SELESAI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {ticket.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Verifikasi &amp; Selesaikan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewProofUrl(ticket.buktiPerbaikan || null)}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Lihat Bukti
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

      {/* MODAL POP-UP UNGGAH BUKTI BISA DIISI ADMIN DINAS */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 relative border border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Verifikasi Tiket {selectedTicket.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Unggah screenshot / dokumen bukti perbaikan dari server backend untuk menyelesaikan tiket <strong>{selectedTicket.asalSekolah}</strong>.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedTicket.namaPelapor} ({selectedTicket.noWhatsapp})</div>
                <div className="text-slate-500 mt-1 whitespace-pre-wrap">{selectedTicket.kategori}: {selectedTicket.rincian}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Berkas Bukti Perbaikan (Gambar/PDF) *
                </label>
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
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!proofFile || isSubmittingProof}
                  onClick={() => proofFile && handleAdminVerify(proofFile)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmittingProof ? "Memproses..." : "Selesaikan Tiket"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP-UP PREVIEW LIHAT BUKTI GAMBAR / PDF */}
      {viewProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 relative border border-slate-100 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setViewProofUrl(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" /> Bukti Perbaikan Admin
            </h3>

            <div className="w-full max-h-[70vh] overflow-y-auto flex justify-center bg-slate-100 p-3 rounded-2xl border border-slate-200">
              {viewProofUrl.startsWith("data:application/pdf") ? (
                <iframe
                  src={viewProofUrl}
                  className="w-full h-[500px] rounded-xl"
                  title="Bukti PDF"
                />
              ) : (
                <img
                  src={viewProofUrl}
                  alt="Bukti Perbaikan Admin"
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="mt-4 flex justify-end w-full">
              <button
                type="button"
                onClick={() => setViewProofUrl(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}