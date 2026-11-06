"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, OctagonAlert, Plus, TriangleAlert } from "lucide-react";
import { LEVEL_LABEL } from "@/components/insights/InsightCard";
import { VitalTrend } from "@/components/insights/VitalTrend";
import { VitalIcon } from "@/components/ui/VitalIcon";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { classifyReading, summarize } from "@/lib/analysis";
import { readingsToCsv } from "@/lib/export/csv";
import { downloadFile, todayStamp } from "@/lib/export/download";
import { SOURCE_LABEL, VITAL_LABEL, VITAL_ORDER, formatWhen, readingName, readingValue } from "@/lib/format";
import { DEFAULT_FILTERS, applyFilters, isFiltered, type HistoryFilters } from "@/lib/history";
import { useReadings } from "@/lib/hooks/useStoredData";

const PAGE_SIZE = 25;

const selectClass = "w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-fg";

function Select<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={`${selectClass} mt-1`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HistoryView() {
  const { ready, readings } = useReadings();
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [status, setStatus] = useState("");

  // Filtering reads the current time, so it only runs in the browser, never while prerendering.
  const visible = useMemo(() => (ready ? applyFilters(readings, filters) : []), [ready, readings, filters]);
  const summaries = useMemo(() => VITAL_ORDER.map((type) => summarize(visible, type)).filter((s) => s.count > 0), [visible]);

  if (!ready) {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Loading your history
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
        <h2 className="font-display text-lg font-semibold text-fg">No history yet</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          Every reading you save appears here. You can filter them, see the charts, and export them to CSV.
        </p>
        <Link href="/vitals" className={`${primaryButton} mt-6`}>
          <Plus className="size-4" aria-hidden="true" />
          Record a Vital
        </Link>
      </section>
    );
  }

  const update = <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setShown(PAGE_SIZE);
    setStatus("");
  };

  const exportCsv = () => {
    downloadFile(`senzora-readings-${todayStamp()}.csv`, readingsToCsv(visible), "text/csv;charset=utf-8");
    setStatus(`Exported ${visible.length} reading${visible.length === 1 ? "" : "s"} to a CSV file.`);
  };

  const filtered = isFiltered(filters);

  return (
    <div className="records-workspace space-y-4">
      <section aria-labelledby="filters-heading" className="rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="filters-heading" className="font-display text-lg font-semibold text-fg">
            Filter and sort
          </h2>
          <button type="button" onClick={exportCsv} disabled={visible.length === 0} className={primaryButton}>
            <Download className="size-4" aria-hidden="true" />
            Export {visible.length} to CSV
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            id="filter-type"
            label="Vital"
            value={filters.type}
            onChange={(v) => update("type", v)}
            options={[{ value: "all", label: "All vitals" }, ...VITAL_ORDER.map((type) => ({ value: type, label: VITAL_LABEL[type] }))]}
          />
          <Select
            id="filter-range"
            label="Period"
            value={filters.range}
            onChange={(v) => update("range", v)}
            options={[
              { value: "all", label: "All time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
          <Select
            id="filter-status"
            label="Status"
            value={filters.status}
            onChange={(v) => update("status", v)}
            options={[
              { value: "all", label: "All readings" },
              { value: "flagged", label: "Flagged or urgent only" },
            ]}
          />

          <Select
            id="filter-sort"
            label="Sort"
            value={filters.sort}
            onChange={(v) => update("sort", v)}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        </div>

        <p role="status" className="mt-3 min-h-5 text-sm text-muted">
          {status || `Showing ${visible.length} of ${readings.length} reading${readings.length === 1 ? "" : "s"}. The CSV contains exactly what is listed here.`}
        </p>
        {filtered && (
          <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setShown(PAGE_SIZE); setStatus(""); }} className={textLink}>
            Clear filters
          </button>
        )}
      </section>

      {visible.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-fg">No readings match these filters</p>
          <p className="mt-1 text-sm text-muted">Widen the period or clear a filter to see more.</p>
          <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setShown(PAGE_SIZE); }} className={`${secondaryButton} mt-4`}>
            Clear filters
          </button>
        </section>
      ) : (
        <>
          {summaries.length > 0 && (
            <div className="space-y-6">
              {summaries.map((summary) => (
                <div key={summary.type} className="space-y-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
                    <VitalIcon type={summary.type} className="size-5 text-accent-bright" />
                    {VITAL_LABEL[summary.type]}
                  </h2>
                  <VitalTrend summary={summary} />
                </div>
              ))}
            </div>
          )}

          <section aria-labelledby="history-list-heading" className="rounded-2xl border border-line bg-card p-5">
            <h2 id="history-list-heading" className="font-display text-lg font-semibold text-fg">
              Readings
            </h2>
            <ul className="mt-2 divide-y divide-line">
              {visible.slice(0, shown).map((r) => {
                const flag = classifyReading(r);
                return (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <VitalIcon type={r.type} className="mt-0.5 size-4 shrink-0 text-accent-bright" />
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold text-fg">
                          {readingValue(r)} <span className="text-sm font-normal text-muted">{readingName(r)}</span>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {formatWhen(r.measuredAt)}
                        <span className="rounded-md border border-line px-1.5 py-0.5 text-[0.7rem] font-medium">
                            {SOURCE_LABEL[r.source]}
                          </span>
                        </p>
                        {r.notes && <p className="mt-1.5 break-words text-sm text-muted">{r.notes}</p>}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        flag.level === "urgent"
                          ? "border-danger bg-raised text-danger"
                          : flag.level === "caution"
                            ? "border-dashed border-danger text-danger"
                            : "border-line text-muted"
                      }`}
                    >
                      {flag.level === "urgent" && <OctagonAlert className="size-3.5" aria-hidden="true" />}
                      {flag.level === "caution" && <TriangleAlert className="size-3.5" aria-hidden="true" />}
                      {LEVEL_LABEL[flag.level]}
                    </span>
                  </li>
                );
              })}
            </ul>
            {visible.length > shown && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-muted">
                  Showing {shown} of {visible.length}
                </p>
                <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className={secondaryButton}>
                  Show {Math.min(PAGE_SIZE, visible.length - shown)} more
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Statuses use the same prototype rules as Health Insights. They are general information for adults, not a diagnosis.
      </p>
    </div>
  );
}
