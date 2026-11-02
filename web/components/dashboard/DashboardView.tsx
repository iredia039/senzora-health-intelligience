"use client";

import Link from "next/link";
import { Activity, ArrowRight, Bot, Droplets, Gauge, HeartPulse, MapPin, Plus, Thermometer } from "lucide-react";
import { classifyReading } from "@/lib/analysis";
import { VITAL_LABEL, VITAL_ORDER, formatWhen, readingName, readingValue } from "@/lib/format";
import { useSessionUser } from "@/lib/hooks/useSession";
import { useReadings } from "@/lib/hooks/useStoredData";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import type { HeartRateReading, Reading, VitalType } from "@/types";
import { TrendsCard } from "./TrendsCard";

const STATUS_COPY = { normal: "Within app range", caution: "Needs attention", urgent: "Urgent" } as const;

function Sparkline({ readings }: { readings: HeartRateReading[] }) {
  const points = readings.slice(0, 18).reverse();
  if (points.length < 2) return <div className="cardiac-empty"><HeartPulse className="size-5" /><span>{points.length === 1 ? "One saved reading — add another to reveal a trend." : "Your saved heart-rate trend will appear here."}</span></div>;
  const values = points.map((point) => point.bpm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const polyline = points.map((point, index) => `${index * (100 / (points.length - 1))},${88 - ((point.bpm - min) / Math.max(max - min, 1)) * 68}`).join(" ");
  return <svg className="cardiac-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Trend across ${points.length} saved heart-rate readings`}><line x1="0" x2="100" y1="20" y2="20" /><line x1="0" x2="100" y1="54" y2="54" /><line x1="0" x2="100" y1="88" y2="88" /><polyline points={polyline} /></svg>;
}

function VitalIcon({ type }: { type: VitalType }) {
  const Icon = type === "heart_rate" ? HeartPulse : type === "blood_pressure" ? Gauge : type === "body_temperature" ? Thermometer : Droplets;
  return <Icon className="size-4" aria-hidden="true" />;
}

function CompactVital({ reading, previous }: { reading?: Reading; previous?: Reading }) {
  if (!reading) return <article className="rail-vital rail-vital--empty"><span className="rail-vital__icon"><Activity className="size-4" /></span><div><p className="rail-vital__label">No measurement</p><h3>Record {"a vital"}</h3><Link href="/vitals" className={textLink}>Add record <ArrowRight className="size-3" /></Link></div></article>;
  const flag = classifyReading(reading);
  return <article className="rail-vital"><span className="rail-vital__icon"><VitalIcon type={reading.type} /></span><div className="min-w-0 flex-1"><p className="rail-vital__label">{VITAL_LABEL[reading.type]}</p><h3>{readingValue(reading)}</h3><p className="rail-vital__meta">{formatWhen(reading.measuredAt)}{previous ? ` · prev ${readingValue(previous)}` : " · first record"}</p></div><span className={`status-pip status-pip--${flag.level}`} title={STATUS_COPY[flag.level]} /></article>;
}

function IntelligencePanel({ readings }: { readings: Reading[] }) {
  const present = new Set(readings.map((reading) => reading.type));
  const missing = VITAL_ORDER.filter((type) => !present.has(type));
  const comparisons = VITAL_ORDER.map((type) => { const list = readings.filter((reading) => reading.type === type); return list.length > 1 ? { type, latest: list[0], previous: list[1] } : null; }).filter((item): item is { type: VitalType; latest: Reading; previous: Reading } => item !== null);
  return <section className="intelligence-panel" aria-labelledby="intelligence-heading"><div className="panel-kicker"><span>Signal interpretation</span><Bot className="size-4" /></div><h2 id="intelligence-heading">Health intelligence</h2><p className="panel-intro">Observations generated from saved measurements only.</p><div className="intelligence-list">{comparisons.slice(0, 3).map(({ type, latest, previous }) => <div className="intelligence-row" key={type}><span><VitalIcon type={type} /></span><p><strong>{VITAL_LABEL[type]}</strong><small>Latest {readingValue(latest)} · previous {readingValue(previous)}</small></p></div>)}{missing.length > 0 && <div className="intelligence-row intelligence-row--muted"><span><Plus className="size-4" /></span><p><strong>Not recorded yet</strong><small>{missing.map((type) => VITAL_LABEL[type]).join(" · ")}</small></p></div>}{comparisons.length === 0 && missing.length === 0 && <p className="panel-intro">Record another measurement to create a comparison.</p>}</div><Link href="/insights" className={`${textLink} mt-5`}>Open insights <ArrowRight className="size-3.5" /></Link></section>;
}

function ActivityTimeline({ readings }: { readings: Reading[] }) {
  const events = readings.flatMap((reading) => { const items = [{ id: `${reading.id}-recorded`, label: `${readingName(reading)} recorded`, value: readingValue(reading), at: reading.createdAt, type: reading.type }]; if (Date.parse(reading.updatedAt) - Date.parse(reading.createdAt) > 1000) items.push({ id: `${reading.id}-updated`, label: `${readingName(reading)} updated`, value: readingValue(reading), at: reading.updatedAt, type: reading.type }); return items; }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 5);
  return <section className="activity-panel" aria-labelledby="activity-heading"><div className="section-heading"><div><p className="eyebrow">Event stream</p><h2 id="activity-heading">Recent activity</h2></div><Link href="/history" className={textLink}>All history <ArrowRight className="size-3.5" /></Link></div>{events.length ? <ol className="medical-timeline">{events.map((event) => <li key={event.id}><span className="timeline-node"><VitalIcon type={event.type} /></span><div><p>{event.label}</p><small>{event.value} · {formatWhen(event.at)}</small></div></li>)}</ol> : <div className="activity-empty"><Activity className="size-5 text-accent" /><p>Your timeline begins when you record a vital.</p><Link href="/vitals" className={textLink}>Record a vital</Link></div>}</section>;
}

export function DashboardView() {
  const { readings } = useReadings();
  const user = useSessionUser();
  const latest = (type: VitalType) => readings.find((reading) => reading.type === type);
  const previous = (type: VitalType) => readings.filter((reading) => reading.type === type)[1];
  const heartReadings = readings.filter((reading): reading is HeartRateReading => reading.type === "heart_rate");
  const latestHeart = latest("heart_rate") as HeartRateReading | undefined;
  const categories = new Set(readings.map((reading) => reading.type)).size;

  return <div className="telemetry-dashboard">
    <div className="telemetry-commandbar"><div className="commandbar-brand"><span className="commandbar-dot" /><span>PERSONAL RECORD</span><b>·</b><span>LOCAL MEASUREMENTS</span></div><div className="commandbar-actions"><Link href="/chat" className={textLink}><Bot className="size-3.5" /> Senzora AI</Link><Link href="/find-care" className={textLink}><MapPin className="size-3.5" /> Find care</Link></div></div>

    <section className="system-overview" aria-labelledby="overview-heading"><div className="overview-copy"><p className="eyebrow"><span className="pulse-dot size-2 rounded-full bg-accent" />Health intelligence workspace</p><h2 id="overview-heading">{user ? `Welcome back, ${user.name}.` : "Your record, in focus."}</h2><p>{readings.length ? `You have ${readings.length} saved measurement${readings.length === 1 ? "" : "s"} across ${categories} vital categor${categories === 1 ? "y" : "ies"}. The latest was recorded ${formatWhen(readings[0].measuredAt)}.` : "Record a vital to start building your personal health record."}</p><div className="overview-actions"><Link href="/vitals" className={primaryButton}><Plus className="size-4" />Record a vital</Link><Link href="/chat" className={secondaryButton}><Bot className="size-4" />Ask Senzora</Link></div></div><div className="overview-orbit"><div className="orbit orbit--one" /><div className="orbit orbit--two" /><div className="orbit-core"><span>{readings.length}</span><small>records</small></div><small className="orbit-caption">No continuous sensor connected</small></div><dl className="overview-facts"><div><dt>Record status</dt><dd>{readings.length ? "Available" : "Awaiting first entry"}</dd></div><div><dt>Vital coverage</dt><dd>{categories} / 4 categories</dd></div><div><dt>Latest entry</dt><dd>{readings[0] ? formatWhen(readings[0].measuredAt) : "—"}</dd></div></dl></section>

    <section className="telemetry-workspace" aria-labelledby="monitoring-heading"><div className="section-heading"><div><p className="eyebrow">Biometric records</p><h2 id="monitoring-heading">Monitoring workspace</h2></div><Link href="/vitals" className={textLink}>Manage measurements <ArrowRight className="size-3.5" /></Link></div><div className="monitoring-grid"><article className="cardiac-panel"><div className="cardiac-panel__head"><div><div className="panel-kicker"><HeartPulse className="size-4" /><span>Heart rate history</span></div><h3>{latestHeart ? <>{latestHeart.bpm}<small> BPM</small></> : "—"}</h3><p>{latestHeart ? `${formatWhen(latestHeart.measuredAt)}${previous("heart_rate") ? ` · previous ${readingValue(previous("heart_rate")!)}` : ""}` : "No saved heart-rate measurement"}</p></div>{latestHeart && <span className={`state-label state-label--${classifyReading(latestHeart).level}`}><i />{STATUS_COPY[classifyReading(latestHeart).level]}</span>}</div><div className="cardiac-chart"><Sparkline readings={heartReadings} /><span className="chart-axis chart-axis--min">{heartReadings.length ? `${Math.min(...heartReadings.map((reading) => reading.bpm))} bpm` : "No data"}</span><span className="chart-axis chart-axis--max">{heartReadings.length ? `${Math.max(...heartReadings.map((reading) => reading.bpm))} bpm` : ""}</span></div><p className="data-caption">Recorded heart-rate trend · {heartReadings.length} measurement{heartReadings.length === 1 ? "" : "s"}</p></article><div className="vital-rail"><CompactVital reading={latest("blood_pressure")} previous={previous("blood_pressure")} /><CompactVital reading={latest("body_temperature")} previous={previous("body_temperature")} /><CompactVital reading={latest("blood_oxygen")} previous={previous("blood_oxygen")} /></div></div></section>

    <section className="analytics-block"><TrendsCard readings={readings} /></section>
    <div className="lower-workspaces"><IntelligencePanel readings={readings} /><ActivityTimeline readings={readings} /></div>
    <section className="care-preview" aria-labelledby="care-preview-heading"><span className="care-preview__icon"><MapPin className="size-5" /></span><div><p className="eyebrow">Healthcare access</p><h2 id="care-preview-heading">Find care when you need it</h2><p>Use your location or choose an area to browse the facilities available in Senzora&apos;s care directory.</p></div><Link href="/find-care" className={secondaryButton}>Open Find Care <ArrowRight className="size-4" /></Link></section>
  </div>;
}
