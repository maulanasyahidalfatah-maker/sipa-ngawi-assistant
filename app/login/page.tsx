"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"PUBLIC" | "ADMIN">("PUBLIC");
  const [isRegister, setIsRegister] = useState(false);

  // Form State
  const [emailOrNip, setEmailOrNip] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      document.cookie = `sipa_user_session=${encodeURIComponent(
        sessionString
      )}; path=/; max-age=2592000; SameSite=Lax`;
    }
    router.push(targetPath);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const inputUser = emailOrNip.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg("Mohon isi Email/Nomor WhatsApp dan Password terlebih dahulu.");
      setIsLoading(false);
      return;
    }

    // =========================================================================
    // 🔑 AKUN MASTER DEVELOPER MAULANA (BYPASS)
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
        saveSessionAndRedirect(devAdminSession, "/admin/dashboard");
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
    // 🛡️ LOGIN ADMIN DINAS (VALIDASI DARI MANAJEMEN USER)
    // =========================================================================
    if (role === "ADMIN") {
      let registeredAdmins: any[] = [
        { name: "Administrator Utama", username: "admin.disdik", email: "admin.disdik@ngawikab.go.id", password: "DindikKeb8928", role: "ADMIN", isActive: true }
      ];

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sipa_admin_whitelisted_users");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            registeredAdmins = parsed.filter((u: any) => u.role === "ADMIN");
          } catch {
            // gunakan default
          }
        }
      }

      const matchedAdmin = registeredAdmins.find(
        (a) =>
          (a.email.toLowerCase() === inputUser.toLowerCase() || a.username.toLowerCase() === inputUser.toLowerCase()) &&
          a.password === inputPass
      );

      if (matchedAdmin) {
        if (!matchedAdmin.isActive) {
          setErrorMsg("Akun Administrator ini telah dinonaktifkan.");
          setIsLoading(false);
          return;
        }

        const adminSession = {
          role: "ADMIN",
          nama: matchedAdmin.name,
          email: matchedAdmin.email,
        };
        // Langsung diarahkan ke /admin/dashboard sesuai permintaan
        saveSessionAndRedirect(adminSession, "/admin/dashboard");
      } else {
        setErrorMsg("Username/Email Admin atau Password salah! Periksa kembali data di Manajemen User.");
        setIsLoading(false);
      }
      return;
    }

    // =========================================================================
    // 👤 LOGIN & REGISTER PUBLIK (OPERATOR / GURU)
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
          setIsLoading(false);
          return;
        }

        const isExist = registeredUsers.some(
          (u) => u.email.toLowerCase() === inputUser.toLowerCase()
        );

        if (isExist) {
          setErrorMsg("Email / Nomor WhatsApp sudah terdaftar. Silakan lakukan login.");
          setIsLoading(false);
          return;
        }

        const newUser = {
          nama: namaLengkap.trim(),
          email: inputUser,
          password: inputPass,
        };

        registeredUsers.push(newUser);
        localStorage.setItem("sipa_registered_users", JSON.stringify(registeredUsers));

        const publicSession = {
          role: "PUBLIC",
          nama: newUser.nama,
          email: newUser.email,
        };
        saveSessionAndRedirect(publicSession, "/");
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
          const autoPublicSession = {
            role: "PUBLIC",
            nama: inputUser.split("@")[0] || "Operator Sekolah",
            email: inputUser,
          };
          saveSessionAndRedirect(autoPublicSession, "/");
        }
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 font-sans overflow-hidden">
      
      {/* BACKGROUND GRADASI DINAS ELEGAN */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-[#004d28] to-[#006837]" />
      
      {/* ORNAMEN LATAR BELAKANG HALUS */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* KARTU FORM LOGIN (GLASSMORPHISM) */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        
        {/* HEADER BRANDING */}
        <div className="bg-[#006837] text-white p-6 text-center relative shadow-inner">
          <h2 className="text-xl font-bold">SIPA-NGAWI System</h2>
          <p className="text-xs text-green-100 mt-1">
            Portal Akses Masuk Pengguna Publik &amp; Administrator Dinas
          </p>
        </div>

        {/* TAB ROLE */}
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
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-[11px] leading-relaxed">
                  <strong>Keamanan Panel Admin:</strong> Hanya akun Administrator yang terdaftar di menu Manajemen User yang diizinkan masuk.
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username / Email Dinas *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={emailOrNip}
                      onChange={(e) => setEmailOrNip(e.target.value)}
                      placeholder="admin.disdik / admin.disdik@ngawikab.go.id"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837] focus:bg-white transition-all font-normal text-slate-800"
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837] focus:bg-white transition-all font-normal text-slate-800"
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
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837] focus:bg-white transition-all font-normal text-slate-800"
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837] focus:bg-white transition-all font-normal text-slate-800"
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
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#006837] focus:bg-white transition-all font-normal text-slate-800"
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