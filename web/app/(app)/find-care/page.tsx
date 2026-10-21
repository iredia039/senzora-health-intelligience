import type { Metadata } from "next";
import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

export const metadata: Metadata = { title: "Find Care" };

export default function Page() {
  return <PhasePlaceholder phase={4} summary="Search pharmacies, clinics, hospitals, and labs. Sample data will be clearly labelled." />;
}
