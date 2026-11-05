"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, Bot, Droplets, Gauge, HeartPulse, MapPin, Plus, Thermometer } from "lucide-react";
import { classifyReading } from "@/lib/analysis";
import { VITAL_LABEL, VITAL_ORDER, formatWhen, readingName, readingValue } from "@/lib/format";
import { useSessionUser } from "@/lib/hooks/useSession";
import { useReadings } from "@/lib/hooks/useStoredData";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import type { Reading, VitalType } from "@/types";
import { TrendsCard } from "./TrendsCard";

const STATUS_COPY = { normal: "Within app range", caution: "Needs attention", urgent: "Urgent" } as const;

const card = "rounded-2xl border border-line bg-raised/40";

function VitalIcon({ type, className = "size-4" }: { type: VitalType; className?: string }) {
  const Icon = type === "heart_rate" ? HeartPulse : type === "blood_pressure" ? Gauge : type === "body_temperature" ? Thermometer : Droplets;
  return <Icon className={className} aria-hidden="true" />;
}

function UrgentPanel() {
  return (
    <section id="urgent-help-panel" aria-label="Urgent help" className="rounded-2xl border border-line bg-raised/60 p-5">
      <p className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
        <span className="status-pip status-pip--urgent" aria-hidden="true" />
        If this is an emergency, call now
      </p>
      <p className="mt-2 max-w-2xl text-sm text-fg">
        Call your local emergency number straight away (for example 112, 911, 999 or 000). Do not wait for this app. Senzora cannot diagnose you or call for help on your behalf.
      </p>
      <Link href="/find-care" className={`${textLink} mt-4 inline-flex min-h-12 items-center`}>
        <MapPin className="size-4" /> Find nearby care
      </Link>
    </section>
  );
}

function VitalTile({ type, reading, previous }: { type: VitalType; reading?: Reading; previous?: Reading }) {
  if (!reading) {
    return (
      <article className="flex min-h-44 flex-col justify-between rounded-2xl border border-dashed border-line p-4">
        <div className="flex items-center gap-2 text-muted">
          <VitalIcon type={type} />
          <p className="text-sm font-medium">{VITAL_LABEL[type]}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Not recorded yet</p>
          <Link href="/vitals" className={`${textLink} mt-1 inline-flex min-h-12 items-center gap-1`}>
            Add a record <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </article>
    );
  }
  const flag = classifyReading(reading);
  return (
    <article className={`${card} flex min-h-44 flex-col justify-between p-4`}>
      <div className="flex items-center gap-2 text-muted">
        <VitalIcon type={type} />
        <p className="text-sm font-medium">{VITAL_LABEL[type]}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-fg">{readingValue(reading)}</p>
      <div className="mt-3 space-y-1.5">
        <span className={`state-label state-label--${flag.level}`}>
          <i />
          {STATUS_COPY[flag.level]}
        </span>
        <p className="text-xs text-muted">Manual entry</p>
        <p className="text-xs text-muted">{formatWhen(reading.measuredAt)}</p>
        {previous && <p className="text-xs text-muted">Previous: {readingValue(previous)}</p>}
      </div>
    </article>
  );
}

function IntelligencePanel({ readings }: { readings: Reading[] }) {
  const present = new Set(readings.map((reading) => reading.type));
  const missing = VITAL_ORDER.filter((type) => !present.has(type));
  const comparisons = VITAL_ORDER.map((type) => {
    const list = readings.filter((reading) => reading.type === type);
    return list.length > 1 ? { type, latest: list[0], previous: list[1] } : null;
  }).filter((item): item is { type: VitalType; latest: Reading; previous: Reading } => item !== null);

  return (
    <section aria-labelledby="intelligence-heading" className={`${card} p-5`}>
      <h2 id="intelligence-heading" className="font-display text-xl font-semibold text-fg">Health intelligence</h2>
      <p className="mt-1 text-sm text-muted">Observations from your saved measurements only. These are not a diagnosis.</p>
      <ul className="mt-4 space-y-3">
        {comparisons.slice(0, 3).map(({ type, latest, previous }) => (
          <li key={type} className="flex items-start gap-3">
            <span className="mt-0.5 text-accent"><VitalIcon type={type} /></span>
            <p className="text-sm text-fg">
              <strong className="font-medium">{VITAL_LABEL[type]}</strong>
              <span className="block text-xs text-muted">Latest {readingValue(latest)}, previous {readingValue(previous)}</span>
            </p>
          </li>
        ))}
        {missing.length > 0 && (
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-muted"><Plus className="size-4" aria-hidden="true" /></span>
            <p className="text-sm text-fg">
              <strong className="font-medium">Not recorded yet</strong>
              <span className="block text-xs text-muted">{missing.map((type) => VITAL_LABEL[type]).join(", ")}</span>
            </p>
          </li>
        )}
        {comparisons.length === 0 && missing.length === 0 && (
          <li className="text-sm text-muted">Record another measurement to create a comparison.</li>
        )}
      </ul>
      <Link href="/insights" className={`${textLink} mt-4 inline-flex min-h-12 items-center gap-1`}>
        Open insights <ArrowRight className="size-3.5" />
      </Link>
    </section>
  );
}

function ActivityTimeline({ readings }: { readings: Reading[] }) {
  const events = readings
    .flatMap((reading) => {
      const items = [{ id: `${reading.id}-recorded`, label: `${readingName(reading)} recorded`, value: readingValue(reading), at: reading.createdAt, type: reading.type }];
      if (Date.parse(reading.updatedAt) - Date.parse(reading.createdAt) > 1000) {
        items.push({ id: `${reading.id}-updated`, label: `${readingName(reading)} updated`, value: readingValue(reading), at: reading.updatedAt, type: reading.type });
      }
      return items;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);

  return (
    <section aria-labelledby="activity-heading" className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="activity-heading" className="font-display text-xl font-semibold text-fg">Recent activity</h2>
        <Link href="/history" className={`${textLink} inline-flex min-h-12 items-center gap-1`}>
          All history <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {events.length ? (
        <ol className="mt-2 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3">
              <span className="mt-0.5 text-accent"><VitalIcon type={event.type} /></span>
              <div>
                <p className="text-sm text-fg">{event.label}</p>
                <p className="text-xs text-muted">{event.value}, {formatWhen(event.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-2">
          <Activity className="size-5 text-accent" aria-hidden="true" />
          <p className="text-sm text-muted">Your timeline begins when you record a vital.</p>
          <Link href="/vitals" className={`${textLink} inline-flex min-h-12 items-center`}>Record a vital</Link>
        </div>
      )}
    </section>
  );
}

export function DashboardView() {
  const { readings } = useReadings();
  const user = useSessionUser();
  const [urgentOpen, setUrgentOpen] = useState(false);
  const latest = (type: VitalType) => readings.find((reading) => reading.type === type);
  const previous = (type: VitalType) => readings.filter((reading) => reading.type === type)[1];
  const categories = new Set(readings.map((reading) => reading.type)).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold text-fg sm:text-3xl">
            {user ? `Welcome back, ${user.name}.` : "Your record, in focus."}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {readings.length
              ? `${readings.length} saved measurement${readings.length === 1 ? "" : "s"} across ${categories} of ${VITAL_ORDER.length} vitals. Latest recorded ${formatWhen(readings[0].measuredAt)}. Saved on this device, entered by hand.`
              : "Record a vital to start building your personal health record."}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={urgentOpen}
          aria-controls="urgent-help-panel"
          onClick={() => setUrgentOpen((value) => !value)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-fg transition-colors hover:bg-raised/60"
        >
          <span className="status-pip status-pip--urgent" aria-hidden="true" />
          Urgent help?
        </button>
      </header>

      {urgentOpen && <UrgentPanel />}

      <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
        <Link href="/vitals" className={`${primaryButton} min-h-12 justify-center`}>
          <Plus className="size-4" /> Record a vital
        </Link>
        <Link href="/chat" className={`${secondaryButton} min-h-12 justify-center`}>
          <Bot className="size-4" /> Ask Senzora
        </Link>
        <Link href="/find-care" className={`${secondaryButton} min-h-12 justify-center`}>
          <MapPin className="size-4" /> Find care
        </Link>
      </nav>

      <section aria-label="Latest vitals" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {VITAL_ORDER.map((type) => (
          <VitalTile key={type} type={type} reading={latest(type)} previous={previous(type)} />
        ))}
      </section>

      <TrendsCard readings={readings} />

      <div className="grid gap-6 lg:grid-cols-2">
        <IntelligencePanel readings={readings} />
        <ActivityTimeline readings={readings} />
      </div>

      <section aria-labelledby="care-preview-heading" className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 size-5 text-accent" aria-hidden="true" />
          <div>
            <h2 id="care-preview-heading" className="font-display text-xl font-semibold text-fg">Find care when you need it</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">Use your location or choose an area to browse facilities in Senzora&apos;s care directory.</p>
          </div>
        </div>
        <Link href="/find-care" className={`${secondaryButton} min-h-12`}>
          Open Find Care <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
