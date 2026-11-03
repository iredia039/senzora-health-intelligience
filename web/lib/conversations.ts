import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/types";

export type ConversationSummary = { id: number; title: string; createdAt: string };

type ConversationDetail = {
  id: number;
  title: string;
  createdAt: string;
  messages: { id: number; role: string; content: string; createdAt: string }[];
};

/** GET /conversations: the logged-in user's saved chats, newest first. */
export function listConversations(): Promise<ConversationSummary[]> {
  return apiRequest<ConversationSummary[]>("/conversations", { auth: true });
}

/** GET /conversations/:id: one saved chat, turned into the messages the chat screen shows. */
export async function loadConversation(id: number): Promise<ChatMessage[]> {
  const data = await apiRequest<ConversationDetail>(`/conversations/${id}`, { auth: true });
  return data.messages.flatMap<ChatMessage>((m) =>
    m.role === "user" || m.role === "assistant" ? [{ id: String(m.id), role: m.role, content: m.content, createdAt: m.createdAt }] : [],
  );
}
