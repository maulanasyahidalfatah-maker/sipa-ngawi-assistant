"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Download,
  FileSpreadsheet,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  onNewChat: () => void;
  onDownload: () => void;
  onOpenForm?: () => void;
  isOpen: boolean;
  onClose: () => void;
  currentMode?: "chat" | "form";
}

export function ChatSidebar({
  onNewChat,
  onDownload,
  onOpenForm,
  isOpen,
  onClose,
  currentMode = "chat",
}: ChatSidebarProps) {
  // Fungsi penangan aksi menu (Mendukung aksi mobile & fallback modal)
  const runAction = (action?: () => void) => {
    if (action) {
      action();
    } else {
      // Fallback jika onOpenForm lupa dikirim dari parent component
      const fallbackBtn = document.querySelector(
        'button[data-trigger="open-pengaduan"]'
      ) as HTMLButtonElement;
      if (fallbackBtn) {
        fallbackBtn.click();
      }
    }
    onClose();
  };

  return (
    <>
      {/* Overlay Backdrop Tampilan Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 lg:relative lg:inset-auto w-[min(84vw,20rem)] sm:w-72 lg:w-[260px] flex flex-col h-dvh lg:h-full z-40 border-r transition-transform duration-300 ease-in-out bg-[#F9F9F9] shadow-xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ borderColor: "#E5E7EB" }}
      >
        {/* Sidebar Header: Branding Resmi Disdikbud Kab. Ngawi */}
        <div className="p-4 flex items-center justify-between relative z-10 flex-shrink-0 border-b border-neutral-200/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 relative flex-shrink-0 flex items-center justify-center">
              <img
                src="/logo-ngawi.png"
                alt="Logo Pemkab Ngawi"
                className="w-full h-full object-contain drop-shadow-xs"
              />
            </div>

            <div className="flex flex-col">
              <h1 className="font-bold text-sm leading-tight text-[#006837] tracking-tight">
                SIPA-NGAWI
              </h1>
              <p className="text-[11px] text-neutral-500 font-medium">
                Disdikbud Kab. Ngawi
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-lg"
            onClick={onClose}
            type="button"
            title="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Menu Navigasi Sidebar */}
        <ScrollArea className="flex-1 overflow-y-auto px-3">
          <div className="space-y-1 py-3">

            {/* 1. Tombol Obrolan Baru */}
            <button
              type="button"
              onClick={() => runAction(onNewChat)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium cursor-pointer",
                currentMode === "chat"
                  ? "bg-white shadow-xs border border-neutral-200 text-[#006837]"
                  : "text-neutral-600 hover:bg-green-50 hover:text-[#006837] border border-transparent"
              )}
            >
              <Plus className="w-4 h-4 text-[#006837] shrink-0" />
              <span>Obrolan Baru</span>
            </button>

            {/* 2. Menu Form Pengaduan / Tiket (Sudah Terhubung Sempurna) */}
            <button
              type="button"
              onClick={() => runAction(onOpenForm)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-medium cursor-pointer",
                currentMode === "form"
                  ? "bg-white shadow-xs border border-neutral-200 text-[#006837]"
                  : "text-neutral-600 hover:bg-green-50 hover:text-[#006837] border border-transparent"
              )}
            >
              <FileSpreadsheet className="w-4 h-4 text-[#006837] shrink-0" />
              <span>Pengaduan / Tiket</span>
            </button>

            {/* Pembatas Line */}
            <div className="my-2 border-t border-neutral-200/80 mx-1" />

            {/* 3. Unduh Transkrip Percakapan */}
            <button
              type="button"
              onClick={() => runAction(onDownload)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 transition-colors border border-transparent cursor-pointer"
            >
              <Download className="w-4 h-4 text-neutral-500 shrink-0" />
              <span>Unduh Transkrip PDF</span>
            </button>

          </div>
        </ScrollArea>
      </aside>
    </>
  );
}