import { CircleCheck, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { classifyReading, type Level } from "@/lib/analysis";
import { formatWhen, readingValue } from "@/lib/format";
import type { Insight, InsightStatus, Reading } from "@/types";

/** Every status has its own icon and wording, so colour is never the only signal. */
const STATUS: Record<InsightStatus, { label: string; icon: LucideIcon; badge: string; card: string }> = {
  urgent: { label: "Urgent", icon: OctagonAlert, badge: "border-danger bg-raised text-danger", card: "border-danger" },
  caution: { label: "Flagged", icon: TriangleAlert, badge: "border-dashed border-danger text-danger", card: "border-line" },
  reassuring: { label: "In range", icon: CircleCheck, badge: "border-line text-accent-bright", card: "border-line" },
  insufficient_data: { label: "No data yet", icon: Info, badge: "border-dashed border-muted text-muted", card: "border-line" },
};

export const LEVEL_LABEL: Record<Level, string> = { normal: "In range", caution: "Flagged", urgent: "Urgent" };

export function StatusBadge({ status }: { status: InsightStatus }) {
  const { label, icon: Icon, badge } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function InsightCard({ insight, readings }: { insight: Insight; readings: Reading[] }) {
  const basedOn = insight.readingIds
    .map((id) => readings.find((r) => r.id === id))
    .filter((r): r is Reading => r !== undefined);
  const headingId = `${insight.id}-heading`;

  return (
    <article aria-labelledby={headingId} className={`flex h-full flex-col rounded-2xl border bg-card p-5 ${STATUS[insight.status].card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg font-semibold text-fg">
          {insight.title}
        </h3>
        <StatusBadge status={insight.status} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{insight.explanation}</p>

      <div className="mt-4 rounded-xl bg-raised p-4">
        <p className="text-sm font-medium text-fg">What to do next</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{insight.nextStep}</p>
      </div>

      {basedOn.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-fg">Based on your last {basedOn.length} reading{basedOn.length === 1 ? "" : "s"}</p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {basedOn.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted">{formatWhen(r.measuredAt)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-display font-semibold text-fg">{readingValue(r)}</span>
                  <span className="w-16 text-right text-xs text-muted">{LEVEL_LABEL[classifyReading(r).level]}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.limitations && (
        <div className="mt-auto pt-4">
          <p className="border-t border-line pt-4 text-xs leading-relaxed text-muted">{insight.limitations}</p>
        </div>
      )}
    </article>
  );
}
