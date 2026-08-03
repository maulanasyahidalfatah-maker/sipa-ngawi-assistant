import { z } from "zod";
import type { FormattedAnswer, FormattedAnswerSection } from "./types";

export const formattedAnswerSchema = z.object({
  intro: z.string().optional().describe("Kalimat pembuka singkat, ramah, dan empatik. Kosongkan hanya jika jawaban harus sangat langsung."),
  sections: z
    .array(
      z.object({
        title: z.string().describe("Judul bagian pendek seperti Syarat, Alur, Biaya, atau Catatan."),
        body: z.string().optional().describe("Paragraf pendek 1-3 kalimat untuk konteks, arahan utama, atau penjelasan ramah sebelum daftar. Untuk layanan/pengaduan, isi body pada section penting."),
        items: z.array(z.string()).optional().describe("Daftar poin untuk syarat, langkah, alur, bukti, dokumen, atau opsi. Jangan isi dengan paragraf panjang, nomor manual, strip, bullet, markdown, atau awalan simbol."),
      })
    )
    .min(1)
    .describe("Minimal satu section jawaban. Gunakan kombinasi body dan items agar jawaban ramah tetapi tetap mudah dipindai."),
  closing: z.string().optional().describe("Kalimat penutup singkat dan ramah. Boleh mengingatkan verifikasi ke petugas atau keselamatan jika perlu."),
});

export function sanitizeFormattedAnswer(value: unknown): FormattedAnswer {
  const parsed = formattedAnswerSchema.safeParse(value);
  const data = parsed.success ? parsed.data : coerceFormattedAnswerLike(value);

  if (!data) {
    return fallbackFormattedAnswer(
      typeof value === "string" ? value : "Informasi terkait pertanyaan Anda belum dapat ditampilkan secara rapi. Silakan tanyakan kembali secara spesifik."
    );
  }

  const sections = data.sections
    .map(normalizeFormattedSection)
    .filter((section): section is FormattedAnswerSection => Boolean(section));

  if (!sections.length) {
    return fallbackFormattedAnswer(
      typeof value === "string" ? value : "SIPA-NGAWI tidak menemukan detail relevan pada dokumen SOP Disdikbud."
    );
  }

  const intro = cleanFieldText(data.intro);
  const closing = cleanFieldText(data.closing);

  return {
    ...(intro ? { intro } : {}),
    sections,
    ...(closing ? { closing } : {}),
  };
}

// PERBAIKAN 1: Fallback bisa menerima string teks utuh agar tidak melempar pesan error kaku
export function fallbackFormattedAnswer(message?: string): FormattedAnswer {
  const textContent = message && message.trim().length > 0 
    ? message 
    : "Maaf, sistem belum menemukan informasi yang spesifik dalam dokumen SOP. Silakan ajukan pertanyaan lain terkait Dapodik atau Verval Disdikbud Ngawi.";

  return {
    sections: [
      {
        title: "Informasi SIPA-NGAWI",
        body: textContent,
      },
    ],
  };
}

export function formattedAnswerToPlainText(answer: FormattedAnswer) {
  const blocks: string[] = [];

  if (answer.intro) {
    blocks.push(answer.intro);
  }

  answer.sections.forEach((section) => {
    const lines = [`${section.title}:`];

    if (section.body) {
      lines.push(section.body);
    }

    if (section.items?.length) {
      const ordered = shouldUseOrderedList(section.title);
      section.items.forEach((item, index) => {
        lines.push(ordered ? `${index + 1}. ${item}` : `- ${item}`);
      });
    }

    blocks.push(lines.join("\n"));
  });

  if (answer.closing) {
    blocks.push(answer.closing);
  }

  return cleanAssistantResponse(blocks.join("\n\n"));
}

export function cleanFieldText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// PERBAIKAN 2: Pembersihan residual Call Center Polri / Polsek dan penyesuaian ke Disdikbud Ngawi
export function cleanAssistantResponse(text: string) {
  const sectionLabels = [
    "Tempat layanan:",
    "Syarat:",
    "Alur:",
    "Biaya:",
    "Durasi atau jam layanan:",
    "Jam layanan:",
    "Durasi:",
    "Catatan:",
    "Informasi SIPA-NGAWI:",
  ];

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/([^\n])\s+(\d+\.\s+)/g, "$1\n$2")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const compactedLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return sectionLabels
    .reduce((result, label) => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return result.replace(new RegExp(`(^|\\n)${escapedLabel}`, "g"), `\n\n${label}`);
    }, compactedLines)
    .replace(/^\n+/, "")
    .trim();
}

function normalizeFormattedSection(section: FormattedAnswerSection): FormattedAnswerSection | null {
  const title = cleanFieldText(section.title);
  const body = cleanFieldText(section.body);
  const items = Array.isArray(section.items)
    ? section.items
        .map(cleanFieldText)
        .filter((item): item is string => Boolean(item))
    : [];

  if (!title || (!body && !items.length)) {
    return null;
  }

  return {
    title,
    ...(body ? { body } : {}),
    ...(items.length ? { items } : {}),
  };
}

function coerceFormattedAnswerLike(value: unknown): FormattedAnswer | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("parsed" in value) {
    const parsed = coerceFormattedAnswerLike((value as { parsed?: unknown }).parsed);

    if (parsed) {
      return parsed;
    }
  }

  if ("raw" in value) {
    const rawContent = (value as { raw?: { content?: unknown } }).raw?.content;
    const parsedRaw = parseFormattedAnswerFromText(rawContent);

    if (parsedRaw) {
      return parsedRaw;
    }
  }

  const parsedText = parseFormattedAnswerFromText(value);

  if (parsedText) {
    return parsedText;
  }

  const data = value as {
    intro?: unknown;
    sections?: unknown;
    closing?: unknown;
  };

  if (!Array.isArray(data.sections)) {
    return null;
  }

  const sections = data.sections
    .map((section) => {
      if (!section || typeof section !== "object") {
        return null;
      }

      const sectionData = section as {
        title?: unknown;
        body?: unknown;
        items?: unknown;
      };
      const title = cleanFieldText(sectionData.title);
      const body = cleanFieldText(sectionData.body);
      const items = Array.isArray(sectionData.items)
        ? sectionData.items.map((item) => cleanFieldText(item)).filter(Boolean)
        : [];

      if (!title || (!body && !items.length)) {
        return null;
      }

      return {
        title,
        ...(body ? { body } : {}),
        ...(items.length ? { items } : {}),
      };
    })
    .filter((section): section is FormattedAnswerSection => Boolean(section));

  if (!sections.length) {
    return null;
  }

  const intro = cleanFieldText(data.intro);
  const closing = cleanFieldText(data.closing);

  return {
    ...(intro ? { intro } : {}),
    sections,
    ...(closing ? { closing } : {}),
  };
}

function parseFormattedAnswerFromText(value: unknown): FormattedAnswer | null {
  const text = contentToText(value);

  if (!text) {
    return null;
  }

  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    return null;
  }

  try {
    return coerceFormattedAnswerLike(JSON.parse(jsonText));
  } catch {
    return null;
  }
}

function contentToText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractJsonObject(rawText: string) {
  const trimmed = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function shouldUseOrderedList(title: string) {
  return /(syarat|alur|prosedur|cara|langkah)/i.test(title);
}