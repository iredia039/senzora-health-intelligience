import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "AI Assistant" };

export default function Page() {
  return <PhasePlaceholder phase={5} summary="A prototype assistant that reads your saved readings will be built here. It will be clearly labelled as a prototype." />;
}
