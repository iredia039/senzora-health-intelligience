import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <PhasePlaceholder phase={2} summary="Your latest heart rate and blood pressure, charts, recent readings, and device status will appear here once vitals recording is built." />;
}
