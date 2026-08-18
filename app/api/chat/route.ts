import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { sendBatchReportEmail, TicketItem } from "@/lib/email-service";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/rag/prompt";

export const runtime = "nodejs";

let ticketMemoryBatch: TicketItem[] = [];
let globalTicketCounter = 0;

export async function POST(request: NextRequest) {
  try {
    const body: Record<string, any> = await request.json().catch(() => ({}));

    const message: string = body.message || "";
    const action: string | undefined = body.action;
    const ticketData: any = body.ticketData;
    const targetEmail: string | undefined = body.targetEmail;
    const dataRekap: any[] | undefined = body.dataRekap;
    const history: any[] = body.history || [];
    const noWhatsapp: string | undefined = body.noWhatsapp;
    const namaPelapor: string | undefined = body.namaPelapor;
    const asalSekolah: string | undefined = body.asalSekolah;
    const npsn: string | undefined = body.npsn;
    const urlBukti: string | undefined = body.urlBukti;
    const fileBase64: string | undefined = body.fileBase64;
    const fileName: string | undefined = body.fileName;

    // =========================================================================
    // 1. HANDLER EMAIL MANUAL
    // =========================================================================
    if (action === "send_email_transcript") {
      const emailTarget = targetEmail || process.env.EMAIL_REKAP_TARGET || "avidusfathcorp@gmail.com";
      const recordsToSend: TicketItem[] =
        dataRekap && dataRekap.length > 0
          ? dataRekap.map((item: any, idx: number) => ({
              timestamp: item.timestamp || new Date().toISOString(),
              namaPelapor: item.namaPelapor || "-",
              asalSekolah: item.asalSekolah || "-",
              npsn: item.npsn || "-",
              noWhatsapp: item.noWhatsapp || "-",
              kategoriKendala: item.kategori || item.kategoriKendala || "-",
              rincianKeluhan: item.rincian || item.rincianKeluhan || "-",
              ticketNumber: item.ticketNumber || (idx + 1).toString(),
            }))
          : ticketMemoryBatch;

      if (recordsToSend.length === 0) {
        return NextResponse.json({ error: "Tiada data rekapitulasi aduan untuk dihantar." }, { status: 400 });
      }

      await sendBatchReportEmail(recordsToSend, globalTicketCounter || recordsToSend.length);
      return NextResponse.json({ success: true, message: `Rekapitulasi berjaya dihantar ke ${emailTarget}` });
    }

    // =========================================================================
    // 2. SUBMIT TICKET / PENGADUAN
    // =========================================================================
    if (action === "submit_ticket" || ticketData) {
      if (!ticketData) {
        return NextResponse.json({ error: "Data aduan tidak boleh kosong." }, { status: 400 });
      }

      globalTicketCounter += 1;
      const newTicket: TicketItem = {
        timestamp: new Date().toISOString(),
        namaPelapor: ticketData.namaPelapor || namaPelapor || "-",
        asalSekolah: ticketData.asalSekolah || asalSekolah || "-",
        npsn: ticketData.npsn || npsn || "-",
        noWhatsapp: ticketData.noWhatsapp || noWhatsapp || "-",
        kategoriKendala: ticketData.kategoriKendala || ticketData.kategori || "Kendala Dapodik",
        rincianKeluhan: ticketData.rincianKeluhan || ticketData.rincian || "-",
        ticketNumber: globalTicketCounter.toString(),
      };

      ticketMemoryBatch.unshift(newTicket);
      if (ticketMemoryBatch.length > 30) ticketMemoryBatch = ticketMemoryBatch.slice(0, 30);

      const webhookUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK;
      let sheetStatus = "Skipped";
      if (webhookUrl && !webhookUrl.includes("PASTE_URL")) {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTicket),
          });
          sheetStatus = res.ok ? "Tersimpan ke Google Sheets" : "Gagal Sheets";
        } catch {
          sheetStatus = "Error Sheets";
        }
      }

      return NextResponse.json({
        success: true,
        message: "Pengaduan berhasil dicatat.",
        data: newTicket,
        sheetStatus,
      });
    }

    // =========================================================================
    // 3. CHAT AI UTAMA (Super Cepat & Ramah Menawan)
    // =========================================================================
    if (!message) {
      return NextResponse.json({ error: "Pesan teks wajib diisi." }, { status: 400 });
    }

    const formattedPrompt = buildUserPrompt({
      userMessage: message,
      history: history,
      retrievedDocuments: [],
    });

    let aiReply = "";

    // Prioritas 1: Qwen Turbo (Kilat & Akurat)
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (qwenApiKey) {
      try {
        const qwen = new OpenAI({
          apiKey: qwenApiKey,
          baseURL: process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        });

        const completion = await qwen.chat.completions.create({
          model: "qwen-turbo",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: formattedPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        });

        aiReply = completion.choices[0]?.message?.content || "";
      } catch (qwenErr) {
        console.warn("⚠️ Qwen gagal, beralih ke DeepSeek...", qwenErr);
      }
    }

    // Prioritas 2: Fallback DeepSeek
    if (!aiReply) {
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekKey) {
        throw new Error("Kunci API Qwen maupun DeepSeek tidak dikonfigurasi dengan benar.");
      }

      const deepseek = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com",
      });

      const completion = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: formattedPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      aiReply = completion.choices[0]?.message?.content || "";
    }

    return NextResponse.json({
      reply: aiReply,
      content: aiReply,
      response: aiReply,
    });

  } catch (error: unknown) {
    console.error("💥 Error API Route:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Terjadi kesalahan pada sistem SIPA-NGAWI AI: ${errMessage}` },
      { status: 500 }
    );
  }
}