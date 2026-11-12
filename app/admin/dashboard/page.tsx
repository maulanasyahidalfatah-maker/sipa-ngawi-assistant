"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  RefreshCw, 
  ShieldCheck, 
  FileSpreadsheet, 
  Users 
} from "lucide-react";

export default function AdminDashboardOverview() {
  const [totalTickets, setTotalTickets] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    setIsRefreshing(true);
    try {
      const stored = localStorage.getItem("sipa_ngawi_tickets") || localStorage.getItem("sipa_pengaduan_list");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTotalTickets(parsed.length);
          setPendingCount(parsed.filter((t: any) => t.status === "PENDING" || !t.status).length);
          setResolvedCount(parsed.filter((t: any) => t.status === "RESOLVED" || t.status === "SELESAI").length);
        }
      } else {
        // Fallback dummy jika kosong
        setTotalTickets(1);
        setPendingCount(1);
        setResolvedCount(0);
      }
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* BANNER UTAMA ALA ARKA */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Portal Administrator Resmi
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Selamat datang, Administrator!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Berikut adalah ringkasan data layanan pengaduan dan rekapitulasi Disdikbud Kabupaten Ngawi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Widget Tanggal Hari Ini */}
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Tanggal Hari Ini</p>
                <p className="text-xs font-bold text-slate-800">{currentDate}</p>
              </div>
            </div>

            {/* Tombol Refresh Data */}
            <button
              type="button"
              onClick={loadData}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-3 rounded-2xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[#006837] ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* WIDGET KARTU STATISTIK (3 KOTAK UTAMA) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Pengaduan */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengaduan</p>
              <p className="text-3xl font-black text-slate-900">{totalTickets}</p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <span>+ Data terbaru aktif</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>

          {/* Belum Dibenahi / Pending */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending (Belum)</p>
              <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
              <p className="text-[11px] text-slate-500 font-medium">Butuh verifikasi &amp; perbaikan</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Sudah Dibenahi / Resolved */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved (Selesai)</p>
              <p className="text-3xl font-black text-emerald-600">{resolvedCount}</p>
              <p className="text-[11px] text-emerald-700 font-medium">Tuntas &amp; siap diarsip</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* SECTION BAWAH: INFORMASI SISTEM & PINTASAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-[#006837]">
              <FileSpreadsheet className="w-5 h-5" />
              <h2 className="font-bold text-base text-slate-900">Aktivitas &amp; Layanan Cepat</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan menu <strong>Layanan Pengaduan</strong> di samping untuk memverifikasi kendala Dapodik sekolah, atau kelola data akun melalui menu <strong>Manajemen User</strong> dan <strong>Data Pegawai</strong>.
            </p>
            <div className="pt-2">
              <a
                href="/admin"
                className="inline-flex items-center gap-2 bg-[#006837] hover:bg-[#00522c] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Buka Layanan Pengaduan Sekarang →
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-700">
              <Users className="w-5 h-5" />
              <h2 className="font-bold text-base text-slate-900">Informasi Sistem SIPA-NGAWI</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem Informasi &amp; Pelayanan Asisten Pendidikan dan Kebudayaan Kabupaten Ngawi terintegrasi penuh dengan basis data real-time untuk memastikan akurasi data VervalPD, VervalPTK, dan laporan kedinasan.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Server Status: Aktif &amp; Terhubung
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}