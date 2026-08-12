"use client";

import React, { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Menu,
  FileText,
  Search,
  RefreshCw,
  Send,
  Copy,
  Check,
  RotateCcw,
  X,
  Mic,
  MicOff,
  Printer,
  AlertCircle,
  ChevronDown,
  Mail,
  Download,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/core/text-shimmer";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string;
  formatted?: FormattedAnswer;
}

export interface FormattedAnswer {
  intro?: string;
  sections: FormattedAnswerSection[];
  closing?: string;
}

export interface FormattedAnswerSection {
  title: string;
  body?: string;
  items?: string[];
}

export interface PengaduanData {
  id?: string;
  namaPelapor: string;
  nikPelapor?: string; // NIK Pelapor
  laporanUntukDataDari: string;
  asalSekolah: string;
  npsn: string;
  noWhatsapp: string;
  kategori: string;
  rincian: string;
  buktiKeluhanPelapor?: string; // Foto bukti kendala pelapor
}

type SpeechRecognitionResultEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (image?: string, quickMessage?: string) => void;
  isLoading?: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
  onNewChat?: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  onPengaduanSubmitted?: (data: PengaduanData) => void;
  isAdminServer?: boolean;
}

const DATABASE_SEKOLAH_NGAWI: { [npsn: string]: { nama: string; jenjang: string } } = {
  "20508506": { nama: "SMPN 2 KARANGJATI", jenjang: "SMP/MTs" },
  "205758857": { nama: "SMPN 3 NGAWI", jenjang: "SMP/MTs" },
  "20546740": { nama: "SMKN 1 NGAWI", jenjang: "SMA/SMK/MA" },
  "20539345": { nama: "SDN MARGOMULYO 1 NGAWI", jenjang: "SD/MI" },
  "20539350": { nama: "SMAN 1 NGAWI", jenjang: "SMA/SMK/MA" },
  "20539352": { nama: "SMAN 2 NGAWI", jenjang: "SMA/SMK/MA" },
  "20508641": { nama: "SD Negeri Tempuran 5", jenjang: "SD/MI" },
};

const DAFTAR_SEKOLAH_NGAWI = [
  { nama: "TK Negeri Pembina Ngawi", jenjang: "TK/PAUD" },
  { nama: "TK Aisyiyah Bustanul Athfal Ngawi", jenjang: "TK/PAUD" },
  { nama: "TK Aisyiyah 1 Karangjati", jenjang: "TK/PAUD" },
  { nama: "TK Dharma Wanita Geneng", jenjang: "TK/PAUD" },
  { nama: "TK Pertiwi Padas", jenjang: "TK/PAUD" },
  { nama: "TK Bringin 1", jenjang: "TK/PAUD" },
  { nama: "SDN Margomulyo 1 Ngawi", jenjang: "SD/MI" },
  { nama: "SDN Margomulyo 2 Ngawi", jenjang: "SD/MI" },
  { nama: "SDN Pelem 1 Ngawi", jenjang: "SD/MI" },
  { nama: "SDN Pelem 2 Ngawi", jenjang: "SD/MI" },
  { nama: "SDN Karangjati 1", jenjang: "SD/MI" },
  { nama: "SDN Karangjati 2", jenjang: "SD/MI" },
  { nama: "SDN Bringin 1", jenjang: "SD/MI" },
  { nama: "SDN Bringin 2", jenjang: "SD/MI" },
  { nama: "SDN Padas 1", jenjang: "SD/MI" },
  { nama: "SDN Geneng 1", jenjang: "SD/MI" },
  { nama: "SDN Jogorogo 1", jenjang: "SD/MI" },
  { nama: "SDN Ngrambe 1", jenjang: "SD/MI" },
  { nama: "SDIT Al-Qalam Ngawi", jenjang: "SD/MI" },
  { nama: "MI Negeri 1 Ngawi", jenjang: "SD/MI" },
  { nama: "SD Negeri Tempuran 1", jenjang: "SD/MI" },
  { nama: "SD Negeri Tempuran 2", jenjang: "SD/MI" },
  { nama: "SD Negeri Tempuran 3", jenjang: "SD/MI" },
  { nama: "SD Negeri Tempuran 4", jenjang: "SD/MI" },
  { nama: "SD Negeri Tempuran 5", jenjang: "SD/MI" },
  { nama: "SMPN 1 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 3 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 4 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 5 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Karangjati", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Karangjati", jenjang: "SMP/MTs" },
  { nama: "SMPN 3 Karangjati", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Bringin", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Bringin", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Pangkur", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Geneng", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Padas", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Paron", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Ngrambe", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Jogorogo", jenjang: "SMP/MTs" },
  { nama: "MTsN 1 Ngawi", jenjang: "SMP/MTs" },
  { nama: "MTsN 3 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMAN 1 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "SMAN 2 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "SMAN 1 Karangjati", jenjang: "SMA/SMK/MA" },
  { nama: "SMAN 1 Jogorogo", jenjang: "SMA/SMK/MA" },
  { nama: "SMAN 1 Geneng", jenjang: "SMA/SMK/MA" },
  { nama: "SMAN 1 Ngrambe", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 1 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 2 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 1 Geneng", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 1 Bringin", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 1 Kasreman", jenjang: "SMA/SMK/MA" },
  { nama: "SMKN 1 Paron", jenjang: "SMA/SMK/MA" },
  { nama: "MAN 1 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "MAN 2 Ngawi", jenjang: "SMA/SMK/MA" },
];

const DAFTAR_SUBJEK_DATA = [
  "Murid / Siswa",
  "Guru / PTK",
  "Kepala Sekolah",
  "Operator Sekolah (OPS)",
];

const DAFTAR_KATEGORI_KENDALA = [
  "Kendala Data PTK-Guru dan Penginputan Siswa",
  "Gagal Sinkronisasi Dapodik",
  "Residu VervalPD / VervalPTK",
  "Mutasi / Penarikan Siswa",
  "Perubahan Jam Mengajar (JP) Backend",
  "NIK Terkunci / Residu Ganda",
  "Buka Kunci DPA / Server Dinas",
  "Mutasi PTK / Peserta Didik Lintas Kabupaten",
  "Keterangan Tambahan / Kendala Lainnya",
];

function parseBoldText(text: string) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-neutral-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedTextContent({ content }: { content: string }) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  if (!content) return null;

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-neutral-800 leading-relaxed">
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith("```") && part.endsWith("```")) {
          const rawCode = part.slice(3, -3).trim();
          const lines = rawCode.split("\n");
          const firstLine = lines[0].trim();
          const isLangHeader = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = isLangHeader ? firstLine : "code";
          const codeText = isLangHeader ? lines.slice(1).join("\n") : rawCode;

          const handleCopyCode = () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(codeText);
              setCopiedCodeIndex(index);
              setTimeout(() => setCopiedCodeIndex(null), 2000);
            }
          };

          return (
            <div
              key={`code-block-${index}`}
              className="my-3 rounded-xl border border-neutral-800 bg-[#1E1E1E] text-neutral-100 overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-neutral-700 text-xs font-mono text-neutral-400">
                <span className="uppercase tracking-wider font-semibold">{language}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 transition-colors text-xs cursor-pointer"
                >
                  {copiedCodeIndex === index ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 font-medium">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed text-neutral-200">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split("\n");
        const elements: React.ReactNode[] = [];
        let currentListItems: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (currentListItems.length > 0) {
            elements.push(
              <ul key={`ul-${keyPrefix}`} className="list-disc pl-5 space-y-1.5 text-neutral-800 my-3">
                {currentListItems.map((item, idx) => (
                  <li key={`li-${keyPrefix}-${idx}`} className="leading-relaxed">
                    {parseBoldText(item)}
                  </li>
                ))}
              </ul>
            );
            currentListItems = [];
          }
        };

        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();

          if (!trimmed) {
            flushList(`${index}-${lIdx}`);
            return;
          }

          if (trimmed.startsWith("#")) {
            flushList(`${index}-${lIdx}`);
            const cleanHeading = trimmed.replace(/^#{1,6}\s*/, "").trim();
            elements.push(
              <h3
                key={`head-${index}-${lIdx}`}
                className="text-base sm:text-lg font-bold text-[#006837] pt-3 pb-1 border-b border-neutral-100 mb-2"
              >
                {parseBoldText(cleanHeading)}
              </h3>
            );
            return;
          }

          if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            const cleanItem = trimmed.replace(/^[\*\-\•]\s+/, "").trim();
            currentListItems.push(cleanItem);
            return;
          }

          flushList(`${index}-${lIdx}`);
          elements.push(
            <p
              key={`p-${index}-${lIdx}`}
              className="text-neutral-800 leading-relaxed text-[15px] sm:text-base mb-3 sm:mb-4 last:mb-0"
            >
              {parseBoldText(trimmed)}
            </p>
          );
        });

        flushList(`end-${index}`);

        return <React.Fragment key={`text-part-${index}`}>{elements}</React.Fragment>;
      })}
    </div>
  );
}

export function ChatInterface({
  messages,
  input,
  setInput,
  onSendMessage,
  isLoading,
  onToggleSidebar,
  onNewChat,
  isModalOpen,
  setIsModalOpen,
  onPengaduanSubmitted,
}: ChatInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dropdown Custom
  const [isSekolahDropdownOpen, setIsSekolahDropdownOpen] = useState(false);
  const sekolahDropdownRef = useRef<HTMLDivElement>(null);

  const [isSubjekDropdownOpen, setIsSubjekDropdownOpen] = useState(false);
  const subjekDropdownRef = useRef<HTMLDivElement>(null);

  const [isKategoriDropdownOpen, setIsKategoriDropdownOpen] = useState(false);
  const kategoriDropdownRef = useRef<HTMLDivElement>(null);

  // State Form Pengaduan Lengkap (Termasuk NIK & Foto Keluhan)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pengaduanSuccess, setPengaduanSuccess] = useState(false);
  const [formData, setFormData] = useState<PengaduanData>({
    namaPelapor: "",
    nikPelapor: "",
    laporanUntukDataDari: "",
    asalSekolah: "",
    npsn: "",
    noWhatsapp: "",
    kategori: "",
    rincian: "",
    buktiKeluhanPelapor: undefined,
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complaintFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [input]);

  const handleNpsnChange = (val: string) => {
    const cleanNpsn = val.trim();
    const matchedSekolah = DATABASE_SEKOLAH_NGAWI[cleanNpsn];

    if (matchedSekolah) {
      setFormData((prev) => ({
        ...prev,
        npsn: cleanNpsn,
        asalSekolah: matchedSekolah.nama,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        npsn: val,
        asalSekolah: "",
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sekolahDropdownRef.current &&
        !sekolahDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSekolahDropdownOpen(false);
      }
      if (
        subjekDropdownRef.current &&
        !subjekDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSubjekDropdownOpen(false);
      }
      if (
        kategoriDropdownRef.current &&
        !kategoriDropdownRef.current.contains(event.target as Node)
      ) {
        setIsKategoriDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "id-ID";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [setInput]);

  const filteredSekolah = DAFTAR_SEKOLAH_NGAWI.filter((item) =>
    item.nama.toLowerCase().includes((formData.asalSekolah || "").toLowerCase())
  );

  const handleOpenBlankComplaintModal = () => {
    setFormData({
      namaPelapor: "",
      nikPelapor: "",
      laporanUntukDataDari: "",
      asalSekolah: "",
      npsn: "",
      noWhatsapp: "",
      kategori: "",
      rincian: "",
      buktiKeluhanPelapor: selectedImage || undefined,
    });
    setPengaduanSuccess(false);
    setIsModalOpen(true);
  };

  const handleOpenComplaintModal = (content: string) => {
    let nama = "";
    let sekolah = "";
    let rincian = "";

    const namaMatch =
      content.match(/Nama Lengkap Pelapor\s*\/[^\:]*:\s*([^\n]+)/i) ||
      content.match(/Nama Lengkap[^\:]*:\s*([^\n]+)/i);
    if (namaMatch) nama = namaMatch[1].trim();

    const sekolahMatch = content.match(/Asal Sekolah[^\:]*:\s*([^\n]+)/i);
    if (sekolahMatch) sekolah = sekolahMatch[1].trim();

    const rincianMatch = content.match(/Rincian Keluhan[^\:]*:\s*([^\n]+)/i);
    if (rincianMatch) rincian = rincianMatch[1].trim();

    setFormData((prev) => ({
      ...prev,
      namaPelapor: nama || prev.namaPelapor,
      asalSekolah: sekolah || prev.asalSekolah,
      rincian: rincian || prev.rincian,
      buktiKeluhanPelapor: selectedImage || prev.buktiKeluhanPelapor,
    }));

    setPengaduanSuccess(false);
    setIsModalOpen(true);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Fitur rekam suara tidak didukung di browser ini.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file gambar maksimal 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplaintImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran berkas gambar maksimal 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          buktiKeluhanPelapor: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    onSendMessage(selectedImage || undefined);
    removeImage();
  };

  const handleQuickAction = (message: string) => {
    if (isLoading) return;
    onSendMessage(undefined, message);
  };

  const handleCopy = (id: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  // SUBMIT PENGADUAN KE SERVER BACKEND & LOCALSTORAGE ADMIN
  const handleSubmitPengaduan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.kategori) {
      alert("Silakan pilih Kategori Kendala terlebih dahulu!");
      return;
    }

    if (!formData.laporanUntukDataDari) {
      alert("Silakan pilih Laporan untuk Data Dari terlebih dahulu!");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: PengaduanData = {
        ...formData,
        buktiKeluhanPelapor: formData.buktiKeluhanPelapor || selectedImage || undefined,
      };

      // POST TERPUSAT KE BACKEND SERVER VERCEL (`/api/tickets`)
      try {
        await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namaPelapor: payload.namaPelapor,
            nikPelapor: payload.nikPelapor,
            noWhatsapp: payload.noWhatsapp,
            asalSekolah: payload.asalSekolah,
            npsn: payload.npsn,
            kategori: payload.kategori,
            rincian: payload.rincian,
            fotoKeluhan: payload.buktiKeluhanPelapor,
            status: "PENDING",
          }),
        });
      } catch (e) {
        console.warn("Server API offline, menyimpan secara lokal:", e);
      }

      // SIMPAN KE LOCALSTORAGE SEBAGAI BACKUP SINKRONISASI
      if (typeof window !== "undefined") {
        try {
          const existingRaw = localStorage.getItem("sipa_rekap_pengaduan_backup") || localStorage.getItem("sipa_rekap_pengaduan");
          const existingData = existingRaw ? JSON.parse(existingRaw) : [];

          const newAdminTicket = {
            id: `TK-00${existingData.length + 1}`,
            namaPelapor: payload.namaPelapor,
            nikPelapor: payload.nikPelapor,
            noWhatsapp: payload.noWhatsapp,
            asalSekolah: payload.asalSekolah,
            npsn: payload.npsn,
            kategori: payload.kategori,
            rincian: payload.rincian,
            fotoKeluhan: payload.buktiKeluhanPelapor,
            status: "PENDING",
            createdAt: new Date().toLocaleDateString("id-ID"),
          };

          const updatedData = [newAdminTicket, ...existingData];
          localStorage.setItem("sipa_rekap_pengaduan_backup", JSON.stringify(updatedData));
          localStorage.setItem("sipa_rekap_pengaduan", JSON.stringify(updatedData));

          window.dispatchEvent(new Event("storage"));
        } catch (err) {
          console.error("Gagal menyimpan ke LocalStorage:", err);
        }
      }

      if (onPengaduanSubmitted) {
        onPengaduanSubmitted(payload);
      }

      setPengaduanSuccess(true);
    } catch (err) {
      console.error("Gagal mengirim pengaduan:", err);
      setPengaduanSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 10) return "Selamat Pagi";
    if (hour >= 10 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const quickActions = [
    {
      id: "quick-inval",
      label: "Solusi Data Inval",
      message: "Bagaimana solusi data inval dan gagal sinkronisasi di Dapodik?",
      icon: RefreshCw,
    },
    {
      id: "quick-mutasi",
      label: "Mutasi Peserta Didik",
      message: "Bagaimana alur mutasi dan penarikan siswa baru?",
      icon: FileText,
    },
    {
      id: "quick-ptk",
      label: "Perbaikan Data PTK",
      message: "Bagaimana prosedur perbaikan data Guru/PTK dan NUPTK?",
      icon: Search,
    },
    {
      id: "quick-verval",
      label: "Residu VervalPD/PTK",
      message: "Bagaimana menyelesaikan residu data pada VervalPD dan VervalPTK?",
      icon: FileText,
    },
  ];

  const renderInputCard = (isCentered: boolean) => {
    return (
      <div
        className={cn(
          "w-full rounded-2xl sm:rounded-3xl border border-neutral-200 bg-white shadow-sm focus-within:border-[#006837] focus-within:shadow-md transition-all duration-200 overflow-hidden",
          isCentered ? "mb-5 sm:mb-6" : ""
        )}
      >
        {imagePreview && (
          <div className="px-3 sm:px-4 pt-3 pb-1">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview Lampiran"
                className="h-16 sm:h-20 rounded-lg border object-cover border-neutral-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isCentered
              ? "Tanyakan kendala Dapodik, VervalPD, VervalPTK, atau Kebudayaan..."
              : "Tulis pesan..."
          }
          className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-neutral-800 placeholder-neutral-400 text-[15px] sm:text-base py-3 sm:py-3.5 px-3 sm:px-4 resize-none min-h-[44px] sm:min-h-[48px] max-h-[160px] overflow-y-auto"
        />

        <div className="flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3 pt-0">
          <div className="flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
              title="Upload tangkapan layar/dokumen"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 shrink-0 cursor-pointer",
                isListening
                  ? "bg-red-50 text-red-500 hover:bg-red-100 animate-pulse border border-red-200"
                  : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              )}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? "Hentikan Rekaman" : "Input Suara"}
              type="button"
            >
              {isListening ? (
                <MicOff className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              ) : (
                <Mic className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              )}
            </Button>

            <button
              type="button"
              className="rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 flex items-center justify-center disabled:opacity-30 border border-transparent shadow-sm shrink-0 cursor-pointer"
              style={{
                backgroundColor:
                  input.trim() || selectedImage ? "#006837" : "#F3F4F6",
                color: input.trim() || selectedImage ? "#FFFFFF" : "#9CA3AF",
              }}
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-w-0 flex-col w-full h-full overflow-hidden relative bg-[#FAFAFA]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-sm border-t-4 border-t-[#006837]">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-neutral-700 hover:bg-neutral-100 rounded-lg shrink-0 cursor-pointer"
            onClick={onToggleSidebar}
            type="button"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex flex-col items-start min-w-0">
            <img
              src="/Asisten-Virtual-SIPA-NGAWI.png"
              alt="Logo SIPA-NGAWI Disdikbud Ngawi"
              className="h-12 sm:h-16 w-auto object-contain drop-shadow-sm"
            />
            <p className="text-[10px] sm:text-xs text-neutral-500 font-medium tracking-tight truncate">
              Asisten Virtual Disdikbud Kabupaten Ngawi
            </p>
          </div>
        </div>

        {onNewChat && messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1.5 text-xs text-neutral-600 hover:text-[#006837] hover:bg-green-50 rounded-full border-neutral-200 shrink-0 ml-2 cursor-pointer"
            type="button"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Obrolan Baru</span>
          </Button>
        )}
      </div>

      {messages.length === 0 ? (
        /* Landing Screen */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full min-h-0">
          <div className="min-h-full w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-6 sm:py-10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
              <div className="h-16 sm:h-24 w-auto relative flex-shrink-0 flex items-center justify-center">
                <img
                  src="/Asisten-Virtual-Logo-SIPA-NGAWI.png"
                  alt="Logo SIPA-NGAWI"
                  className="h-full w-auto object-contain drop-shadow-md"
                />
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#006837] tracking-tight leading-tight">
                  {getGreetingText()} 🙏, Bapak/Ibu Operator &amp; Guru!
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Selamat datang di SIPA-NGAWI Disdikbud Kabupaten Ngawi. Ada kendala Dapodik yang bisa dibantu?
                </p>
              </div>
            </div>

            {renderInputCard(true)}

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:px-2">
              <button
                type="button"
                onClick={handleOpenBlankComplaintModal}
                className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-sm font-semibold rounded-full border border-green-300 bg-green-50 text-[#006837] hover:bg-[#006837] hover:text-white transition-all duration-200 shadow-sm col-span-2 sm:col-span-1 cursor-pointer"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Buat Pengaduan Dapodik</span>
              </button>

              {quickActions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleQuickAction(action.message)}
                    className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-sm font-medium rounded-full border border-neutral-200 bg-white text-neutral-600 hover:text-[#006837] hover:bg-green-50 hover:border-green-300 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-[#006837] shrink-0" />
                    <span className="min-w-0 truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Active Chat Screen */
        <>
          <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 px-3 py-5 sm:p-6 sm:py-8">
              {messages.map((message, idx) => {
                const prevUserMsg =
                  idx > 0 && messages[idx - 1].role === "user"
                    ? messages[idx - 1].content.toLowerCase()
                    : "";

                const isDeveloperQuery = [
                  "developer",
                  "pembuat",
                  "dikembangkan",
                  "merancang",
                  "maulana",
                  "siapa kamu",
                ].some((kw) => prevUserMsg.includes(kw));

                const isComplaintResponse =
                  message.role === "assistant" &&
                  !isDeveloperQuery &&
                  /buat pengaduan|formulir pengaduan|lapor|tiket pengaduan|sertakan detail data diri/i.test(
                    message.content
                  );

                return (
                  <div key={message.id} className="w-full">
                    {message.role === "user" ? (
                      <div className="flex flex-col items-end w-full">
                        <div className="bg-[#006837] text-white rounded-2xl rounded-tr-sm px-3.5 sm:px-4 py-2.5 max-w-[92%] sm:max-w-lg shadow-sm">
                          {message.image && (
                            <img
                              src={message.image}
                              alt="Dokumen Terlampir"
                              className="max-w-full max-h-[250px] sm:max-h-[300px] rounded-lg mb-2 object-contain"
                            />
                          )}
                          <p className="whitespace-pre-wrap text-[15px] sm:text-sm leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                        <span className="text-[10px] mt-1.5 text-neutral-400 font-medium mr-1">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-start py-4 sm:py-5 border-b border-neutral-200/60 last:border-b-0">
                        <div className="text-neutral-800 w-full">
                          <FormattedTextContent content={message.content} />
                        </div>

                        {isComplaintResponse && (
                          <div className="w-full mt-4 p-4 border border-green-200 bg-green-50/80 rounded-2xl space-y-3 shadow-xs">
                            <div className="flex items-center gap-2 text-[#006837] font-bold text-sm sm:text-base">
                              <AlertCircle className="w-5 h-5 text-[#006837]" />
                              <span>Lengkapi &amp; Kirim Pengaduan Resmi</span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                              Sistem mendeteksi rincian keluhan Anda. Klik tombol di bawah untuk membuka Form Pengaduan Otomatis, menyimpan data ke database Dinas, dan memproses tiket pengaduan.
                            </p>
                            <Button
                              type="button"
                              onClick={() => handleOpenComplaintModal(message.content)}
                              className="w-full sm:w-auto bg-[#006837] hover:bg-[#00522c] text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              Buka Form &amp; Buat Pengaduan Dapodik
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center mt-3 sm:mt-4">
                          <button
                            type="button"
                            onClick={() => handleCopy(message.id, message.content)}
                            className="text-neutral-400 hover:text-[#006837] transition-colors p-1.5 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 text-xs cursor-pointer"
                            title="Salin Tanggapan"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-green-600 font-medium">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-neutral-500">Salin Solusi</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="w-full flex flex-col items-start py-4 sm:py-5">
                  <TextShimmer
                    className="text-[15px] sm:text-base font-medium text-[#006837]"
                    duration={2.8}
                  >
                    SIPA-NGAWI sedang menyusun solusi Dapodik...
                  </TextShimmer>
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          </ScrollArea>

          <div className="px-3 sm:px-4 pt-2 sm:pt-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] sm:pb-6 bg-[#FAFAFA] shrink-0">
            <div className="max-w-3xl mx-auto">
              {renderInputCard(false)}
              <div className="text-[9px] sm:text-[10px] text-center mt-2 text-neutral-500">
                Layanan Asisten Virtual Resmi Dinas Pendidikan dan Kebudayaan Kabupaten Ngawi.
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL POP-UP FORM PENGADUAN DENGAN NIK & UPLOAD FOTO KELUHAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col border border-neutral-100 relative overflow-hidden">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors bg-white/80 backdrop-blur-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 my-1 mr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-300">
              {!pengaduanSuccess ? (
                <form onSubmit={handleSubmitPengaduan} className="space-y-3.5">
                  <div className="border-b border-neutral-100 pb-2.5 pr-8">
                    <h2 className="text-lg font-bold text-[#006837]">
                      Form Pengaduan Resmi Dapodik
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Disdikbud Kabupaten Ngawi - Notifikasi SLA Waktu Tunggu 5 Hari Kerja
                    </p>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    {/* BARIS 1: NAMA LENGKAP & NIK PELAPOR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Nama Lengkap Pelapor *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.namaPelapor}
                          onChange={(e) =>
                            setFormData({ ...formData, namaPelapor: e.target.value })
                          }
                          placeholder="Contoh: Burhanudin"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          NIK Pelapor / Guru / Operator *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          value={formData.nikPelapor || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, nikPelapor: e.target.value })
                          }
                          placeholder="NIK 16 Digit (sesuai KTP)"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] font-mono"
                        />
                      </div>
                    </div>

                    {/* BARIS 2: ASAL SEKOLAH & NOMOR WHATSAPP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative" ref={sekolahDropdownRef}>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Asal Sekolah *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.asalSekolah}
                            onFocus={() => setIsSekolahDropdownOpen(true)}
                            onChange={(e) => {
                              setFormData({ ...formData, asalSekolah: e.target.value });
                              setIsSekolahDropdownOpen(true);
                            }}
                            placeholder="Ketik / pilih sekolah..."
                            className="w-full px-3 py-2 pr-8 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] bg-white text-xs sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setIsSekolahDropdownOpen(!isSekolahDropdownOpen)}
                            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400 hover:text-[#006837] transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                isSekolahDropdownOpen ? "rotate-180 text-[#006837]" : ""
                              )}
                            />
                          </button>
                        </div>

                        {isSekolahDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg text-xs divide-y divide-neutral-100">
                            {filteredSekolah.length > 0 ? (
                              filteredSekolah.map((sekolah, idx) => (
                                <button
                                  key={`sekolah-${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, asalSekolah: sekolah.nama });
                                    setIsSekolahDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-green-50 hover:text-[#006837] transition-colors flex justify-between items-center cursor-pointer"
                                >
                                  <span className="font-medium text-neutral-800">
                                    {sekolah.nama}
                                  </span>
                                  <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                                    {sekolah.jenjang}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2.5 text-neutral-400 italic text-center">
                                Sekolah tidak ditemukan (Ketik manual)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">
                          Nomor WhatsApp Aktif *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.noWhatsapp}
                          onChange={(e) =>
                            setFormData({ ...formData, noWhatsapp: e.target.value })
                          }
                          placeholder="081234567890"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837]"
                        />
                      </div>
                    </div>

                    {/* BARIS 3: SUBJEK DATA & NPSN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative" ref={subjekDropdownRef}>
                        <label className="block font-semibold text-neutral-700 mb-1 text-xs">
                          Laporan untuk Data Dari *
                        </label>
                        <div
                          onClick={() => setIsSubjekDropdownOpen(!isSubjekDropdownOpen)}
                          className="relative w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] bg-white text-xs sm:text-sm cursor-pointer select-none h-10 flex items-center justify-center"
                        >
                          <span
                            className={cn(
                              "truncate font-medium text-center w-full",
                              formData.laporanUntukDataDari ? "text-neutral-800" : "text-neutral-400"
                            )}
                          >
                            {formData.laporanUntukDataDari || "---- Pilih Menu Laporan ----"}
                          </span>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-neutral-500 transition-transform duration-200",
                                isSubjekDropdownOpen ? "rotate-180 text-[#006837]" : ""
                              )}
                            />
                          </div>
                        </div>

                        {isSubjekDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg text-xs divide-y divide-neutral-100">
                            {DAFTAR_SUBJEK_DATA.map((subjek, idx) => (
                              <button
                                key={`subjek-${idx}`}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, laporanUntukDataDari: subjek });
                                  setIsSubjekDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-green-50 hover:text-[#006837] transition-colors font-medium flex items-center justify-between cursor-pointer"
                              >
                                <span>{subjek}</span>
                                {formData.laporanUntukDataDari === subjek && (
                                  <Check className="w-3.5 h-3.5 text-[#006837]" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1 text-xs">
                          NPSN Sekolah *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.npsn}
                          onChange={(e) => handleNpsnChange(e.target.value)}
                          placeholder="Ketik NPSN (cth: 205XXXXX)"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] text-xs sm:text-sm h-10 font-mono"
                        />
                      </div>
                    </div>

                    {/* BARIS 4: KATEGORI KENDALA */}
                    <div className="relative" ref={kategoriDropdownRef}>
                      <label className="block font-semibold text-neutral-700 mb-1 text-xs">
                        Kategori Kendala *
                      </label>
                      <div
                        onClick={() => setIsKategoriDropdownOpen(!isKategoriDropdownOpen)}
                        className="relative w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] bg-white text-xs sm:text-sm cursor-pointer select-none h-10 flex items-center justify-center"
                      >
                        <span
                          className={cn(
                            "truncate font-medium text-center w-full",
                            formData.kategori ? "text-neutral-800" : "text-neutral-400"
                          )}
                        >
                          {formData.kategori || "---- Pilih Kategori Kendala ----"}
                        </span>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-neutral-500 transition-transform duration-200",
                              isKategoriDropdownOpen ? "rotate-180 text-[#006837]" : ""
                            )}
                          />
                        </div>
                      </div>

                      {isKategoriDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg text-xs divide-y divide-neutral-100">
                          {DAFTAR_KATEGORI_KENDALA.map((kat, idx) => (
                            <button
                              key={`kategori-${idx}`}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, kategori: kat });
                                setIsKategoriDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-green-50 hover:text-[#006837] transition-colors font-medium flex items-center justify-between cursor-pointer"
                            >
                              <span>{kat}</span>
                              {formData.kategori === kat && (
                                <Check className="w-3.5 h-3.5 text-[#006837] shrink-0 ml-2" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BARIS 5: RINCIAN KELUHAN */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1 text-xs">
                        Rincian Keluhan / Deskripsi *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formData.rincian}
                        onChange={(e) =>
                          setFormData({ ...formData, rincian: e.target.value })
                        }
                        placeholder="Tuliskan rincian keluhan atau deskripsi kendala..."
                        className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] resize-none"
                      />
                    </div>

                    {/* BARIS 6: UNGGAH FOTO LAMPIRAN KELUHAN PELAPOR */}
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1 text-xs">
                        Unggah Tangkapan Layar / Foto Bukti Kendala (Opsional)
                      </label>
                      <input
                        type="file"
                        ref={complaintFileInputRef}
                        accept="image/*"
                        onChange={handleComplaintImageSelect}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => complaintFileInputRef.current?.click()}
                          className="px-3.5 py-2 border border-emerald-300 bg-emerald-50 text-[#006837] rounded-xl text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Pilih Foto Kendala</span>
                        </button>
                        {formData.buktiKeluhanPelapor && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-emerald-700 font-medium">
                              Foto terlampir
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, buktiKeluhanPelapor: undefined })}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-full border-neutral-300 px-4 py-2 text-xs cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#006837] hover:bg-[#00522c] text-white rounded-full px-5 py-2 text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isSubmitting ? (
                        "Memproses..."
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Kirim Pengaduan Official
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* MODAL KONFIRMASI PENGADUAN BERHASIL */
                <div id="transkrip-pdf" className="space-y-4 text-neutral-800">
                  <div className="text-center border-b border-neutral-200 pb-3 pr-8">
                    <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-6 h-6 text-[#006837]" />
                    </div>
                    <h3 className="font-bold text-base text-[#006837]">
                      Pengaduan Berhasil Diteruskan ke Server Dinas!
                    </h3>

                    <div className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-center gap-2 font-medium">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Batas Waktu Penanganan SLA Admin Dinas: <strong>Maksimal 5 Hari Kerja</strong>.
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#006837] text-white font-semibold">
                        <tr>
                          <th className="p-2.5 whitespace-nowrap">No Tiket</th>
                          <th className="p-2.5 whitespace-nowrap">Tanggal</th>
                          <th className="p-2.5 whitespace-nowrap">Pelapor &amp; NIK</th>
                          <th className="p-2.5 whitespace-nowrap">Subjek Data</th>
                          <th className="p-2.5 whitespace-nowrap">Sekolah / NPSN</th>
                          <th className="p-2.5 whitespace-nowrap">No. WA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        <tr className="hover:bg-neutral-50">
                          <td className="p-2.5 font-bold text-neutral-700 whitespace-nowrap">#1</td>
                          <td className="p-2.5 whitespace-nowrap">{new Date().toLocaleDateString("id-ID")}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-bold text-neutral-800">{formData.namaPelapor || "-"}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">NIK: {formData.nikPelapor || "-"}</div>
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-800 whitespace-nowrap">
                            {formData.laporanUntukDataDari || "Operator Sekolah (OPS)"}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="font-semibold text-neutral-800">{formData.asalSekolah || "-"}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">NPSN: {formData.npsn || "-"}</div>
                          </td>
                          <td className="p-2.5 font-mono whitespace-nowrap">{formData.noWhatsapp || "-"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                      <Mail className="w-4 h-4 text-[#006837]" />
                      <span className="truncate max-w-[200px] sm:max-w-xs">Terkirim ke: avidusfathcorp@gmail.com</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrintPDF}
                        className="rounded-full text-xs flex items-center gap-1.5 border-neutral-300 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh PDF
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePrintPDF}
                        className="bg-[#006837] hover:bg-[#00522c] text-white rounded-full text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        className="rounded-full text-xs px-5 cursor-pointer"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}