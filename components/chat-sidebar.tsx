import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Download,
  ScanEye,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  onNewChat: () => void;
  onDownload: () => void;
  onObjectDetection: () => void;
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'chat' | 'object-detection';
}

export function ChatSidebar({
  onNewChat,
  onDownload,
  onObjectDetection,
  isOpen,
  onClose,
  currentMode
}: ChatSidebarProps) {
  const runMobileAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 lg:relative lg:inset-auto w-[min(84vw,20rem)] sm:w-72 lg:w-[260px] flex flex-col h-dvh lg:h-full z-40 border-r transition-transform duration-300 ease-in-out bg-[#F9F9F9] shadow-xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ borderColor: '#E5E7EB' }}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between relative z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/Untitled-design.png"
              alt="Polsek Rembang Logo"
              className="w-8 h-8 rounded-full object-cover border border-neutral-200 bg-white"
            />
            <div className="flex flex-col">
              <h1 className="font-medium text-sm leading-tight text-neutral-800 tracking-tight">
                Polsek Rembang
              </h1>
              <p className="text-[11px] text-neutral-500 font-medium">
                Asisten Virtual
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 rounded-lg"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 overflow-y-auto px-3">
          <div className="space-y-1 py-2">

            {/* New Chat Button / Chat Mode */}
            <button
              onClick={() => runMobileAction(onNewChat)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                currentMode === 'chat'
                  ? "bg-white shadow-sm border border-neutral-200/80 text-neutral-900 font-medium"
                  : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 border border-transparent font-medium"
              )}
            >
              <Plus className="w-4 h-4" />
              Obrolan Baru
            </button>

            {/* Object Detection Mode */}
            <button
              onClick={() => runMobileAction(onObjectDetection)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                currentMode === 'object-detection'
                  ? "bg-white shadow-sm border border-neutral-200/80 text-neutral-900 font-medium"
                  : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 border border-transparent font-medium"
              )}
            >
              <ScanEye className="w-4 h-4" />
              Deteksi Objek AI
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-neutral-200/60 mx-1"></div>

            {/* Download Transcript */}
            <button
              onClick={() => runMobileAction(onDownload)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 transition-colors border border-transparent"
            >
              <Download className="w-4 h-4" />
              Unduh Transkrip
            </button>

          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
