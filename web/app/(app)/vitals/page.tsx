import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Vitals" };

export default function Page() {
  return <PhasePlaceholder phase={2} summary="Add, edit, search, and delete heart rate and blood pressure readings here." />;
}
