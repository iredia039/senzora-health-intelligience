"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { textLink } from "@/components/ui/buttons";
import { VITAL_LABEL, VITAL_NAME, VITAL_ORDER, VITAL_UNIT, withUnit } from "@/lib/format";
import type { Reading, VitalType } from "@/types";

const axisTick = { fill: "var(--muted)", fontSize: 12 };

/** Heart rate is the first tab, then the others in their usual order. */
const TAB_ORDER: VitalType[] = ["heart_rate", ...VITAL_ORDER.filter((type) => type !== "heart_rate")];
const WINDOWS = [{ id: "24h", label: "24h", ms: 86_400_000 }, { id: "7d", label: "7 days", ms: 7 * 86_400_000 }, { id: "30d", label: "30 days", ms: 30 * 86_400_000 }] as const;

function periodAverage(readings: Reading[], type: VitalType): string | null {
  if (!readings.length) return null;
  const average = (values: number[], digits = 0) => (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(digits);
  switch (type) {
    case "heart_rate": return `${average(readings.map((reading) => (reading.type === "heart_rate" ? reading.bpm : 0)))} bpm`;
    case "blood_pressure": return `${average(readings.map((reading) => (reading.type === "blood_pressure" ? reading.systolic : 0)))}/${average(readings.map((reading) => (reading.type === "blood_pressure" ? reading.diastolic : 0)))} mmHg`;
    case "body_temperature": return `${average(readings.map((reading) => (reading.type === "body_temperature" ? reading.celsius : 0)), 1)} °C`;
    case "blood_oxygen": return `${average(readings.map((reading) => (reading.type === "blood_oxygen" ? reading.spo2 : 0)))}%`;
  }
}

export function TrendsCard({ readings }: { readings: Reading[] }) {
  const [tab, setTab] = useState<VitalType>("heart_rate");
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("30d");
  // The rolling window must be anchored in the browser. Reading the clock while
  // React prerenders this Client Component produces an unstable server value.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(task);
  }, []);

  const points = useMemo(() => {
    if (now === null) return [];
    const window = WINDOWS.find((item) => item.id === windowId)!;
    const from = now - window.ms;
    return readings.filter((r) => r.type === tab && Date.parse(r.measuredAt) >= from).sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt)).slice(-30).map((r) => ({
      label: new Date(r.measuredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      bpm: r.type === "heart_rate" ? r.bpm : undefined,
      systolic: r.type === "blood_pressure" ? r.systolic : undefined,
      diastolic: r.type === "blood_pressure" ? r.diastolic : undefined,
      celsius: r.type === "body_temperature" ? r.celsius : undefined,
      spo2: r.type === "blood_oxygen" ? r.spo2 : undefined,
    }));
  }, [now, readings, tab, windowId]);

  const unit = VITAL_UNIT[tab];
  const name = VITAL_NAME[tab];
  const selectedWindow = WINDOWS.find((item) => item.id === windowId)!;
  const allInWindow = useMemo(
    () => (now === null ? [] : readings.filter((reading) => reading.type === tab && Date.parse(reading.measuredAt) >= now - selectedWindow.ms)),
    [now, readings, selectedWindow.ms, tab],
  );
  const previousPeriod = useMemo(
    () => (now === null ? [] : readings.filter((reading) => {
      const timestamp = Date.parse(reading.measuredAt);
      return reading.type === tab && timestamp >= now - selectedWindow.ms * 2 && timestamp < now - selectedWindow.ms;
    })),
    [now, readings, selectedWindow.ms, tab],
  );
  const dot = (color: string) => ({ r: 3, fill: color });
  const lineProps = { type: "monotone" as const, strokeWidth: 2.5, isAnimationActive: true, animationDuration: 700 };

  return (
    <section className="analytics-workspace" aria-labelledby="trends-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Clinical analytics</p>
          <h2 id="trends-heading" className="mt-1 font-display text-2xl font-semibold text-fg">Signal trends</h2>
          <p className="text-sm text-muted">
            {now === null ? "Preparing your selected date range." : points.length > 0 ? `${points.length} saved ${name} reading${points.length === 1 ? "" : "s"} in the selected period, in ${unit}.` : `No ${name} readings in the selected period.`}
          </p>
        </div>
        <div role="group" aria-label="Choose time range" className="analytics-filter">
          {WINDOWS.map((item) => <button key={item.id} type="button" aria-pressed={windowId === item.id} onClick={() => setWindowId(item.id)}>{item.label}</button>)}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choose a vital">
          {TAB_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`analytics-tab ${
                tab === id ? "analytics-tab--active" : ""
              }`}
            >
              {VITAL_LABEL[id]}
            </button>
          ))}
      </div>

      <p className="analytics-note">{now === null ? "Preparing saved measurements…" : `Showing ${allInWindow.length} record${allInWindow.length === 1 ? "" : "s"} taken in the last ${selectedWindow.label}. This chart uses saved measurements only.`}</p>
      {now !== null && (allInWindow.length > 0 || previousPeriod.length > 0) && (
        <dl className="analytics-comparison" aria-label={`Comparison of ${name} measurements across adjacent ${selectedWindow.label} periods`}>
          <div><dt>Selected period</dt><dd>{periodAverage(allInWindow, tab) ?? "No records"}</dd></div>
          <div><dt>Previous period</dt><dd>{periodAverage(previousPeriod, tab) ?? "No records"}</dd></div>
          <div><dt>Recorded</dt><dd>{allInWindow.length} / {previousPeriod.length}</dd></div>
        </dl>
      )}

      {now === null ? (
        <div aria-busy="true" className="mt-5 h-64 animate-pulse rounded-xl border border-line bg-raised/30" />
      ) : points.length >= 2 ? (
        <div className="analytics-chart" role="img" aria-label={`Line chart of your saved ${name} readings in ${unit}, from ${points[0].label} to ${points[points.length - 1].label}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 5" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={44} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--fg)", boxShadow: "0 18px 36px -24px #000" }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(value, seriesName) => [withUnit(String(value), tab), seriesName]}
              />
              {tab === "blood_pressure" && <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />}
              {tab === "heart_rate" && <Line {...lineProps} dataKey="bpm" name="Heart rate (bpm)" stroke="var(--accent-bright)" dot={dot("var(--accent-bright)")} />}
              {tab === "blood_pressure" && (
                <>
                  <Line {...lineProps} dataKey="systolic" name="Systolic (mmHg)" stroke="var(--accent-bright)" dot={dot("var(--accent-bright)")} />
                  <Line {...lineProps} dataKey="diastolic" name="Diastolic (mmHg)" stroke="var(--sky)" strokeDasharray="5 4" dot={dot("var(--sky)")} />
                </>
              )}
              {tab === "body_temperature" && <Line {...lineProps} dataKey="celsius" name="Temperature (°C)" stroke="var(--accent-bright)" dot={dot("var(--accent-bright)")} />}
              {tab === "blood_oxygen" && <Line {...lineProps} dataKey="spo2" name="Blood oxygen (%)" stroke="var(--accent-bright)" dot={dot("var(--accent-bright)")} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 text-center">
          <p className="text-sm font-medium text-fg">
            {points.length === 0 ? `No ${name} readings yet` : `One ${name} reading saved`}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {points.length === 0
              ? `Each ${name} reading you record becomes a point on this chart.`
              : "Record at least one more reading to see a trend line."}
          </p>
          <Link href="/vitals" className={`${textLink} mt-4`}>
            Go to Vitals
          </Link>
        </div>
      )}
    </section>
  );
}
