import type { Metadata } from "next";
import { ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: "AI Assistant" };

export default function Page() {
  return <ChatView />;
}
