"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleCheck, OctagonAlert, Plus, TriangleAlert } from "lucide-react";
import { VitalIcon } from "@/components/ui/VitalIcon";
import { primaryButton } from "@/components/ui/buttons";
import { THRESHOLDS, buildInsight, flaggedReadings, summarize } from "@/lib/analysis";
import { SOURCE_LABEL, VITAL_LABEL, VITAL_ORDER, formatWhen, readingName, readingValue } from "@/lib/format";
import { useReadings } from "@/lib/hooks/useStoredData";
import type { InsightStatus } from "@/types";
import { InsightCard, LEVEL_LABEL } from "./InsightCard";
import { VitalTrend } from "./VitalTrend";

/** The vital that needs the most attention is shown first. */
const ATTENTION_RANK: Record<InsightStatus, number> = { urgent: 0, caution: 1, reassuring: 2, insufficient_data: 3 };

const MAX_FLAGGED = 10;

export function InsightsView() {
  const { ready, readings } = useReadings();

  const sections = useMemo(
    () =>
      VITAL_ORDER.map((type) => ({ type, label: VITAL_LABEL[type], insight: buildInsight(readings, type), summary: summarize(readings, type) })).sort(
        (a, b) => ATTENTION_RANK[a.insight.status] - ATTENTION_RANK[b.insight.status],
      ),
    [readings],
  );
  const flagged = useMemo(() => flaggedReadings(readings), [readings]);

  if (!ready) {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Reading your saved readings
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
        <h2 className="font-display text-lg font-semibold text-fg">Nothing to analyse yet</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          Once you save a reading, Senzora explains what it means here and flags anything that crosses a line.
        </p>
        <Link href="/vitals" className={`${primaryButton} mt-6`}>
          <Plus className="size-4" aria-hidden="true" />
          Record a Vital
        </Link>
      </section>
    );
  }

  const bp = THRESHOLDS.bloodPressure;
  const hr = THRESHOLDS.heartRate;
  const temp = THRESHOLDS.bodyTemperature;
  const spo2 = THRESHOLDS.bloodOxygen;

  return (
    <div className="insight-workspace space-y-8">
      <p className="max-w-4xl rounded-2xl border border-line bg-card/70 px-5 py-4 text-sm leading-relaxed text-muted">
        Senzora only flags a reading after it has crossed a line. Blood pressure of {bp.caution.systolic}/{bp.caution.diastolic} or above is flagged, and{" "}
        {bp.urgent.systolic}/{bp.urgent.diastolic} or above is urgent. Heart rate outside {hr.low} to {hr.high} bpm is flagged. Body temperature of {temp.high.toFixed(1)} °C or
        above, or below {temp.low.toFixed(1)} °C, is flagged. Blood oxygen below {spo2.low}% is flagged, and {spo2.urgent}% or lower is urgent.
      </p>

      {sections.map(({ type, label, insight, summary }) => (
        <section key={type} aria-labelledby={`${type}-heading`} className="space-y-4">
          <h2 id={`${type}-heading`} className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
            <VitalIcon type={type} className="size-5 text-accent-bright" />
            {label}
          </h2>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <InsightCard insight={insight} readings={readings} />
            </div>
            <div className="lg:col-span-3">
              <VitalTrend summary={summary} />
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="flagged-heading" className="rounded-3xl border border-line bg-card p-5">
        <h2 id="flagged-heading" className="font-display text-lg font-semibold text-fg">
          Readings that crossed a line
        </h2>
        {flagged.length > 0 ? (
          <>
            <p className="text-sm text-muted">
              {flagged.length > MAX_FLAGGED ? `Your ${MAX_FLAGGED} newest of ${flagged.length} flagged readings.` : `${flagged.length} of your saved readings ${flagged.length === 1 ? "is" : "are"} flagged.`}
            </p>
            <ul className="mt-4 divide-y divide-line">
              {flagged.slice(0, MAX_FLAGGED).map(({ reading, flag }) => (
                <li key={reading.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
                  <div className="flex items-start gap-3">
                    {flag.level === "urgent" ? (
                      <OctagonAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                    ) : (
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {readingName(reading)} {readingValue(reading)}
                      </p>
                      <p className="text-xs leading-relaxed text-muted">
                        {readingName(reading)} {flag.reason}. {formatWhen(reading.measuredAt)} · {SOURCE_LABEL[reading.source]}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold text-danger ${flag.level === "urgent" ? "border-danger bg-raised" : "border-dashed border-danger"}`}>
                    {LEVEL_LABEL[flag.level]}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-line px-4 py-6">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent-bright" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-fg">No saved reading has crossed a line</p>
              <p className="mt-1 text-sm text-muted">Keep recording at similar times of day so changes show up early.</p>
            </div>
          </div>
        )}
      </section>

      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Senzora gives general information, not a medical diagnosis. If a reading worries you or you feel unwell, contact a health professional or your local emergency service.
      </p>
    </div>
  );
}
