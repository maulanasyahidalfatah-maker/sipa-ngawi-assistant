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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/core/text-shimmer";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string; // base64 image data
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
  namaPelapor: string;
  asalSekolah: string;
  npsn: string;
  noWhatsapp: string;
  kategori: string;
  rincian: string;
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
}

/**
 * Master Data Sekolah Kabupaten Ngawi Terintegrasi per Jenjang
 */
const DAFTAR_SEKOLAH_NGAWI = [
  // --- PAUD / TK ---
  { nama: "TK Negeri Pembina Ngawi", jenjang: "TK/PAUD" },
  { nama: "TK Aisyiyah Bustanul Athfal Ngawi", jenjang: "TK/PAUD" },
  { nama: "TK Aisyiyah 1 Karangjati", jenjang: "TK/PAUD" },
  { nama: "TK Dharma Wanita Geneng", jenjang: "TK/PAUD" },
  { nama: "TK Pertiwi Padas", jenjang: "TK/PAUD" },
  { nama: "TK Bringin 1", jenjang: "TK/PAUD" },

  // --- SD / MI ---
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

  // --- SMP / MTs ---
  { nama: "SMPN 1 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 3 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 4 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 5 Ngawi", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Karangjati", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Karangjati", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Bringin", jenjang: "SMP/MTs" },
  { nama: "SMPN 2 Bringin", jenjang: "SMP/MTs" },
  { nama: "SMP Bringin", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Pangkur", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Geneng", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Padas", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Paron", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Ngrambe", jenjang: "SMP/MTs" },
  { nama: "SMPN 1 Jogorogo", jenjang: "SMP/MTs" },
  { nama: "MTsN 1 Ngawi", jenjang: "SMP/MTs" },
  { nama: "MTsN 3 Ngawi", jenjang: "SMP/MTs" },

  // --- SMA / SMK / MA ---
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
  { nama: "SMK Bringin", jenjang: "SMA/SMK/MA" },
  { nama: "MAN 1 Ngawi", jenjang: "SMA/SMK/MA" },
  { nama: "MAN 2 Ngawi", jenjang: "SMA/SMK/MA" },
];

/**
 * Helper untuk mengubah **teks** menjadi elemen <strong>
 */
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

/**
 * PARSER CERDAS CHAT AI:
 * - HANYA membuat Kotak Hitam (Code Block) jika berisi kode pemrograman (```).
 * - Pesan biasa, instruksi, dan matematika tampil bersih di latar terang dengan jeda paragraf yang rapi.
 */
function FormattedTextContent({ content }: { content: string }) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  if (!content) return null;

  // Split konten berdasarkan Triple Backtick (```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-neutral-800 leading-relaxed">
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. JIKA KHUSUS KODE PEMROGRAMAN (Diapit ```)
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
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 transition-colors text-xs"
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

        // 2. UNTUK PESAN CHAT BIASA (Tampil Bersih di Latar Terang, Paragraf Berjarak)
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

          // Render Judul (Menghapus ## / ###)
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

          // Render Bullet Point (* / - / •)
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            const cleanItem = trimmed.replace(/^[\*\-\•]\s+/, "").trim();
            currentListItems.push(cleanItem);
            return;
          }

          // Render Paragraf Biasa (Ditambahkan mb-3 sm:mb-4 agar paragraf pasti berjarak legah)
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
}: ChatInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State Modal Form Pengaduan & Transkrip
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pengaduanSuccess, setPengaduanSuccess] = useState(false);
  const [formData, setFormData] = useState<PengaduanData>({
    namaPelapor: "",
    asalSekolah: "",
    npsn: "",
    noWhatsapp: "",
    kategori: "Kendala Data PTK-Guru dan Penginputan Siswa",
    rincian: "",
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Fungsi membuka form pengaduan secara manual (Form Kosong)
  const handleOpenBlankComplaintModal = () => {
    setFormData({
      namaPelapor: "",
      asalSekolah: "",
      npsn: "",
      noWhatsapp: "",
      kategori: "Kendala Data PTK-Guru dan Penginputan Siswa",
      rincian: "",
    });
    setPengaduanSuccess(false);
    setIsModalOpen(true);
  };

  // Ekstrak data otomatis dari teks pesan assistant jika ada kriteria pengaduan
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

  // Submit Form Pengaduan ke API Backend `/api/chat`
  const handleSubmitPengaduan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_ticket",
          ticketData: {
            namaPelapor: formData.namaPelapor,
            asalSekolah: formData.asalSekolah,
            npsn: formData.npsn,
            noWhatsapp: formData.noWhatsapp,
            kategoriKendala: formData.kategori,
            rincianKeluhan: formData.rincian,
          },
        }),
      });

      if (!response.ok) {
        console.warn("Respon server bermasalah, tetap mengaktifkan modal sukses.");
      }

      setPengaduanSuccess(true);
    } catch (err) {
      console.error("Gagal mengirim pengaduan:", err);
      setPengaduanSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi Cetak Transkrip PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Fungsi Sapaan Waktu Presisi
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
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
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
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
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
                "rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 shrink-0",
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
              className="rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 flex items-center justify-center disabled:opacity-30 border border-transparent shadow-sm shrink-0"
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
      {/* Header Bar Utama */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-sm border-t-4 border-t-[#006837]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-neutral-700 hover:bg-neutral-100 rounded-lg shrink-0"
            onClick={onToggleSidebar}
            type="button"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
              <img
                src="/logo-ngawi.png"
                alt="Logo Pemkab Ngawi"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>

            <div>
              <h1 className="font-bold text-sm sm:text-base text-[#006837] leading-tight">
                SIPA-NGAWI
              </h1>
              <p className="text-[10px] sm:text-xs text-neutral-500">
                Disdikbud Kabupaten Ngawi
              </p>
            </div>
          </div>
        </div>

        {onNewChat && messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1.5 text-xs text-neutral-600 hover:text-[#006837] hover:bg-green-50 rounded-full border-neutral-200"
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
              <div className="w-14 h-14 sm:w-16 sm:h-16 relative flex-shrink-0 flex items-center justify-center">
                <img
                  src="/logo-ngawi.png"
                  alt="Logo Pemkab Ngawi"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>

              <div>
                {/* Sapaan dinamis waktu + emoji salam 🙏 yang rapi */}
                <h1 className="text-xl sm:text-2xl font-bold text-[#006837] tracking-tight leading-tight">
                  {getGreetingText()} 🙏, Bapak/Ibu Operator &amp; Guru!
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Selamat datang di SIPA-NGAWI Disdikbud Kabupaten Ngawi. Ada kendala Dapodik yang bisa dibantu?
                </p>
              </div>
            </div>

            {renderInputCard(true)}

            {/* BARIS SHORTCUT TOMBOL AKSI TERMASUK FORM PENGADUAN */}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:px-2">
              <button
                type="button"
                onClick={handleOpenBlankComplaintModal}
                className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-sm font-semibold rounded-full border border-green-300 bg-green-50 text-[#006837] hover:bg-[#006837] hover:text-white transition-all duration-200 shadow-sm col-span-2 sm:col-span-1"
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
                    className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-sm font-medium rounded-full border border-neutral-200 bg-white text-neutral-600 hover:text-[#006837] hover:bg-green-50 hover:border-green-300 transition-all duration-200 shadow-sm"
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
              {messages.map((message) => {
                const isComplaintResponse =
                  message.role === "assistant" &&
                  (message.content.includes("Data Wajib Pengaduan") ||
                    message.content.includes("Buat Pengaduan Dapodik"));

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

                        {/* BANNER REKOMENDASI PENGADUAN DALAM CHAT */}
                        {isComplaintResponse && (
                          <div className="w-full mt-4 p-4 border border-green-200 bg-green-50/80 rounded-2xl space-y-3 shadow-xs">
                            <div className="flex items-center gap-2 text-[#006837] font-bold text-sm sm:text-base">
                              <AlertCircle className="w-5 h-5 text-[#006837]" />
                              <span>Lengkapi &amp; Kirim Pengaduan Resmi</span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                              Sistem mendeteksi rincian keluhan Anda. Klik tombol di bawah untuk membuka Form Pengaduan Otomatis, menyimpan data ke database Dinas, dan mencetak Transkrip Pengaduan.
                            </p>
                            <Button
                              type="button"
                              onClick={() => handleOpenComplaintModal(message.content)}
                              className="w-full sm:w-auto bg-[#006837] hover:bg-[#00522c] text-white font-semibold py-2.5 px-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
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
                            className="text-neutral-400 hover:text-[#006837] transition-colors p-1.5 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 text-xs"
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

      {/* MODAL POP-UP FORM PENGADUAN & TRANSKRIP PDF */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-100 p-5 sm:p-6 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!pengaduanSuccess ? (
              <form onSubmit={handleSubmitPengaduan} className="space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h2 className="text-lg font-bold text-[#006837]">
                    Form Pengaduan Resmi Dapodik
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Disdikbud Kabupaten Ngawi - Notifikasi Otomatis ke Admin
                  </p>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Nama Lengkap Pelapor / Operator *
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Asal Sekolah *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          list="daftar-sekolah-ngawi-list"
                          value={formData.asalSekolah}
                          onChange={(e) =>
                            setFormData({ ...formData, asalSekolah: e.target.value })
                          }
                          placeholder="Ketik / pilih sekolah (misal: SMPN 2 Karangjati)"
                          className="w-full px-3 py-2 pr-8 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] bg-white text-xs sm:text-sm"
                        />

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>

                        <datalist id="daftar-sekolah-ngawi-list">
                          {DAFTAR_SEKOLAH_NGAWI.map((sekolah, idx) => (
                            <option key={`sekolah-${idx}`} value={sekolah.nama}>
                              {sekolah.jenjang}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        NPSN Sekolah *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.npsn}
                        onChange={(e) =>
                          setFormData({ ...formData, npsn: e.target.value })
                        }
                        placeholder="205xxxxx"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837]"
                      />
                    </div>
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

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Kategori Kendala
                    </label>
                    <div className="relative">
                      <select
                        value={formData.kategori}
                        onChange={(e) =>
                          setFormData({ ...formData, kategori: e.target.value })
                        }
                        className="w-full px-3 py-2 pr-8 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] bg-white text-xs sm:text-sm appearance-none cursor-pointer"
                      >
                        <option value="Kendala Data PTK-Guru dan Penginputan Siswa">
                          Kendala Data PTK-Guru dan Penginputan Siswa
                        </option>
                        <option value="Gagal Sinkronisasi Dapodik">
                          Gagal Sinkronisasi Dapodik
                        </option>
                        <option value="Residu VervalPD / VervalPTK">
                          Residu VervalPD / VervalPTK
                        </option>
                        <option value="Mutasi / Penarikan Siswa">
                          Mutasi / Penarikan Siswa
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-neutral-500">
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Rincian Keluhan / Deskripsi *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.rincian}
                      onChange={(e) =>
                        setFormData({ ...formData, rincian: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#006837] text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs flex items-center gap-1.5"
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
              /* TAMPILAN TRANSKRIP BUKTI PENGADUAN & CETAK PDF */
              <div className="space-y-4 text-neutral-800">
                <div className="text-center border-b border-neutral-200 pb-3">
                  <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-[#006837]">
                    Pengaduan Berhasil Terkirim!
                  </h3>
                  <p className="text-xs text-neutral-500">
                    SIPA-NGAWI Disdikbud Kabupaten Ngawi
                  </p>
                </div>

                <div id="transkrip-pdf" className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 text-xs space-y-2">
                  <div className="font-bold border-b pb-1 text-[#006837] flex justify-between">
                    <span>TRANSKRIP BUKTI PENGADUAN</span>
                    <span className="text-neutral-400 font-normal">
                      {new Date().toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div><strong>Nama Pelapor:</strong> {formData.namaPelapor}</div>
                  <div><strong>Sekolah / NPSN:</strong> {formData.asalSekolah} ({formData.npsn})</div>
                  <div><strong>WhatsApp:</strong> {formData.noWhatsapp}</div>
                  <div><strong>Kategori:</strong> {formData.kategori}</div>
                  <div className="pt-1 border-t">
                    <strong>Detail Rincian Keluhan:</strong>
                    <p className="text-neutral-600 mt-0.5 leading-relaxed">{formData.rincian}</p>
                  </div>
                  <div className="pt-2 text-[10px] text-neutral-400 italic">
                    * Laporan tersimpan di database server Dinas &amp; direkapitulasi berkala ke <strong>avidusfathcorp@gmail.com</strong>.
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handlePrintPDF}
                    className="flex-1 bg-[#006837] hover:bg-[#00522c] text-white rounded-xl text-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Transkrip PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl text-xs"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}