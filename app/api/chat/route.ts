import { NextRequest, NextResponse } from "next/server";
import { createChatResponse } from "@/lib/rag/service";
import { getGeminiApiKeys, serializeError, shouldFallbackToNextModelOrKey } from "@/lib/rag/config";
import type { ChatRequestBody } from "@/lib/rag/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequestBody;
    const { message, image } = body;

    if (!message && !image) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    const apiKeys = getGeminiApiKeys();

    if (!apiKeys.length) {
      console.error("Gemini API key not found");
      return NextResponse.json(
        { error: "API key Gemini tidak ditemukan" },
        { status: 500 }
      );
    }

    let lastError: unknown;

    for (const [index, apiKey] of apiKeys.entries()) {
      try {
        return NextResponse.json(await createChatResponse(apiKey, body));
      } catch (error) {
        lastError = error;

        if (index < apiKeys.length - 1 && shouldFallbackToNextModelOrKey(error)) {
          console.warn(`Gemini API key ${index + 1} terkena limit, mencoba key berikutnya.`);
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error("Semua API key Gemini gagal dipakai");
  } catch (error: unknown) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails =
      typeof error === "object" && error !== null && "response" in error
        ? JSON.stringify((error as { response?: unknown }).response)
        : serializeError(error);

    return NextResponse.json(
      { error: `Maaf, terjadi kesalahan pada sistem AI: ${errorMessage}. ${errorDetails}` },
      { status: 500 }
    );
  }
}
