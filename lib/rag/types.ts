import type { Document } from "@langchain/core/documents";

export type HistoryMessage = {
  role: "user" | "assistant" | string;
  content: string;
};

export type FormattedAnswerSection = {
  title: string;
  body?: string;
  items?: string[];
};

export type FormattedAnswer = {
  intro?: string;
  sections: FormattedAnswerSection[];
  closing?: string;
};

export type TicketDataPayload = {
  namaPelapor: string;
  asalSekolah: string;
  npsn: string;
  noWhatsapp: string;
  kategoriKendala?: string;
  kategori?: string;
  rincianKeluhan?: string;
  rincian?: string;
  urlBukti?: string;
};

export type ChatRequestBody = {
  message?: string;
  history?: HistoryMessage[];
  image?: string;

  // Extension/Fitur Tambahan SIPA-NGAWI Engine & Automation
  action?: string;
  targetEmail?: string;
  dataRekap?: any[];
  ticketData?: TicketDataPayload;

  // Properti Notifikasi WhatsApp Bot (Mencegah garis merah di route.ts)
  noWhatsapp?: string;
  namaPelapor?: string;
  asalSekolah?: string;
  npsn?: string;
  urlBukti?: string;
};

export type ChatResponseBody = {
  response: string;
  formatted: FormattedAnswer;
};

export type SopMetadata = {
  source: "SOP.txt";
  sectionTitle: string;
  chunkId: string;
  part: number;
};

export type SopDocument = Document<SopMetadata>;

export type RetrievedSopDocument = {
  document: SopDocument;
  semanticScore: number;
  lexicalScore: number;
  score: number;
};