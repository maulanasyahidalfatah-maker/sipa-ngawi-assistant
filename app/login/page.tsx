"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  UserPlus,
  LogIn,
  AlertCircle,
  KeyRound,
  Loader2,
  LogOut,
  CheckCircle2,
} from "lucide-react";

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
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeUser, setActiveUser] = useState<any>(null);

  // AUTO-LOGIN: CEK SESI TERSIMPAN DI BROWSER
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem("sipa_user_session");
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed && parsed.role === "PUBLIC") {
            setActiveUser(parsed);
            router.push("/");
            return;
          } else if (parsed && parsed.role === "ADMIN") {
            setActiveUser(parsed);
            router.push("/admin");
            return;
          }
        } catch {
          localStorage.removeItem("sipa_user_session");
        }
      }
    }
    setCheckingSession(false);
  }, [router]);

  const handleSwitchRole = (targetRole: "PUBLIC" | "ADMIN") => {
    setRole(targetRole);
    setIsRegister(false);
    setErrorMsg("");
    setSuccessMsg("");
    setEmailOrNip("");
    setPassword("");
    setNamaLengkap("");
  };

  const saveSessionAndRedirect = (sessionData: any, targetPath: string) => {
    if (typeof window !== "undefined") {
      const sessionString = JSON.stringify(sessionData);
      localStorage.setItem("sipa_user_session", sessionString);
      document.cookie = `sipa_user_session=${encodeURIComponent(
        sessionString
      )}; path=/; max-age=2592000; SameSite=Lax`;
    }
    router.push(targetPath);
  };

  const handleClearSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sipa_user_session");
      document.cookie = "sipa_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    setActiveUser(null);
    setCheckingSession(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    const inputUser = emailOrNip.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg("Mohon isi identitas dan kata sandi terlebih dahulu.");
      setIsLoading(false);
      return;
    }

    // =========================================================================
    // 🔑 AKUN MASTER DEVELOPER MAULANA (BYPASS KE MANA SAJA)
    // =========================================================================
    if (
      (inputUser.toUpperCase() === "MAULANA-DEV@SIPA.COM" || inputUser.toLowerCase() === "maulana-dev@sipa.com") &&
      inputPass === "Alhakim5758"
    ) {
      const devSession = {
        role: role,
        nama: "Maulana Syahid Al Fatah (Developer)",
        email: "MAULANA-DEV@SIPA.COM",
      };
      saveSessionAndRedirect(devSession, role === "ADMIN" ? "/admin" : "/");
      return;
    }

    // =========================================================================
    // 🛡️ LOGIN ADMIN DINAS
    // =========================================================================
    if (role === "ADMIN") {
      const matchedAdmin = ADMIN_DINAS_WHITELIST.find(
        (a) =>
          (a.nip === inputUser || a.email.toLowerCase() === inputUser.toLowerCase()) &&
          a.pass === inputPass
      );

      if (matchedAdmin) {
        const adminSession = {
          role: "ADMIN",
          nama: matchedAdmin.nama,
          email: matchedAdmin.email,
        };
        saveSessionAndRedirect(adminSession, "/admin");
      } else {
        setErrorMsg("NIP / Email Dinas atau Password Admin salah! Hubungi Tim IT Disdikbud jika ada kendala.");
        setIsLoading(false);
      }
      return;
    }

    // =========================================================================
    // 👤 PROSES PUBLIK (TERHUBUNG LANGSUNG KE UPSTASH REDIS VIA API)
    // =========================================================================
    if (role === "PUBLIC") {
      try {
        const payload = isRegister
          ? { action: "register", emailOrPhone: inputUser, password: inputPass, nama: namaLengkap }
          : { action: "login", emailOrPhone: inputUser, password: inputPass };

        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          saveSessionAndRedirect(data.user, "/");
        } else {
          setErrorMsg(data.error || "Gagal memproses akun.");
          setIsLoading(false);
        }
      } catch {
        setErrorMsg("Terjadi gangguan saat menghubungkan ke database server.");
        setIsLoading(false);
      }
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#006837]" />
          <span>Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

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

        {/* TAB ROLE */}
        <div className="p-6">
          {activeUser ? (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <p className="text-emerald-900 font-bold">Sesi Anda Masih Aktif</p>
                <p className="text-emerald-700 mt-0.5">{activeUser.nama}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(activeUser.role === "ADMIN" ? "/admin" : "/")}
                  className="px-3 py-1.5 bg-[#006837] text-white font-semibold rounded-xl hover:bg-[#00522c] cursor-pointer"
                >
                  Lanjut
                </button>
                <button
                  type="button"
                  onClick={handleClearSession}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                  title="Ganti Akun / Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
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
          )}

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {role === "ADMIN" ? (
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
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#006837] hover:bg-[#00522c] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  {role === "ADMIN" ? (
                    <LogIn className="w-4 h-4" />
                  ) : isRegister ? (
                    <UserPlus className="w-4 h-4" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>
                    {role === "ADMIN"
                      ? "Masuk Panel Admin"
                      : isRegister
                      ? "Daftar Akun Publik"
                      : "Masuk SIPA-NGAWI"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {role === "PUBLIC" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMsg("");
                  setSuccessMsg("");
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