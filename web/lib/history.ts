import { classifyReading } from "@/lib/analysis";
import type { Reading, VitalType } from "@/types";
import { byNewest } from "@/lib/analysis";

export type HistoryFilters = {
  type: "all" | VitalType;
  range: "all" | "7" | "30" | "90";
  status: "all" | "flagged";
  sort: "newest" | "oldest";
};

export const DEFAULT_FILTERS: HistoryFilters = { type: "all", range: "all", status: "all", sort: "newest" };

export const isFiltered = (f: HistoryFilters) => f.type !== "all" || f.range !== "all" || f.status !== "all";

export function applyFilters(readings: Reading[], f: HistoryFilters, now = Date.now()): Reading[] {
  const since = f.range === "all" ? 0 : now - Number(f.range) * 86_400_000;
  const list = readings.filter(
    (r) =>
      (f.type === "all" || r.type === f.type) &&
      Date.parse(r.measuredAt) >= since &&
      (f.status === "all" || classifyReading(r).level !== "normal"),
  );
  const direction = f.sort === "newest" ? -1 : 1;
return list.sort((a, b) => direction * byNewest(b, a));
}
