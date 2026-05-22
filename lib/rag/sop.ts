import { Document } from "@langchain/core/documents";
import { promises as fs } from "fs";
import path from "path";
import { CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from "./config";
import type { SopDocument, SopMetadata } from "./types";

const SOP_FILE_PATH = path.join(process.cwd(), "SOP.txt");

type SopSection = {
  title: string;
  text: string;
};

type SopChunk = {
  id: string;
  title: string;
  text: string;
  part: number;
};

export async function loadSopText() {
  return fs.readFile(SOP_FILE_PATH, "utf8");
}

export async function loadSopDocuments(): Promise<SopDocument[]> {
  const sopText = await loadSopText();
  return splitSopIntoSections(sopText).flatMap((section) => {
    return splitSectionIntoChunks(section).map((chunk) => {
      const metadata: SopMetadata = {
        source: "SOP.txt",
        sectionTitle: chunk.title,
        chunkId: chunk.id,
        part: chunk.part,
      };

      return new Document<SopMetadata>({
        id: chunk.id,
        pageContent: chunk.text,
        metadata,
      });
    });
  });
}

export function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function splitSopIntoSections(sopText: string): SopSection[] {
  const sections: SopSection[] = [];
  const lines = normalizeText(sopText).split("\n");
  let currentTitle = "Dokumen SOP";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (isTopLevelSopHeading(line)) {
      if (currentLines.length) {
        sections.push({
          title: currentTitle,
          text: currentLines.join("\n").trim(),
        });
      }

      currentTitle = line.trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length) {
    sections.push({
      title: currentTitle,
      text: currentLines.join("\n").trim(),
    });
  }

  return sections.filter((section) => section.text.length > 0);
}

function isTopLevelSopHeading(line: string) {
  const match = line.match(/^(\d+)\.\s+(.+)$/);

  if (!match) {
    return false;
  }

  const title = match[2].trim();
  const letters = title.match(/[A-Za-z]/g) ?? [];
  const uppercaseLetters = title.match(/[A-Z]/g) ?? [];
  const uppercaseRatio = letters.length ? uppercaseLetters.length / letters.length : 0;

  return title.startsWith("FAQ") || uppercaseRatio >= 0.75 || /^[A-Z0-9 &/.-]+(?:\s+\([^)]+\))?$/.test(title);
}

function splitSectionIntoChunks(section: SopSection): SopChunk[] {
  if (section.text.length <= CHUNK_MAX_CHARS) {
    return [
      {
        id: createChunkId(section.title, 1),
        title: section.title,
        text: section.text,
        part: 1,
      },
    ];
  }

  const paragraphs = section.text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: SopChunk[] = [];
  let current = section.title;
  let previousTail = "";

  for (const paragraph of paragraphs) {
    const candidate = `${current}\n\n${paragraph}`;

    if (candidate.length > CHUNK_MAX_CHARS && current !== section.title) {
      const part = chunks.length + 1;
      chunks.push({
        id: createChunkId(section.title, part),
        title: section.title,
        text: current,
        part,
      });

      current = previousTail
        ? `${section.title}\n\nKonteks sebelumnya: ${previousTail}\n\n${paragraph}`
        : `${section.title}\n\n${paragraph}`;
    } else {
      current = candidate;
    }

    previousTail = paragraph.slice(-CHUNK_OVERLAP_CHARS);
  }

  if (current.trim()) {
    const part = chunks.length + 1;
    chunks.push({
      id: createChunkId(section.title, part),
      title: section.title,
      text: current,
      part,
    });
  }

  return chunks;
}

function createChunkId(title: string, part: number) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "sop"}-${part}`;
}
