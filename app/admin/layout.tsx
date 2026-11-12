"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserCheck, 
  LogOut 
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sipa_user_session");
      document.cookie = "sipa_user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    router.push("/login");
  };

  // Menu navigasi dengan penambahan "Dashboard" di urutan pertama
  const menuItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Layanan Pengaduan", href: "/admin", icon: FileText },
    { name: "Manajemen User", href: "/admin/users", icon: Users },
    { name: "Data Pegawai", href: "/admin/pegawai", icon: UserCheck },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* SIDEBAR NAVIGASI KIRI */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between hidden md:flex shrink-0 shadow-lg z-20 overflow-y-auto">
        <div>
          {/* Header Sidebar ala ARKA */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                S
              </div>
              <div>
                <h2 className="text-white font-bold text-sm tracking-wide">SIPA-NGAWI</h2>
                <p className="text-[10px] text-slate-400">Disdikbud Kab. Ngawi</p>
              </div>
            </div>

            {/* Info Admin Aktif */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center text-xs font-bold">
                A
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">Administrator</p>
                <p className="text-[10px] text-emerald-400 font-medium">Aktif / Online</p>
              </div>
            </div>
          </div>

          {/* Daftar Menu Navigasi */}
          <nav className="p-3 space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Menu Utama</p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#006837] text-white shadow-sm"
                      : "hover:bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tombol Logout di Bawah */}
        <div className="p-3 pb-16 border-t border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-red-950/40 hover:bg-red-900/50 text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA DI KANAN */}
      <main className="flex-1 h-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}