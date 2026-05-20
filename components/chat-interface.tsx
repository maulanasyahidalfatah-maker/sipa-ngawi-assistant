"use client";

import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Menu,
  X,
  FileText,
  Search,
  ShieldAlert,
  Phone,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShimmeringText } from '@/components/animate-ui/primitives/texts/shimmering';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string; // base64 image data
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (image?: string, quickMessage?: string) => void;
  isLoading?: boolean;
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  onSendMessage,
  isLoading,
  onToggleSidebar,
  isSidebarOpen
}: ChatInterfaceProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-expand textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
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
        recognitionRef.current.stop();
      }
    };
  }, [setInput]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition tidak didukung di browser ini. Gunakan Chrome atau Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
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
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    onSendMessage(selectedImage || undefined);
    removeImage();
  };

  const handleQuickAction = (message: string) => {
    onSendMessage(undefined, message);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Greeting logic: Pagi (4-10), Siang (10-15), Malam (15-4)
  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 10) {
      return "Pagi";
    } else if (hour >= 10 && hour < 15) {
      return "Siang";
    } else {
      return "Malam";
    }
  };

  const quickActions = [
    {
      label: 'Syarat SKCK',
      message: 'Bagaimana syarat membuat SKCK?',
      icon: FileText
    },
    {
      label: 'Lapor Kehilangan',
      message: 'Bagaimana cara lapor kehilangan barang?',
      icon: Search
    },
    {
      label: 'Penipuan Online',
      message: 'Bagaimana cara melaporkan penipuan online?',
      icon: ShieldAlert
    },
    {
      label: 'Kontak Darurat',
      message: 'Berapa nomor kontak darurat kepolisian Polsek Rembang?',
      icon: Phone
    }
  ];

  const renderInputCard = (isCentered: boolean) => {
    return (
      <div
        className={cn(
          "w-full rounded-2xl sm:rounded-3xl border border-neutral-200 bg-white shadow-sm focus-within:border-neutral-300 focus-within:shadow-md transition-all duration-200 overflow-hidden",
          isCentered ? "mb-5 sm:mb-6" : ""
        )}
      >
        {/* Image Preview - Inside the input card */}
        {imagePreview && (
          <div className="px-3 sm:px-4 pt-3 pb-1">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 sm:h-20 rounded-lg border object-cover border-neutral-200"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Textarea field */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isCentered ? "Apa yang bisa saya bantu hari ini?" : "Tulis pesan..."}
          className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-neutral-800 placeholder-neutral-400 text-[15px] sm:text-base py-3 sm:py-3.5 px-3 sm:px-4 resize-none min-h-[44px] sm:min-h-[48px] max-h-[160px] overflow-y-auto"
        />

        {/* Bottom row of the card */}
        <div className="flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3 pt-0">
          {/* Left: Upload Button */}
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
              title="Upload gambar"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Right: Info, mic, and send button */}
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
              title={isListening ? "Stop Recording" : "Voice Input"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-[18px] sm:h-[18px]">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </Button>

            <button
              type="button"
              className="rounded-full h-8 w-8 sm:h-9 sm:w-9 transition-all duration-200 flex items-center justify-center disabled:opacity-30 border border-transparent shadow-sm shrink-0"
              style={{
                backgroundColor: (input.trim() || selectedImage) ? '#0f4c92' : '#F3F4F6',
                color: (input.trim() || selectedImage) ? '#FFFFFF' : '#9CA3AF'
              }}
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isLoading}
              title="Send Message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-[18px] sm:h-[18px]">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-w-0 flex-col w-full h-full overflow-hidden relative bg-[#FAFAFA]">

      {/* Native-like Sticky Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-neutral-700 hover:bg-neutral-100 rounded-lg shrink-0"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img
            src="/Untitled-design.png"
            alt="Logo"
            className="w-6 h-6 rounded-full object-cover border border-neutral-200"
          />
          <span className="font-semibold text-sm text-neutral-800 tracking-tight">Polsek Rembang</span>
        </div>
        <div className="w-9 shrink-0" /> {/* Spacer for strict centering */}
      </div>

      {messages.length === 0 ? (
        /* ==================== Landing Screen (Centered) ==================== */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full min-h-0">
          <div className="min-h-full w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-6 sm:py-10">
            {/* Custom Greeting with Polsek Logo */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 text-center">
              <img
                src="/Untitled-design.png"
                alt="Polsek Rembang Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-sm border border-neutral-200"
              />
              <h1 className="text-xl sm:text-3xl font-serif text-neutral-800 tracking-tight leading-tight">
                {getGreetingText()}, adakah yang bisa saya bantu?
              </h1>
            </div>

            {/* Large Input Card */}
            {renderInputCard(true)}

            {/* Shortcut Pills (4 pieces) */}
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:px-2">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.message)}
                    className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 text-[12px] sm:text-sm font-medium rounded-full border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200 shadow-sm"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-neutral-450 shrink-0" />
                    <span className="min-w-0 truncate">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== Active Chat Screen ==================== */
        <>
          {/* Scrollable messages container */}
          <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 px-3 py-5 sm:p-6 sm:py-8">
              {messages.map((message) => (
                <div key={message.id} className="w-full">
                  {message.role === 'user' ? (
                    /* User message: bubble on the right */
                    <div className="flex flex-col items-end w-full">
                      <div className="bg-[#F3F4F6] text-neutral-800 rounded-2xl rounded-tr-sm px-3.5 sm:px-4 py-2.5 max-w-[92%] sm:max-w-lg border border-neutral-200 shadow-sm">
                        {message.image && (
                          <img
                            src={message.image}
                            alt="Uploaded"
                            className="max-w-full max-h-[250px] sm:max-h-[300px] rounded-lg mb-2 object-contain"
                          />
                        )}
                        <p className="whitespace-pre-wrap text-[15px] sm:text-sm leading-relaxed">{message.content}</p>
                      </div>
                      <span className="text-[10px] mt-1.5 text-neutral-450 font-medium mr-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    /* Assistant message: plain text direct on bg, NO logo on the left */
                    <div className="w-full flex flex-col items-start py-4 sm:py-5 border-b border-neutral-200/60 last:border-b-0">
                      <div className="text-neutral-800 w-full">
                        <p className="whitespace-pre-wrap text-[15px] sm:text-base leading-relaxed">{message.content}</p>
                      </div>

                      {/* Feedback utility row */}
                      <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                          title="Salin Tanggapan"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        <button
                          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                          title="Suka"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                          title="Tidak Suka"
                        >
                          <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-lg hover:bg-neutral-100"
                          title="Buat Ulang"
                        >
                          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Shimmering thinking state */}
              {isLoading && (
                <div className="w-full flex flex-col items-start py-4 sm:py-5 border-b border-neutral-200/60 last:border-b-0">
                  <ShimmeringText
                    wave={true}
                    duration={1.5}
                    className="text-[15px] sm:text-base text-neutral-500 font-medium"
                    text="Polsek Rembang sedang memproses..."
                  />
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          </ScrollArea>

          {/* Bottom input area with safe-area padding for mobile keyboards/home-indicator */}
          <div className="px-3 sm:px-4 pt-2 sm:pt-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] sm:pb-6 bg-[#FAFAFA] shrink-0">
            <div className="max-w-3xl mx-auto">
              {renderInputCard(false)}
              <div className="text-[9px] sm:text-[10px] text-center mt-2 text-neutral-500">
                Peringatan: Asisten virtual dapat membuat kesalahan. Harap verifikasi informasi penting.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
