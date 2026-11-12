"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Trash2, Shield, Mail, Search, X, Lock } from "lucide-react";

interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionRaw = localStorage.getItem("sipa_user_session");
      if (!sessionRaw) {
        router.push("/login");
        return;
      }

      // Ambil data user yang tersimpan di localStorage atau gunakan default bersih
      const savedUsers = localStorage.getItem("sipa_admin_whitelisted_users");
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          // Filter atau bersihkan data lama (seperti burhanudin jika tersisa)
          const cleaned = parsed.filter((u: any) => !u.name.toLowerCase().includes("burhanudin"));
          setUsers(cleaned);
        } catch {
          initDefaultCleanUsers();
        }
      } else {
        initDefaultCleanUsers();
      }
    }
  }, [router]);

  const initDefaultCleanUsers = () => {
    const defaultList: UserAccount[] = [
      { id: "1", name: "Administrator Utama", username: "admin.disdik", email: "admin.disdik@ngawikab.go.id", password: "DindikKeb8928", role: "ADMIN", isActive: true },
    ];
    setUsers(defaultList);
    localStorage.setItem("sipa_admin_whitelisted_users", JSON.stringify(defaultList));
  };

  const persistUsers = (updatedList: UserAccount[]) => {
    setUsers(updatedList);
    localStorage.setItem("sipa_admin_whitelisted_users", JSON.stringify(updatedList));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newEmail || !newPassword) return;

    const newUser: UserAccount = {
      id: Date.now().toString(),
      name: newName,
      username: newUsername,
      email: newEmail,
      password: newPassword,
      role: newRole,
      isActive: true,
    };

    const updated = [newUser, ...users];
    persistUsers(updated);

    setNewName("");
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setIsAddModalOpen(false);
  };

  const toggleActiveStatus = (id: string) => {
    const updated = users.map(u => (u.id === id ? { ...u, isActive: !u.isActive } : u));
    persistUsers(updated);
  };

  const deleteUser = (id: string) => {
    if (confirm("Yakin ingin menghapus akun pengguna ini dari sistem?")) {
      const updated = users.filter(u => u.id !== id);
      persistUsers(updated);
    }
  };

  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#006837]" /> Manajemen Pengguna Sistem (Admin Panel)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola hak akses akun Administrator Dinas. Password admin yang terdaftar di sini akan langsung terhubung dengan sistem login.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#006837] w-60 font-normal text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#006837] text-white font-semibold">
            <tr>
              <th className="p-3.5 w-12 text-center">No</th>
              <th className="p-3.5">Nama Lengkap</th>
              <th className="p-3.5">Username &amp; Email</th>
              <th className="p-3.5">Role Akses</th>
              <th className="p-3.5 text-center">Password Terdaftar</th>
              <th className="p-3.5 text-center">Status Akun</th>
              <th className="p-3.5 text-center">Aksi Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                  Tidak ada data pengguna yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredUsers.map((usr, idx) => (
                <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-400 text-center">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900">{usr.name}</td>
                  <td className="p-3.5">
                    <div className="font-medium text-slate-800">{usr.username}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {usr.email}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        usr.role === "ADMIN" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      <Shield className="w-3 h-3" /> {usr.role}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-semibold text-slate-600">
                    {usr.password || "••••••••"}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActiveStatus(usr.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        usr.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {usr.isActive ? "AKTIF" : "DIBLOKIR"}
                    </button>
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => deleteUser(usr.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 mx-auto"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full relative shadow-2xl">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tambah Akun Pengguna Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Masukkan kredensial dan password kustom untuk akses sistem.</p>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-normal text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin.baru"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-normal text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Kedinasan *</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: admin@ngawikab.go.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-normal text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Login *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: DindikKeb8928"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] font-mono font-normal text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Akses *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "ADMIN" | "USER")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#006837] bg-white font-semibold text-slate-800"
                >
                  <option value="USER">User / Operator Sekolah</option>
                  <option value="ADMIN">Administrator Dinas (Admin Panel)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl cursor-pointer">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl font-semibold cursor-pointer">
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}