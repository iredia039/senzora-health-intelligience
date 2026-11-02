"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { THRESHOLDS, type VitalSummary } from "@/lib/analysis";
import { VITAL_NAME, VITAL_UNIT, formatWhen, readingValue, withUnit } from "@/lib/format";
import { textLink } from "@/components/ui/buttons";
import type { VitalType } from "@/types";

const axisTick = { fill: "var(--muted)", fontSize: 12 };
const MAX_POINTS = 30;

const flagLabel = (text: string) => ({ value: text, position: "insideTopRight" as const, fill: "var(--danger)", fontSize: 11 });

/** How much space the chart leaves around the data, and how finely the axis is rounded. */
const AXIS: Record<VitalType, { pad: number; step: number }> = {
  heart_rate: { pad: 10, step: 5 },
  blood_pressure: { pad: 10, step: 5 },
  body_temperature: { pad: 0.5, step: 0.5 },
  blood_oxygen: { pad: 2, step: 1 },
};

/** The values where readings get flagged, drawn as dashed lines. */
const FLAG_LINES: Record<VitalType, number[]> = {
  heart_rate: [THRESHOLDS.heartRate.low, THRESHOLDS.heartRate.high],
  blood_pressure: [THRESHOLDS.bloodPressure.caution.diastolic, THRESHOLDS.bloodPressure.caution.systolic],
  body_temperature: [THRESHOLDS.bodyTemperature.low, THRESHOLDS.bodyTemperature.high],
  blood_oxygen: [THRESHOLDS.bloodOxygen.low],
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-raised px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-sm font-semibold text-fg">{children}</dd>
    </div>
  );
}

export function VitalTrend({ summary }: { summary: VitalSummary }) {
  const type = summary.type;
  const name = VITAL_NAME[type];
  const unit = VITAL_UNIT[type];
  const points = summary.readings.slice(-MAX_POINTS).map((r) => ({
    label: formatWhen(r.measuredAt),
    bpm: r.type === "heart_rate" ? r.bpm : undefined,
    systolic: r.type === "blood_pressure" ? r.systolic : undefined,
    diastolic: r.type === "blood_pressure" ? r.diastolic : undefined,
    celsius: r.type === "body_temperature" ? r.celsius : undefined,
    spo2: r.type === "blood_oxygen" ? r.spo2 : undefined,
  }));

  // Keep the flag lines inside the chart even when every reading is well away from them.
  const values = points.flatMap((p) => [p.bpm, p.systolic, p.diastolic, p.celsius, p.spo2]).filter((v): v is number => v !== undefined);
  const lines = FLAG_LINES[type];
  const { pad, step } = AXIS[type];
  const low = Math.floor((Math.min(...values, ...lines) - pad) / step) * step;
  const rawHigh = Math.ceil((Math.max(...values, ...lines) + pad) / step) * step;
  // Oxygen saturation cannot go above 100%.
  const high = type === "blood_oxygen" ? Math.min(100, rawHigh) : rawHigh;

  const change = summary.change;
  const ChangeIcon = change?.direction === "up" ? ArrowUp : change?.direction === "down" ? ArrowDown : Minus;

  const lineProps = { type: "monotone" as const, strokeWidth: 2, isAnimationActive: false };

  return (
    <section aria-labelledby={`${type}-trend-heading`} className="rounded-2xl border border-line bg-card p-5">
      <h3 id={`${type}-trend-heading`} className="font-display text-lg font-semibold text-fg">
        Trend
      </h3>
      <p className="text-sm text-muted">
        {summary.count > 0
          ? `Your last ${points.length} saved ${name} reading${points.length === 1 ? "" : "s"}, in ${unit}. Dashed lines mark where readings get flagged.`
          : `Measured in ${unit}.`}
      </p>

      {summary.latest && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Latest">{readingValue(summary.latest)}</Stat>
          <Stat label="Average">{summary.average}</Stat>
          <Stat label="Lowest to highest">{summary.range}</Stat>
          <Stat label="Since previous">
            {change ? (
              <span className="inline-flex items-center gap-1">
                <ChangeIcon className="size-3.5 shrink-0 text-accent-bright" aria-hidden="true" />
                {change.text}
              </span>
            ) : (
              "Only one reading"
            )}
          </Stat>
        </dl>
      )}

      {points.length >= 2 ? (
        <div
          className="mt-5 h-64 w-full"
          role="img"
          aria-label={`Line chart of your last ${points.length} ${name} readings in ${unit}, from ${points[0].label} to ${points[points.length - 1].label}, with dashed lines where readings are flagged.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={[low, high]} width={44} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)" }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(value, seriesName) => [withUnit(String(value), type), seriesName]}
              />

              {type === "heart_rate" && (
                <>
                  <ReferenceLine y={THRESHOLDS.heartRate.high} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Above ${THRESHOLDS.heartRate.high}`)} />
                  <ReferenceLine y={THRESHOLDS.heartRate.low} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Below ${THRESHOLDS.heartRate.low}`)} />
                  <Line {...lineProps} dataKey="bpm" name="Heart rate (bpm)" stroke="var(--accent-bright)" dot={{ r: 3, fill: "var(--accent-bright)" }} />
                </>
              )}

              {type === "blood_pressure" && (
                <>
                  <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
                  <ReferenceLine y={THRESHOLDS.bloodPressure.caution.systolic} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Systolic ${THRESHOLDS.bloodPressure.caution.systolic}`)} />
                  <ReferenceLine y={THRESHOLDS.bloodPressure.caution.diastolic} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Diastolic ${THRESHOLDS.bloodPressure.caution.diastolic}`)} />
                  <Line {...lineProps} dataKey="systolic" name="Systolic (mmHg)" stroke="var(--accent-bright)" dot={{ r: 3, fill: "var(--accent-bright)" }} />
                  <Line {...lineProps} dataKey="diastolic" name="Diastolic (mmHg)" stroke="var(--sky)" strokeDasharray="5 4" dot={{ r: 3, fill: "var(--sky)" }} />
                </>
              )}

              {type === "body_temperature" && (
                <>
                  <ReferenceLine y={THRESHOLDS.bodyTemperature.high} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Fever ${THRESHOLDS.bodyTemperature.high.toFixed(1)}`)} />
                  <ReferenceLine y={THRESHOLDS.bodyTemperature.low} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Below ${THRESHOLDS.bodyTemperature.low.toFixed(1)}`)} />
                  <Line {...lineProps} dataKey="celsius" name="Temperature (°C)" stroke="var(--accent-bright)" dot={{ r: 3, fill: "var(--accent-bright)" }} />
                </>
              )}

              {type === "blood_oxygen" && (
                <>
                  <ReferenceLine y={THRESHOLDS.bloodOxygen.low} stroke="var(--danger)" strokeDasharray="6 4" label={flagLabel(`Below ${THRESHOLDS.bloodOxygen.low}`)} />
                  <Line {...lineProps} dataKey="spo2" name="Blood oxygen (%)" stroke="var(--accent-bright)" dot={{ r: 3, fill: "var(--accent-bright)" }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 text-center">
          <p className="text-sm font-medium text-fg">{points.length === 0 ? `No ${name} readings yet` : `One ${name} reading saved`}</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {points.length === 0 ? `Each ${name} reading you record becomes a point on this chart.` : "Record at least one more reading to see a trend line."}
          </p>
          <Link href="/vitals" className={`${textLink} mt-4`}>
            Go to Vitals
          </Link>
        </div>
      )}
    </section>
  );
}
