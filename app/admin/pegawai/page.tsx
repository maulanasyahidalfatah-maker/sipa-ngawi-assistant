"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Trash2, Search, Edit2, X, Check } from "lucide-react";

interface Pegawai {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
  status: "Aktif" | "Tidak Aktif";
}

export default function DataPegawaiPage() {
  const router = useRouter();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [search, setSearch] = useState("");
  
  // State Modal Tambah/Edit Pegawai
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [status, setStatus] = useState<"Aktif" | "Tidak Aktif">("Aktif");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionRaw = localStorage.getItem("sipa_user_session");
      if (!sessionRaw) {
        router.push("/login");
        return;
      }

      // Muat data dari localStorage atau gunakan data awalmu
      const saved = localStorage.getItem("sipa_pegawai_list_dinas");
      if (saved) {
        try {
          setPegawaiList(JSON.parse(saved));
        } catch {
          initDefault();
        }
      } else {
        initDefault();
      }
    }
  }, [router]);

  const initDefault = () => {
    const defaultData: Pegawai[] = [
      { id: "1", nama: "Kabul Tunggul Winarno, S.IP.", nip: "196803131990031004", jabatan: "Kepala Dinas Pendidikan", status: "Aktif" },
      { id: "2", nama: "Dr. Supri Wahyudi Utomo, M.Pd.", nip: "197503151998031002", jabatan: "Sekretaris Dinas", status: "Aktif" },
      { id: "3", nama: "Rizki Kurniawan Wahono, S.T.", nip: "198804122014021001", jabatan: "Kepala Subbagian", status: "Aktif" },
    ];
    setPegawaiList(defaultData);
    localStorage.setItem("sipa_pegawai_list_dinas", JSON.stringify(defaultData));
  };

  const saveToLocalStorage = (updated: Pegawai[]) => {
    setPegawaiList(updated);
    localStorage.setItem("sipa_pegawai_list_dinas", JSON.stringify(updated));
  };

  const handleAddPegawai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !nip || !jabatan) return;

    const newPegawai: Pegawai = {
      id: Date.now().toString(),
      nama,
      nip,
      jabatan,
      status,
    };

    const updated = [newPegawai, ...pegawaiList];
    saveToLocalStorage(updated);

    // Reset dan tutup modal
    setNama("");
    setNip("");
    setJabatan("");
    setStatus("Aktif");
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus data pegawai ini?")) {
      const updated = pegawaiList.filter((p) => p.id !== id);
      saveToLocalStorage(updated);
    }
  };

  const filtered = pegawaiList.filter(
    (p) => p.nama.toLowerCase().includes(search.toLowerCase()) || p.nip.includes(search)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#006837]" /> Manajemen Data Pegawai Disdikbud
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Daftar referensi pegawai dan pejabat struktural Kabupaten Ngawi.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari NIP / Nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#006837] w-60 font-normal text-slate-800"
            />
          </div>
          
          {/* TOMBOL TAMBAH PEGAWAI SEKARANG AKTIF MEMBUKA MODAL */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#006837] text-white font-semibold">
            <tr>
              <th className="p-3.5 w-12 text-center">No</th>
              <th className="p-3.5">Nama Lengkap &amp; Gelar</th>
              <th className="p-3.5">NIP</th>
              <th className="p-3.5">Jabatan / Unit Kerja</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  Tidak ada data pegawai yang ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900">{p.nama}</td>
                  <td className="p-3.5 font-mono text-slate-600">{p.nip}</td>
                  <td className="p-3.5 text-slate-700">{p.jabatan}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                        title="Hapus Pegawai"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM TAMBAH PEGAWAI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tambah Pegawai Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Masukkan data resmi pegawai Dinas Pendidikan dan Kebudayaan.</p>

            <form onSubmit={handleAddPegawai} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap &amp; Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-normal text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 198001012005011001"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-mono font-normal text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan / Unit Kerja *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Staf Bidang Pembinaan"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-normal text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Kepegawaian *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Aktif" | "Tidak Aktif")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] bg-white font-semibold text-slate-800"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}