"use client";

import React, { useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatInterface, type FormattedAnswer, type Message } from "@/components/chat-interface";
import { jsPDF } from "jspdf";

function isFormattedAnswer(value: unknown): value is FormattedAnswer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<FormattedAnswer>;

  return (
    Array.isArray(data.sections) &&
    data.sections.every((section) => {
      return Boolean(
        section &&
          typeof section === "object" &&
          typeof section.title === "string" &&
          (!section.body || typeof section.body === "string") &&
          (!section.items ||
            (Array.isArray(section.items) &&
              section.items.every((item) => typeof item === "string")))
      );
    })
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<"chat" | "form">("chat");

  // Fungsi untuk memicu pembukaan Modal Form Pengaduan dari Sidebar
  const handleOpenFormModal = () => {
    setCurrentMode("form");
    setIsSidebarOpen(false);

    // Cari tombol pemicu 'Buat Pengaduan Dapodik' di dalam interface dan klik secara otomatis
    setTimeout(() => {
      const triggerBtn = document.querySelector(
        'button:has(svg), button[type="button"]'
      ) as HTMLButtonElement;

      // Cari spesifik tombol pengaduan di DOM
      const buttons = Array.from(document.querySelectorAll("button"));
      const complaintBtn = buttons.find((btn) =>
        btn.textContent?.includes("Buat Pengaduan Dapodik")
      );

      if (complaintBtn) {
        complaintBtn.click();
      }
    }, 100);
  };

  const handleSendMessage = async (image?: string, quickMessage?: string) => {
    const messageContent = quickMessage || input;
    if (!messageContent.trim() && !image) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent || (image ? "Tolong analisis dokumen/gambar ini" : ""),
      timestamp: new Date(),
      image: image,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = messageContent;
    setInput("");
    setIsLoading(true);

    try {
      // Prepare history for context (exclude the current message)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          history: history,
          image: image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Terjadi kesalahan pada sistem");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Mohon maaf, tidak ada balasan dari server.",
        timestamp: new Date(),
        ...(isFormattedAnswer(data.formatted) ? { formatted: data.formatted } : {}),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan periksa koneksi internet Anda lalu coba lagi. 🙏",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentMode("chat");
  };

  const handleDownloadTranscript = async () => {
    if (messages.length === 0) {
      alert("Belum ada percakapan untuk diunduh.");
      return;
    }

    const doc = new jsPDF();

    // Helper function to replace emojis and markdown with readable plain text for PDF
    const cleanTextForPDF = (text: string) => {
      return text
        .replace(/#{1,6}\s?/g, "") // Hapus hashtag markdown
        .replace(/\*\*(.*?)\*\*/g, "$1") // Hapus bold markdown
        .replace(/\*(.*?)\*/g, "$1") // Hapus italic markdown
        .replace(/🚧/g, "(!) ")
        .replace(/✅/g, "(v) ")
        .replace(/🙏/g, "")
        .replace(/•/g, "  - ")
        .replace(/📝/g, "* ")
        .replace(/📋/g, "* ")
        .replace(/📌/g, "> ")
        .replace(/⚠️/g, "(!!) ")
        .replace(/❌/g, "(X) ")
        .replace(/✔️/g, "(v) ")
        .replace(/🔍/g, "")
        .replace(/📞/g, "[Tel] ")
        .replace(/📧/g, "[Email] ")
        .replace(/📍/g, "[Lokasi] ")
        .replace(/🏢/g, "[Kantor] ")
        .replace(/👤/g, "")
        .replace(/🎓/g, "[SIPA] ")
        .replace(/📱/g, "[HP] ")
        .replace(/💬/g, "")
        .replace(/⏰/g, "[Waktu] ")
        .replace(/📅/g, "[Tanggal] ")
        .replace(/🔔/g, "(!) ")
        .replace(/ℹ️/g, "[Info] ")
        .replace(/❓/g, "(?) ")
        .replace(/❗/g, "(!) ")
        .replace(/⭐/g, "* ")
        .replace(/🎯/g, "> ")
        .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")
        .replace(/[\u{2600}-\u{26FF}]/gu, "")
        .replace(/[\u{2700}-\u{27BF}]/gu, "");
    };

    // Process PDF Generation
    const createPDFContent = () => {
      // Header Background (Hijau Disdikbud #006837)
      doc.setFillColor(0, 104, 55);
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("DISDIKBUD KABUPATEN NGAWI", 20, 18);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Transkrip Layanan Virtual SIPA-NGAWI (Dapodik & Verval)", 20, 28);

      // Content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      let y = 50;
      const pageHeight = doc.internal.pageSize.height;

      messages.forEach((msg) => {
        const role =
          msg.role === "user" ? "OPERATOR / GURU" : "SIPA-NGAWI (DISDIKBUD)";
        const time = new Date(msg.timestamp).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const header = `${role} [${time}]`;

        // Role Header
        doc.setFont("helvetica", "bold");
        if (msg.role === "assistant") {
          doc.setTextColor(0, 104, 55); // Hijau Disdikbud
        } else {
          doc.setTextColor(0, 82, 155); // Biru
        }

        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        doc.text(header, 20, y);
        y += 6;

        // Message Body
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        const cleanedContent = cleanTextForPDF(msg.content);
        const lines = cleanedContent.split("\n");
        lines.forEach((line) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }

          if (line.trim()) {
            const splitText = doc.splitTextToSize(line, 170);
            splitText.forEach((textLine: string) => {
              if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
              }
              doc.text(textLine, 20, y);
              y += 5;
            });
          } else {
            y += 4;
          }
        });

        y += 6; // Extra spacing antar pesan
      });

      // Footer
      const date = new Date().toLocaleDateString("id-ID");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Dicetak pada: ${date} melalui SIPA Disdikbud Kab. Ngawi`,
        20,
        pageHeight - 10
      );

      doc.save(`transkrip-sipa-ngawi-${Date.now()}.pdf`);
    };

    createPDFContent();
  };

  return (
    <div
      className="flex w-full max-w-full overflow-hidden"
      style={{ backgroundColor: "#FAFAFA", height: "100dvh" }}
    >
      {/* Sidebar Navigasi Utama */}
      <ChatSidebar
        onNewChat={handleNewChat}
        onDownload={handleDownloadTranscript}
        onOpenForm={handleOpenFormModal} // <-- SUDAH DITERUSKAN DI SINI
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentMode={currentMode}
      />

      {/* Area Chat Utama */}
      <div className="min-w-0 flex-1 flex items-center justify-center p-0">
        <div className="w-full h-full overflow-hidden">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
    </div>
  );
}