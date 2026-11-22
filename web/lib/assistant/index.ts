import { ApiError, apiRequest } from "@/lib/api";
import { clearConversationId, loadConversationId, saveConversationId } from "@/lib/storage";
import type { ChatMessage, Reading } from "@/types";
import { byNewest } from "@/lib/analysis";

type ChatbotResponse = { reply: string; conversationId: number; title: string; emergency?: boolean };

// API limit: send newest 20 readings
const MAX_READINGS = 20;

function toPayload(readings: Reading[]) {
  return [...readings]
    .sort(byNewest)
    .slice(0, MAX_READINGS)
    .map((r) => {
      switch (r.type) {
        case "heart_rate":
          return { type: r.type, measuredAt: r.measuredAt, bpm: r.bpm };
        case "blood_pressure":
          return { type: r.type, measuredAt: r.measuredAt, systolic: r.systolic, diastolic: r.diastolic };
        case "body_temperature":
          return { type: r.type, measuredAt: r.measuredAt, celsius: r.celsius };
        case "blood_oxygen":
          return { type: r.type, measuredAt: r.measuredAt, spo2: r.spo2 };
      }
    });
}

/** POST /chatbot — server maintains conversation history. */
export async function askAssistant(message: string, readings: Reading[]): Promise<ChatMessage> {
  const conversationId = loadConversationId();

  try {
    const data = await apiRequest<ChatbotResponse>("/chatbot", {
      method: "POST",
      auth: true,
      body: {
        message,
        ...(conversationId !== null ? { conversationId } : {}),
        ...(readings.length > 0 ? { readings: toPayload(readings) } : {}),
      },
    });

    saveConversationId(data.conversationId);
    return { id: crypto.randomUUID(), role: "assistant", content: data.reply, createdAt: new Date().toISOString() };
  } catch (error) {
    // Conversation expired on server — next message starts a new one
    if (error instanceof ApiError && error.status === 404) clearConversationId();
    throw error;
  }
}
