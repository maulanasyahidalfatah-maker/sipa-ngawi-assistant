"use client";

import React, { useState } from "react";

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

  // Handler Pilih File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Helper mengubah File menjadi Base64 string
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handler Utama Eksekusi Upload + Kirim WA
  const handleSubmitVerification = async () => {
    if (!selectedFile) {
      alert("Harap pilih file dokumen/bukti pembetulan terlebih dahulu!");
      return;
    }

    setIsLoading(true);
    setStatusMessage("1/2 Mengunggah berkas bukti...");

    try {
      // -------------------------------------------------------------
      // LANGKAH 1: Mengubah File ke Base64 & Upload ke Server
      // -------------------------------------------------------------
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

      // -------------------------------------------------------------
      // LANGKAH 2: Mengirim Notifikasi WhatsApp dengan URL Bukti
      // -------------------------------------------------------------
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
    } catch (err: any) {
      console.error("❌ Error Verification Workflow:", err);
      alert(`Terjadi Kendala: ${err.message || "Gagal memproses verifikasi."}`);
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">
          Verifikasi & Selesaikan Tiket
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Unggah foto/dokumen bukti pembetulan data Dapodik untuk{" "}
          <strong>{ticket.asalSekolah}</strong>.
        </p>

        {/* Info Pelapor */}
        <div className="my-4 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
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

        {/* Input File */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Unggah Bukti Perubahan Data (PNG/JPG/PDF)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Indikator Loading */}
        {isLoading && (
          <p className="mb-4 text-xs font-semibold text-blue-600 animate-pulse">
            ⏳ {statusMessage}
          </p>
        )}

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmitVerification}
            disabled={isLoading || !selectedFile}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {isLoading ? "Memproses..." : "Selesaikan & Kirim WA"}
          </button>
        </div>
      </div>
    </div>
  );
}