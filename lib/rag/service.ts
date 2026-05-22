import { ChatGoogle } from "@langchain/google";
import { HumanMessage, SystemMessage, type ContentBlock } from "@langchain/core/messages";
import { GENERATION_MODELS, shouldFallbackToNextModelOrKey } from "./config";
import { fallbackFormattedAnswer, formattedAnswerToPlainText, formattedAnswerSchema, sanitizeFormattedAnswer } from "./format";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { buildRetrievalQuery, retrieveRelevantDocuments } from "./retriever";
import type { ChatRequestBody, ChatResponseBody, FormattedAnswer, HistoryMessage } from "./types";

export async function createChatResponse(apiKey: string, body: ChatRequestBody): Promise<ChatResponseBody> {
  const { message, history, image } = body;
  const userMessage = message || "Tolong analisis gambar ini dan jelaskan apa yang kamu lihat.";
  const retrievalQuery = buildRetrievalQuery(userMessage, history);
  const retrievedDocuments = await retrieveRelevantDocuments(apiKey, retrievalQuery);
  const formatted = await generateFormattedAnswer({
    apiKey,
    userMessage,
    history,
    image,
    retrievedDocuments,
  });
  const response = formattedAnswerToPlainText(formatted);

  return {
    response,
    formatted,
  };
}

async function generateFormattedAnswer(params: {
  apiKey: string;
  userMessage: string;
  history?: HistoryMessage[];
  image?: string;
  retrievedDocuments: Awaited<ReturnType<typeof retrieveRelevantDocuments>>;
}): Promise<FormattedAnswer> {
  let lastError: unknown;

  for (const modelName of GENERATION_MODELS) {
    try {
      return await generateWithModel({ ...params, modelName });
    } catch (error) {
      lastError = error;

      if (shouldFallbackToNextModelOrKey(error) && modelName !== GENERATION_MODELS[GENERATION_MODELS.length - 1]) {
        console.warn(`Model ${modelName} sedang tidak tersedia, mencoba model berikutnya.`);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Semua model Gemini gagal dipakai");
}

async function generateWithModel(params: {
  apiKey: string;
  modelName: string;
  userMessage: string;
  history?: HistoryMessage[];
  image?: string;
  retrievedDocuments: Awaited<ReturnType<typeof retrieveRelevantDocuments>>;
}) {
  const chatModel = new ChatGoogle({
    model: params.modelName,
    apiKey: params.apiKey,
    temperature: 0.2,
    topP: 0.8,
  });
  const structuredModel = chatModel.withStructuredOutput(formattedAnswerSchema, {
    name: "FormattedAnswer",
  });

  try {
    const result = await structuredModel.invoke(buildMessages(params));
    return sanitizeFormattedAnswer(result);
  } catch (firstError) {
    if (shouldFallbackToNextModelOrKey(firstError)) {
      throw firstError;
    }

    console.warn("Structured output gagal divalidasi, mencoba satu kali repair.", firstError);

    try {
      const repairedResult = await structuredModel.invoke(buildMessages({ ...params, repairMode: true }));
      return sanitizeFormattedAnswer(repairedResult);
    } catch (repairError) {
      if (shouldFallbackToNextModelOrKey(repairError)) {
        throw repairError;
      }

      console.warn("Repair structured output gagal.", repairError);
      return fallbackFormattedAnswer("Maaf, jawaban belum bisa disusun dengan format yang valid. Silakan coba tanyakan lagi dengan lebih spesifik.");
    }
  }
}

function buildMessages(params: {
  userMessage: string;
  history?: HistoryMessage[];
  image?: string;
  retrievedDocuments: Awaited<ReturnType<typeof retrieveRelevantDocuments>>;
  repairMode?: boolean;
}) {
  const userPrompt = buildUserPrompt({
    userMessage: params.userMessage,
    history: params.history,
    retrievedDocuments: params.retrievedDocuments,
    repairMode: params.repairMode,
  });

  return [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage({
      ...(params.image
        ? { contentBlocks: buildMultimodalContent(userPrompt, params.image) }
        : { content: userPrompt }),
    }),
  ];
}

function buildMultimodalContent(prompt: string, image: string): ContentBlock.Standard[] {
  return [
    {
      type: "text",
      text: prompt,
    },
    {
      type: "image",
      url: image,
    },
  ];
}
