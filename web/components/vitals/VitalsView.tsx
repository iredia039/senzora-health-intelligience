"use client";

import { useState } from "react";
import { Gauge, HeartPulse, Pencil, Search, Trash2 } from "lucide-react";
import { dangerButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { SOURCE_LABEL, formatWhen, readingName, readingValue } from "@/lib/format";
import { useReadings } from "@/lib/hooks/useStoredData";
import { addDemoReadings, deleteReading, removeDemoReadings } from "@/lib/storage";
import type { Reading } from "@/types";
import { ReadingForm } from "./ReadingForm";

type Filter = "all" | "heart_rate" | "blood_pressure";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "heart_rate", label: "Heart rate" },
  { id: "blood_pressure", label: "Blood pressure" },
];

const searchText = (r: Reading) =>
  `${readingName(r)} ${readingValue(r)} ${r.notes ?? ""} ${formatWhen(r.measuredAt)} ${SOURCE_LABEL[r.source]}`.toLowerCase();

export function VitalsView() {
  const { ready, readings } = useReadings();
  const [editing, setEditing] = useState<Reading | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState("");

  if (!ready) {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Loading your readings
      </div>
    );
  }

  const hasDemo = readings.some((r) => r.source === "demo");
  const q = query.trim().toLowerCase();
  const visible = readings.filter((r) => (filter === "all" || r.type === filter) && (q === "" || searchText(r).includes(q)));

  const startEdit = (r: Reading) => {
    setEditing(r);
    setPendingDelete(null);
    setStatus("");
    requestAnimationFrame(() => document.getElementById("reading-form")?.scrollIntoView({ block: "start" }));
  };

  const confirmDelete = (id: string) => {
    const ok = deleteReading(id);
    if (ok && editing?.id === id) setEditing(null);
    setPendingDelete(null);
    setStatus(ok ? "Reading deleted." : "Couldn't delete this reading. Your browser is blocking storage for this site.");
  };

  const toggleDemo = () => {
    setPendingDelete(null);
    if (hasDemo) {
      setStatus(removeDemoReadings() ? "Demo data removed." : "Couldn't remove demo data. Your browser is blocking storage for this site.");
    } else {
      setStatus(addDemoReadings() ? "Demo data loaded. Every demo reading is labelled so you can tell it apart from yours." : "Couldn't load demo data. Your browser is blocking storage for this site.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section id="reading-form" aria-labelledby="form-heading" className="rounded-2xl border border-line bg-card p-5 lg:col-span-2 lg:self-start">
        <h2 id="form-heading" className="font-display text-lg font-semibold text-fg">
          {editing ? `Edit ${readingName(editing).toLowerCase()} reading` : "Record a vital"}
        </h2>
        <p className="mt-1 text-sm text-muted">Readings are saved on this device only.</p>
        <ReadingForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSaved={(message) => {
            setEditing(null);
            setStatus(message);
          }}
          onCancel={() => setEditing(null)}
        />
      </section>

      <section aria-labelledby="list-heading" className="rounded-2xl border border-line bg-card p-5 lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-heading" className="font-display text-lg font-semibold text-fg">
            Saved readings
          </h2>
          {readings.length > 0 && (
            <button type="button" onClick={toggleDemo} className={textLink}>
              {hasDemo ? "Remove demo data" : "Load demo data"}
            </button>
          )}
        </div>

        <p role="status" className="mt-2 min-h-5 text-sm text-muted">
          {status}
        </p>

        {readings.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line px-6 py-12 text-center">
            <p className="text-sm font-medium text-fg">No readings yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Record your first reading with the form, or load demo data to see how Senzora looks with ten days of readings.
            </p>
            <button type="button" onClick={toggleDemo} className={`${secondaryButton} mt-4`}>
              Load demo data
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="relative min-w-52 flex-1">
                <label htmlFor="reading-search" className="sr-only">
                  Search readings
                </label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="reading-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by value, date or note"
                  className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-10 pr-3.5 text-sm text-fg placeholder:text-muted"
                />
              </div>
              <div role="group" aria-label="Filter by vital" className="flex rounded-xl border border-line bg-canvas p-1">
                {FILTERS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      filter === id ? "bg-raised text-accent-bright" : "text-muted hover:text-fg"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted">
              Showing {visible.length} of {readings.length} reading{readings.length === 1 ? "" : "s"}, newest first.
            </p>

            {visible.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-line px-6 py-10 text-center">
                <p className="text-sm font-medium text-fg">No readings match</p>
                <p className="mt-1 text-sm text-muted">Try a different search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                  className={`${textLink} mt-3`}
                >
                  Clear search and filter
                </button>
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {visible.map((r) => {
                  const label = `${readingName(r).toLowerCase()} reading from ${formatWhen(r.measuredAt)}`;
                  return (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {r.type === "heart_rate" ? (
                            <HeartPulse className="mt-0.5 size-4 shrink-0 text-accent-bright" aria-hidden="true" />
                          ) : (
                            <Gauge className="mt-0.5 size-4 shrink-0 text-accent-bright" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p className="font-display text-base font-semibold text-fg">
                              {readingValue(r)} <span className="text-sm font-normal text-muted">{readingName(r)}</span>
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                              {formatWhen(r.measuredAt)}
                              <span className={`rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium ${r.source === "demo" ? "border-dashed border-muted" : "border-line"}`}>
                                {SOURCE_LABEL[r.source]}
                              </span>
                            </p>
                            {r.notes && <p className="mt-1.5 break-words text-sm text-muted">{r.notes}</p>}
                          </div>
                        </div>

                        {pendingDelete === r.id ? (
                          <div role="group" aria-label={`Confirm deleting ${label}`} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-fg">Delete this reading?</span>
                            <button type="button" onClick={() => confirmDelete(r.id)} className={`${dangerButton} px-3! py-1.5!`}>
                              Delete reading
                            </button>
                            <button type="button" onClick={() => setPendingDelete(null)} className={`${secondaryButton} px-3! py-1.5!`}>
                              Keep it
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEdit(r)} aria-label={`Edit ${label}`} className={`${secondaryButton} px-3! py-1.5!`}>
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingDelete(r.id);
                                setStatus("");
                              }}
                              aria-label={`Delete ${label}`}
                              className={`${secondaryButton} px-3! py-1.5!`}
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
