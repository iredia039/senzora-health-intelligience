"use client";

import Link from "next/link";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { textLink } from "@/components/ui/buttons";
import type { Reading } from "@/types";

type Tab = "heart_rate" | "blood_pressure";

const TABS: { id: Tab; label: string }[] = [
  { id: "heart_rate", label: "Heart rate" },
  { id: "blood_pressure", label: "Blood pressure" },
];

const axisTick = { fill: "var(--muted)", fontSize: 12 };

export function TrendsCard({ readings }: { readings: Reading[] }) {
  const [tab, setTab] = useState<Tab>("heart_rate");

  const points = readings
    .filter((r) => r.type === tab)
    .sort((a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt))
    .slice(-14)
    .map((r) => ({
      label: new Date(r.measuredAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      bpm: r.type === "heart_rate" ? r.bpm : undefined,
      systolic: r.type === "blood_pressure" ? r.systolic : undefined,
      diastolic: r.type === "blood_pressure" ? r.diastolic : undefined,
    }));

  const unit = tab === "heart_rate" ? "bpm" : "mmHg";
  const name = tab === "heart_rate" ? "heart rate" : "blood pressure";

  return (
    <section className="rounded-2xl border border-line bg-card p-5 lg:col-span-2" aria-labelledby="trends-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="trends-heading" className="font-display text-lg font-semibold text-fg">Health trends</h2>
          <p className="text-sm text-muted">
            {points.length > 0 ? `Your last ${points.length} saved ${name} reading${points.length === 1 ? "" : "s"}, in ${unit}.` : `Measured in ${unit}.`}
          </p>
        </div>
        <div role="group" aria-label="Choose a vital" className="flex rounded-xl border border-line bg-canvas p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === id ? "bg-raised text-accent-bright" : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {points.length >= 2 ? (
        <div className="mt-5 h-64 w-full" role="img" aria-label={`Line chart of your last ${points.length} ${name} readings in ${unit}, from ${points[0].label} to ${points[points.length - 1].label}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--line)" }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={44} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)" }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(value, seriesName) => [`${value} ${unit}`, seriesName]}
              />
              {tab === "blood_pressure" && <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />}
              {tab === "heart_rate" ? (
                <Line type="monotone" dataKey="bpm" name="Heart rate (bpm)" stroke="var(--accent-bright)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent-bright)" }} isAnimationActive={false} />
              ) : (
                <>
                  <Line type="monotone" dataKey="systolic" name="Systolic (mmHg)" stroke="var(--accent-bright)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent-bright)" }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="diastolic" name="Diastolic (mmHg)" stroke="var(--sky)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "var(--sky)" }} isAnimationActive={false} />
                </>
              )}
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
