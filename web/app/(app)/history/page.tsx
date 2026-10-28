import type { Metadata } from "next";
import { HistoryView } from "@/components/history/HistoryView";

export const metadata: Metadata = { title: "Health History" };

export default function Page() {
  return <HistoryView />;
}
