"use client";

import React, { useState } from 'react';
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatInterface, Message } from "@/components/chat-interface";
import { ObjectDetection } from "@/components/object-detection";
import { jsPDF } from "jspdf";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'object-detection'>('chat');

  const handleSendMessage = async (image?: string, quickMessage?: string) => {
    const messageContent = quickMessage || input;
    if (!messageContent.trim() && !image) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent || (image ? "Tolong analisis gambar ini" : ""),
      timestamp: new Date(),
      image: image
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageContent;
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for context (exclude the current message)
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          history: history,
          image: image
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi nanti. 🙏",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setMode('chat');
  };

  const handleDownloadTranscript = async () => {
    const doc = new jsPDF();

    // Helper function to replace emojis with readable symbols
    const cleanTextForPDF = (text: string) => {
      return text
        // Common emojis with clean text replacements
        .replace(/🚧/g, '(!) ')
        .replace(/✅/g, '(v) ')
        .replace(/🙏/g, '')
        .replace(/•/g, '  - ')
        .replace(/📝/g, '* ')
        .replace(/📋/g, '* ')
        .replace(/📌/g, '> ')
        .replace(/⚠️/g, '(!!) ')
        .replace(/❌/g, '(X) ')
        .replace(/✔️/g, '(v) ')
        .replace(/🔍/g, '')
        .replace(/📞/g, '[Tel] ')
        .replace(/📧/g, '[Email] ')
        .replace(/📍/g, '[Lokasi] ')
        .replace(/🏢/g, '[Kantor] ')
        .replace(/👤/g, '')
        .replace(/👮/g, '[Petugas] ')
        .replace(/🚓/g, '[Patroli] ')
        .replace(/🚨/g, '(!!) ')
        .replace(/📱/g, '[HP] ')
        .replace(/💬/g, '')
        .replace(/⏰/g, '[Waktu] ')
        .replace(/📅/g, '[Tanggal] ')
        .replace(/🔔/g, '(!) ')
        .replace(/ℹ️/g, '[Info] ')
        .replace(/❓/g, '(?) ')
        .replace(/❗/g, '(!) ')
        .replace(/⭐/g, '* ')
        .replace(/🎯/g, '> ')
        .replace(/📊/g, '[Data] ')
        .replace(/📈/g, '[+] ')
        .replace(/📉/g, '[-] ')
        // Replace any remaining emojis with minimal markers or remove them
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs
        .replace(/[\u{2600}-\u{26FF}]/gu, '')  // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, ''); // Dingbats
    };

    // Load and add logo image to header
    const img = new Image();
    img.src = '/Untitled-design.png';
    
    await new Promise<void>((resolve) => {
      img.onload = () => {
        // Header
        doc.setFillColor(15, 76, 146); // #0f4c92
        doc.rect(0, 0, 210, 40, 'F');

        // Add logo in top-left corner
        doc.addImage(img, 'PNG', 10, 8, 24, 24);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("POLSEK REMBANG", 40, 20);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Transkrip Chat Layanan Masyarakat", 40, 30);

        // Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        let y = 50;
        const pageHeight = doc.internal.pageSize.height;

        messages.forEach((msg) => {
          const role = msg.role === 'user' ? "PELAPOR" : "POLSEK REMBANG";
          const time = msg.timestamp.toLocaleTimeString();
          const header = `${role} [${time}]`;

          // Role Header
          doc.setFont("helvetica", "bold");
          if (msg.role === 'assistant') {
            doc.setTextColor(15, 76, 146); // #0f4c92
          } else {
            doc.setTextColor(100, 100, 100); // Gray
          }

          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }

          doc.text(header, 20, y);
          y += 5;

          // Message Body
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);

          // Clean content for PDF (replace emojis with text)
          const cleanedContent = cleanTextForPDF(msg.content);
          
          // Process content - Split by lines first to preserve formatting
          const lines = cleanedContent.split('\n');
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
              // Empty line, just add spacing
              y += 5;
            }
          });
          
          y += 5; // Extra spacing between messages
        });

        // Footer
        const date = new Date().toLocaleDateString();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dicetak pada: ${date}`, 20, pageHeight - 10);

        doc.save(`transkrip-polsek-rembang-${Date.now()}.pdf`);
        resolve();
      };
      
      img.onerror = () => {
        console.error('Failed to load logo image');
        // Continue without logo - fallback to original design
        // Header
        doc.setFillColor(15, 76, 146);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("POLSEK REMBANG", 20, 20);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Transkrip Chat Layanan Masyarakat", 20, 30);

        // Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        let y = 50;
        const pageHeight = doc.internal.pageSize.height;

        messages.forEach((msg) => {
          const role = msg.role === 'user' ? "PELAPOR" : "POLSEK REMBANG";
          const time = msg.timestamp.toLocaleTimeString();
          const header = `${role} [${time}]`;

          doc.setFont("helvetica", "bold");
          if (msg.role === 'assistant') {
            doc.setTextColor(15, 76, 146);
          } else {
            doc.setTextColor(100, 100, 100);
          }

          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }

          doc.text(header, 20, y);
          y += 5;

          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);

          const cleanedContent = cleanTextForPDF(msg.content);
          const lines = cleanedContent.split('\n');
          
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
              y += 5;
            }
          });
          
          y += 5;
        });

        const date = new Date().toLocaleDateString();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Dicetak pada: ${date}`, 20, pageHeight - 10);

        doc.save(`transkrip-polsek-rembang-${Date.now()}.pdf`);
        resolve();
      };
    });
  };

  return (
    <div className="flex w-full max-w-full overflow-hidden" style={{ backgroundColor: '#FAFAFA', height: '100dvh' }}>
      <ChatSidebar
        onNewChat={handleNewChat}
        onDownload={handleDownloadTranscript}
        onObjectDetection={() => {
          setMode('object-detection');
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentMode={mode}
      />
      
      
      <div className="min-w-0 flex-1 flex items-center justify-center p-0">
        <div className="w-full h-full overflow-hidden">
          {mode === 'chat' ? (
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              isSidebarOpen={isSidebarOpen}
            />
          ) : (
            <ObjectDetection onClose={() => setMode('chat')} />
          )}
        </div>
      </div>
    </div>
  );
}
