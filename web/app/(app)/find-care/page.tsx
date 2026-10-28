import type { Metadata } from "next";
import { FindCareView } from "@/components/find-care/FindCareView";

export const metadata: Metadata = { title: "Find Care" };

export default function Page() {
  return <FindCareView />;
}
