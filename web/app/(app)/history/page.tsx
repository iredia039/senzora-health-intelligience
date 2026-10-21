import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Health History" };

export default function Page() {
  return <PhasePlaceholder phase={5} summary="Filter, sort, chart, and export all of your saved readings to CSV." />;
}
