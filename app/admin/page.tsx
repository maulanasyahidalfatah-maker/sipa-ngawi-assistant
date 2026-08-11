"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Upload, FileText, X, Eye, RefreshCw, Inbox } from "lucide-react";

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
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<"semua" | "pending" | "resolved">("semua");
  const [isLoading, setIsLoading] = useState(false);
  
  // State Modal Verifikasi Admin
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [proofFile, setAdminProofFile] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // State Modal Lihat Bukti
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  // 1. SINKRONISASI DUA ARAH (SERVER BACKEND + BACKUP LOKAL PERMANEN)
  const loadTickets = async () => {
    setIsLoading(true);

    // Step A: Ambil backup dari LocalStorage browser
    let localBackup: AdminTicket[] = [];
    if (typeof window !== "undefined") {
      const savedBackup = localStorage.getItem("sipa_rekap_pengaduan_backup");
      const savedRekap = localStorage.getItem("sipa_rekap_pengaduan");
      const savedTickets = localStorage.getItem("sipa_ngawi_tickets");
      const raw = savedBackup || savedRekap || savedTickets;

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localBackup = parsed.map((item: any, idx: number) => ({
              id: item.id || `TK-00${idx + 1}`,
              namaPelapor: item.namaPelapor || item.nama || "-",
              noWhatsapp: item.noWhatsapp || item.wa || "-",
              asalSekolah: item.asalSekolah || item.sekolah || "-",
              npsn: item.npsn || "-",
              kategori: item.kategori || item.kategoriKendala || "-",
              rincian: item.rincian || item.rincianKeluhan || "-",
              status: item.status === "SELESAI" ? "RESOLVED" : (item.status || "PENDING"),
              buktiPerbaikan: item.buktiPerbaikan || undefined,
              createdAt: item.createdAt || new Date().toLocaleDateString("id-ID"),
            }));
          }
        } catch (e) {
          console.error("Gagal membaca backup lokal:", e);
        }
      }
    }

    // Step B: Ambil data dari Server Cloud Backend
    let serverTickets: AdminTicket[] = [];
    try {
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          serverTickets = result.data;
        }
      }
    } catch (e) {
      console.warn("Gagal terhubung ke API backend:", e);
    }

    // Step C: Gabungkan data Server dan Backup Lokal tanpa duplikasi ID
    const ticketMap = new Map<string, AdminTicket>();

    // Prioritas awal dari backup lokal
    localBackup.forEach((t) => ticketMap.set(t.id, t));

    // Gabungkan dengan data server
    serverTickets.forEach((t) => {
      const existing = ticketMap.get(t.id);
      // Jika belum ada di lokal, atau data server sudah RESOLVED, utamakan data server
      if (!existing || (existing.status === "PENDING" && t.status === "RESOLVED")) {
        ticketMap.set(t.id, t);
      }
    });

    const mergedTickets = Array.from(ticketMap.values());

    setTickets(mergedTickets);

    // Simpan hasil penggabungan ke Backup Lokal Permanen
    if (typeof window !== "undefined" && mergedTickets.length > 0) {
      try {
        localStorage.setItem("sipa_rekap_pengaduan_backup", JSON.stringify(mergedTickets));
        localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(mergedTickets));
      } catch {
        console.warn("Storage browser penuh.");
      }
    }

    // Restore balik ke server jika server sempat kosong karena restart Vercel
    if (serverTickets.length < mergedTickets.length) {
      mergedTickets.forEach(async (ticket) => {
        try {
          await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ticket),
          });
        } catch {
          // Abaikan
        }
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // 2. VALIDASI AKSES LOGIN ADMIN
    if (typeof window !== "undefined") {
      const isDev = process.env.NODE_ENV === "development";
      let sessionRaw = localStorage.getItem("sipa_user_session");

      if (!sessionRaw && isDev) {
        const devSession = { role: "ADMIN", nama: "Developer Utama", email: "dev@sipa.ngawi" };
        localStorage.setItem("sipa_user_session", JSON.stringify(devSession));
        sessionRaw = JSON.stringify(devSession);
      }

      if (!sessionRaw) {
        alert("Akses ditolak! Silakan login sebagai Admin Dinas terlebih dahulu.");
        router.push("/login");
        return;
      }

      try {
        const session = JSON.parse(sessionRaw);
        if (session.role !== "ADMIN") {
          alert("Akses ditolak! Akun Anda bukan merupakan Admin Disdikbud Ngawi.");
          router.push("/login");
          return;
        }
      } catch {
        router.push("/login");
        return;
      }
    }

    loadTickets();

    // Auto-polling refresh setiap 5 detik
    const interval = setInterval(() => {
      loadTickets();
    }, 5000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sipa_rekap_pengaduan" || e.key === "sipa_rekap_pengaduan_backup") {
        loadTickets();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 3. UNGGAH BUKTI PERBAIKAN & UBAH STATUS MENJADI SUDAH DIBENAHI
  const handleAdminVerify = async (fileBase64: string) => {
    if (!selectedTicket) return;

    setIsSubmittingProof(true);

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

    // Simpan ke backup lokal
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sipa_rekap_pengaduan_backup", JSON.stringify(updatedTickets));
        localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updatedTickets));
      } catch {
        console.warn("Storage penuh.");
      }
    }

    // Update ke Server API Backend
    try {
      await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: "RESOLVED",
          buktiPerbaikan: fileBase64,
        }),
      });
    } catch (e) {
      console.error("Gagal sinkronisasi update ke server:", e);
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
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin text-[#006837]" : ""}`} />
              <span>Sync Server</span>
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Database Connected</span>
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
                ? "bg-[#006837] text-white shadow-sm"
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
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Belum Dibenahi ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("resolved")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === "resolved"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Sudah Dibenahi ({resolvedCount})
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
                  <th className="p-3.5 whitespace-nowrap text-center">AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Inbox className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600 text-sm">Belum Ada Pengaduan Masuk</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Setiap keluhan yang masuk akan tersimpan permanen di sini sampai Admin mengunggah bukti perbaikan.
                        </p>
                      </div>
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
                        <div className="font-semibold text-[#006837] mb-0.5">{ticket.kategori}</div>
                        <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px]">
                          {ticket.rincian}
                        </div>
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
                            className="px-3 py-1.5 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer mx-auto"
                          >
                            <span>Unggah Bukti &amp; Selesaikan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setViewProofUrl(ticket.buktiPerbaikan || null)}
                            className="text-[#006837] hover:text-emerald-800 font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer mx-auto"
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

      {/* MODAL UNGGAH BUKTI PERBAIKAN */}
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
              Verifikasi &amp; Beri Bukti Tiket {selectedTicket.id}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Unggah screenshot / berkas bukti perbaikan dari Dinas untuk menyelesaikan pengaduan <strong>{selectedTicket.asalSekolah}</strong>.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedTicket.namaPelapor} ({selectedTicket.noWhatsapp})</div>
                <div className="text-slate-500 mt-1 whitespace-pre-wrap">{selectedTicket.kategori}: {selectedTicket.rincian}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unggah Berkas Bukti Perbaikan Dinas (Gambar/PDF) *
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
                  className="px-4 py-2 bg-[#006837] hover:bg-[#00522c] disabled:opacity-40 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmittingProof ? "Memproses..." : "Simpan & Selesaikan"}</span>
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
              <Eye className="w-5 h-5 text-emerald-600" /> Bukti Hasil Pembetulan Dinas
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
                  alt="Bukti Hasil Pembetulan Dinas"
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