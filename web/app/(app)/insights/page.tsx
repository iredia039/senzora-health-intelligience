import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Health Insights" };

export default function Page() {
  return <PhasePlaceholder phase={3} summary="Analysis of your saved readings, with the reasoning and suggested next steps, will appear here." />;
}
