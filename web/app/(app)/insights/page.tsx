import type { Metadata } from "next";
import { InsightsView } from "@/components/insights/InsightsView";

export const metadata: Metadata = { title: "Health Insights" };

export default function Page() {
  return <InsightsView />;
}
