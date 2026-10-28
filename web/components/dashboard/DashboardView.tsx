"use client";

import Link from "next/link";
import { Activity, ArrowRight, ClipboardList, Gauge, HeartPulse, MessageCircle, Plus, type LucideIcon } from "lucide-react";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { useReadings, usePreferences } from "@/lib/hooks/useStoredData";
import type { BloodPressureReading, HeartRateReading, Reading, ReadingSource } from "@/types";
import { TrendsCard } from "./TrendsCard";

const SOURCE_LABEL: Record<ReadingSource, string> = { manual: "Entered by you", device: "Device", demo: "Demo data" };

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const readingValue = (r: Reading) => (r.type === "heart_rate" ? `${r.bpm} bpm` : `${r.systolic}/${r.diastolic} mmHg`);
const readingName = (r: Reading) => (r.type === "heart_rate" ? "Heart rate" : "Blood pressure");

function SourceBadge({ source }: { source: ReadingSource }) {
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[0.7rem] font-medium text-muted ${
        source === "demo" ? "border-dashed border-muted" : "border-line"
      }`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

function Card({ className = "", children, labelledBy }: { className?: string; children: React.ReactNode; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      {children}
    </section>
  );
}

function CardHeading({ id, title, action }: { id: string; title: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-lg font-semibold text-fg">{title}</h2>
      {action && (
        <Link href={action.href} className={textLink}>
          {action.label}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  emptyTitle,
  emptyText,
  emptyAction,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  detail: string;
  emptyTitle: string;
  emptyText: string;
  emptyAction: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <Icon className="size-4 shrink-0 text-accent-bright" aria-hidden="true" />
        <h3>{label}</h3>
      </div>
      {value ? (
        <div className="mt-4">
          <p className="font-display text-3xl font-semibold leading-none tracking-tight text-fg">{value}</p>
          <p className="mt-2 text-sm text-muted">{detail}</p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-base font-medium text-fg">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted">{emptyText}</p>
          <Link href="/vitals" className={`${textLink} mt-3`}>
            {emptyAction}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

export function DashboardView() {
  const { readings } = useReadings();
  const prefs = usePreferences();

  const latestHeart = readings.find((r): r is HeartRateReading => r.type === "heart_rate");
  const latestBp = readings.find((r): r is BloodPressureReading => r.type === "blood_pressure");
  const heartCount = readings.filter((r) => r.type === "heart_rate").length;
  const bpCount = readings.length - heartCount;
  const recent = readings.slice(0, 5);

  const activity = readings
    .flatMap((r) => {
      const events = [{ key: `${r.id}-c`, label: `${readingName(r)} recorded`, value: readingValue(r), at: r.createdAt }];
      if (Date.parse(r.updatedAt) - Date.parse(r.createdAt) > 1000) {
        events.push({ key: `${r.id}-u`, label: `${readingName(r)} edited`, value: readingValue(r), at: r.updatedAt });
      }
      return events;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6);

  const hasData = readings.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section
        aria-labelledby="welcome-heading"
        className="flex flex-col gap-6 rounded-2xl border border-line bg-linear-to-br from-card to-canvas p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">See Beyond the Signals.</p>
          <h2 id="welcome-heading" className="mt-3 font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Welcome back, {prefs.displayName}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            {hasData
              ? `Your latest reading was saved on ${formatWhen(readings[0].measuredAt)}. Add a new one to keep your trends current.`
              : "You have no saved readings yet. Record your first heart rate or blood pressure to start building your overview."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 sm:shrink-0">
          <Link href="/vitals" className={primaryButton}>
            <Plus className="size-4" aria-hidden="true" />
            Record a Vital
          </Link>
          <Link href="/chat" className={secondaryButton}>
            <MessageCircle className="size-4 text-accent-bright" aria-hidden="true" />
            Ask Senzora
          </Link>
        </div>
      </section>

      {/* Latest readings */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={HeartPulse}
          label="Latest heart rate"
          value={latestHeart ? `${latestHeart.bpm} bpm` : undefined}
          detail={latestHeart ? `${formatWhen(latestHeart.measuredAt)} · ${SOURCE_LABEL[latestHeart.source]}` : ""}
          emptyTitle="No heart rate yet"
          emptyText="Record one to see it here."
          emptyAction="Record heart rate"
        />
        <StatCard
          icon={Gauge}
          label="Latest blood pressure"
          value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic} mmHg` : undefined}
          detail={latestBp ? `${formatWhen(latestBp.measuredAt)} · ${SOURCE_LABEL[latestBp.source]}` : ""}
          emptyTitle="No blood pressure yet"
          emptyText="Record one to see it here."
          emptyAction="Record blood pressure"
        />
        <div className="sm:col-span-2 xl:col-span-1">
          <StatCard
            icon={ClipboardList}
            label="Saved readings"
            value={hasData ? String(readings.length) : undefined}
            detail={`${heartCount} heart rate · ${bpCount} blood pressure`}
            emptyTitle="Nothing saved yet"
            emptyText="Readings you add are stored on this device."
            emptyAction="Record a vital"
          />
        </div>
      </div>

      {/* Trends + activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendsCard readings={readings} />
        <Card labelledBy="activity-heading">
          <CardHeading id="activity-heading" title="Recent activity" />
          {activity.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {activity.map((e) => (
                <li key={e.key} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-raised text-accent-bright">
                    <Activity className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{e.label}</p>
                    <p className="text-xs text-muted">
                      {e.value} · {formatWhen(e.at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <p className="text-sm font-medium text-fg">No activity yet</p>
              <p className="mt-1 text-sm text-muted">Each reading you record will show up here.</p>
              <Link href="/vitals" className={`${textLink} mt-3`}>
                Record your first vital
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Recent readings + assistant */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" labelledBy="recent-heading">
          <CardHeading id="recent-heading" title="Recent vital readings" action={hasData ? { href: "/history", label: "View all" } : undefined} />
          {recent.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                  <div className="flex items-center gap-3">
                    {r.type === "heart_rate" ? (
                      <HeartPulse className="size-4 shrink-0 text-accent-bright" aria-hidden="true" />
                    ) : (
                      <Gauge className="size-4 shrink-0 text-accent-bright" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-fg">{readingName(r)}</p>
                      <p className="text-xs text-muted">{formatWhen(r.measuredAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SourceBadge source={r.source} />
                    <p className="font-display text-base font-semibold text-fg">{readingValue(r)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-line px-6 py-10 text-center">
              <p className="text-sm font-medium text-fg">No readings recorded yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Record a reading by hand. Device connections are not available yet.</p>
              <Link href="/vitals" className={`${textLink} mt-3`}>
                Record a Vital
              </Link>
            </div>
          )}
        </Card>

        <Card labelledBy="assistant-heading">
          <CardHeading id="assistant-heading" title="Ask Senzora" />
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ask questions about your readings or your medicines in plain language.
          </p>
          <Link href="/chat" className={`${secondaryButton} mt-4`}>
            <MessageCircle className="size-4 text-accent-bright" aria-hidden="true" />
            Open the assistant
          </Link>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            Senzora gives general information, not a medical diagnosis. If a reading worries you or you feel unwell, contact a health professional or your local emergency service.
          </p>
        </Card>
      </div>
    </div>
  );
}
