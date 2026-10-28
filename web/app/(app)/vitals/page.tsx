import type { Metadata } from "next";
import { VitalsView } from "@/components/vitals/VitalsView";

export const metadata: Metadata = { title: "Vitals" };

export default function Page() {
  return <VitalsView />;
}
