"use client";

import React, { useState, useEffect } from "react";

interface AdminVerifyModalProps {
  ticket: {
    noWhatsapp: string;
    namaPelapor: string;
    asalSekolah: string;
    npsn: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminVerifyModal({
  ticket,
  onClose,
  onSuccess,
}: AdminVerifyModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // State Pengaturan Email Dinas
  const [targetEmail, setTargetEmail] = useState<string>("");
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<boolean>(false);

  // Ambil email aktif saat modal terbuka via /api/chat
  useEffect(() => {
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_admin_config" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.targetEmail) setTargetEmail(data.targetEmail);
      })
      .catch((err) => console.warn("Gagal memuat email dinas:", err));
  }, []);

  // Simpan email dinas baru via /api/chat
  const handleSaveEmail = async () => {
    if (!targetEmail || !targetEmail.includes("@")) {
      alert("Harap masukkan format email yang valid!");
      return;
    }

    setIsSavingEmail(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_admin_config",
          email: targetEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan email dinas.");
      }

      setEmailSaveSuccess(true);
      setTimeout(() => setEmailSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan email dinas.";
      alert(`Gagal: ${msg}`);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmitVerification = async () => {
    if (!selectedFile) {
      alert("Harap pilih file dokumen/bukti pembetulan terlebih dahulu!");
      return;
    }

    setIsLoading(true);
    setStatusMessage("1/2 Mengunggah berkas bukti...");

    try {
      const base64Data = await convertFileToBase64(selectedFile);

      const uploadRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_proof",
          fileBase64: base64Data,
          fileName: selectedFile.name,
        }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Gagal mengunggah berkas bukti.");
      }

      const generatedUrl = uploadData.urlBukti;

      setStatusMessage("2/2 Mengirimkan notifikasi WhatsApp...");

      const waRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_wa_notification",
          noWhatsapp: ticket.noWhatsapp,
          namaPelapor: ticket.namaPelapor,
          asalSekolah: ticket.asalSekolah,
          npsn: ticket.npsn,
          urlBukti: generatedUrl,
        }),
      });

      const waData = await waRes.json();

      if (!waRes.ok || !waData.success) {
        throw new Error(
          waData.error || "Gagal mengirimkan notifikasi WhatsApp."
        );
      }

      alert(
        `✅ Berhasil! Pengaduan diselesaikan dan notifikasi WA dikirim ke ${ticket.noWhatsapp}`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses verifikasi.";
      console.error("❌ Error Verification Workflow:", err);
      alert(`Terjadi Kendala: ${msg}`);
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900">
          Verifikasi & Selesaikan Tiket
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Unggah foto/dokumen bukti pembetulan data Dapodik untuk{" "}
          <strong>{ticket.asalSekolah}</strong>.
        </p>

        {/* Info Pelapor */}
        <div className="my-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 space-y-1 border border-gray-100">
          <p>
            <strong>Pelapor:</strong> {ticket.namaPelapor}
          </p>
          <p>
            <strong>NPSN:</strong> {ticket.npsn}
          </p>
          <p>
            <strong>WhatsApp:</strong> {ticket.noWhatsapp}
          </p>
        </div>

        {/* Form Upload Berkas Bukti */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Unggah Bukti Perubahan Data (PNG/JPG/PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className="w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-[#006837] focus:outline-none"
          />
        </div>

        {isLoading && (
          <p className="mb-4 text-xs font-semibold text-emerald-700 animate-pulse">
            ⏳ {statusMessage}
          </p>
        )}

        {/* Pengaturan Email Tujuan Notifikasi Rekap Dinas */}
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
          <label className="mb-1 block text-xs font-semibold text-[#006837]">
            Email Tujuan Rekap Tiket Dinas
          </label>
          <p className="text-[11px] text-gray-500 mb-2.5">
            Semua data rekapitulasi aduan publik akan otomatis diteruskan ke email ini.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="dinaspendidikan.ngawi@gmail.com"
              disabled={isSavingEmail}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-[#006837] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveEmail}
              disabled={isSavingEmail}
              className="rounded-lg bg-[#006837] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#00522c] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSavingEmail ? "..." : emailSaveSuccess ? "Tersimpan ✓" : "Simpan"}
            </button>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSubmitVerification}
            disabled={isLoading || !selectedFile}
            className="rounded-xl bg-[#006837] px-4 py-2 text-xs font-medium text-white hover:bg-[#00522c] disabled:bg-gray-300 transition-colors cursor-pointer"
          >
            {isLoading ? "Memproses..." : "Selesaikan & Kirim WA"}
          </button>
        </div>
      </div>
    </div>
  );
}