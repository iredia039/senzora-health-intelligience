import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <PhasePlaceholder phase={5} summary="Profile, theme, notifications, privacy information, data export, and reset." />;
}
