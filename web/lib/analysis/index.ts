import type { Insight, InsightStatus, Reading, VitalType } from "@/types";

/**
 * Prototype rules, written for adults. Change a number here and every screen follows.
 * A reading is only flagged once it has already crossed a line: this file never predicts.
 */
export const THRESHOLDS = {
  bloodPressure: {
    urgent: { systolic: 180, diastolic: 120 },
    caution: { systolic: 140, diastolic: 90 },
    low: { systolic: 90, diastolic: 60 },
  },
  heartRate: { urgentLow: 40, low: 60, high: 100, urgentHigh: 140 },
} as const;

/** How many of the newest readings of one vital an insight looks at. */
export const RECENT_COUNT = 5;

export type Level = "normal" | "caution" | "urgent";
export type ReadingFlag = { level: Level; direction: "high" | "low" | "ok"; reason: string };

const NORMAL_BP = `${THRESHOLDS.bloodPressure.low.systolic}/${THRESHOLDS.bloodPressure.low.diastolic} to just under ${THRESHOLDS.bloodPressure.caution.systolic}/${THRESHOLDS.bloodPressure.caution.diastolic}`;
const NORMAL_HR = `${THRESHOLDS.heartRate.low} to ${THRESHOLDS.heartRate.high} bpm`;

/** Looks at one reading on its own and says whether it has crossed a line. */
export function classifyReading(r: Reading): ReadingFlag {
  if (r.type === "heart_rate") {
    const t = THRESHOLDS.heartRate;
    if (r.bpm >= t.urgentHigh) return { level: "urgent", direction: "high", reason: `is at or above ${t.urgentHigh} bpm, the urgent line` };
    if (r.bpm <= t.urgentLow) return { level: "urgent", direction: "low", reason: `is at or below ${t.urgentLow} bpm, the urgent line` };
    if (r.bpm > t.high) return { level: "caution", direction: "high", reason: `is above the typical resting range of ${NORMAL_HR}` };
    if (r.bpm < t.low) return { level: "caution", direction: "low", reason: `is below the typical resting range of ${NORMAL_HR}` };
    return { level: "normal", direction: "ok", reason: `is within the typical resting range of ${NORMAL_HR}` };
  }

  const t = THRESHOLDS.bloodPressure;
  if (r.systolic >= t.urgent.systolic || r.diastolic >= t.urgent.diastolic) {
    return { level: "urgent", direction: "high", reason: `is at or above ${t.urgent.systolic}/${t.urgent.diastolic}, the urgent line` };
  }
  if (r.systolic >= t.caution.systolic || r.diastolic >= t.caution.diastolic) {
    return { level: "caution", direction: "high", reason: `is at or above ${t.caution.systolic}/${t.caution.diastolic}, the line where readings are flagged` };
  }
  if (r.systolic < t.low.systolic || r.diastolic < t.low.diastolic) {
    return { level: "caution", direction: "low", reason: `is below ${t.low.systolic}/${t.low.diastolic}` };
  }
  return { level: "normal", direction: "ok", reason: `is within the range this app treats as normal (${NORMAL_BP})` };
}

const byNewest = (a: Reading, b: Reading) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt);
const ofType = (readings: Reading[], type: VitalType) => readings.filter((r) => r.type === type);

/** Every reading that has crossed a line, newest first. */
export function flaggedReadings(readings: Reading[]): { reading: Reading; flag: ReadingFlag }[] {
  return [...readings]
    .sort(byNewest)
    .map((reading) => ({ reading, flag: classifyReading(reading) }))
    .filter(({ flag }) => flag.level !== "normal");
}

/** How many readings from the last few days have crossed a line. Drives the dot on the bell. */
export function countRecentFlags(readings: Reading[], days = 7, now = Date.now()): number {
  const since = now - days * 86_400_000;
  return readings.filter((r) => Date.parse(r.measuredAt) >= since && classifyReading(r).level !== "normal").length;
}

/* ---- Trends: plain facts about the saved readings ---- */

export type VitalSummary = {
  type: VitalType;
  count: number;
  /** Oldest to newest, ready for a chart. */
  readings: Reading[];
  latest?: Reading;
  average?: string;
  range?: string;
  change?: { text: string; direction: "up" | "down" | "same" };
};

const numbers = (r: Reading): number[] => (r.type === "heart_rate" ? [r.bpm] : [r.systolic, r.diastolic]);
const unitOf = (type: VitalType) => (type === "heart_rate" ? "bpm" : "mmHg");
const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : "0");

export function summarize(readings: Reading[], type: VitalType): VitalSummary {
  const list = ofType(readings, type).sort((a, b) => -byNewest(a, b));
  if (list.length === 0) return { type, count: 0, readings: list };

  const unit = unitOf(type);
  const columns = numbers(list[0]).map((_, i) => list.map((r) => numbers(r)[i]));
  const average = columns.map((c) => Math.round(c.reduce((a, b) => a + b, 0) / c.length)).join("/");
  const range = columns.map((c) => `${Math.min(...c)}\u2013${Math.max(...c)}`).join(" / ");
  const latest = list[list.length - 1];

  let change: VitalSummary["change"];
  if (list.length >= 2) {
    const now = numbers(latest);
    const before = numbers(list[list.length - 2]);
    const diffs = now.map((n, i) => n - before[i]);
    const first = diffs[0];
    change = { text: `${diffs.map(sign).join("/")} ${unit}`, direction: first > 0 ? "up" : first < 0 ? "down" : "same" };
  }

  return { type, count: list.length, readings: list, latest, average: `${average} ${unit}`, range: `${range} ${unit}`, change };
}

/* ---- Insights: what the flags mean, in plain language ---- */

const STATUS_BY_LEVEL: Record<Level, InsightStatus> = { normal: "reassuring", caution: "caution", urgent: "urgent" };
const LEVEL_RANK: Record<Level, number> = { normal: 0, caution: 1, urgent: 2 };

const nameOf = (type: VitalType) => (type === "heart_rate" ? "heart rate" : "blood pressure");
const valueOf = (r: Reading) => (r.type === "heart_rate" ? `${r.bpm} bpm` : `${r.systolic}/${r.diastolic} mmHg`);

function nextStepFor(type: VitalType, flag: ReadingFlag): string {
  if (type === "blood_pressure") {
    if (flag.level === "urgent") {
      return "Sit down and rest for five minutes, then measure again. If it is still this high, or you have chest pain, a severe headache, shortness of breath, confusion or weakness, contact your local emergency service now.";
    }
    if (flag.direction === "low") {
      return "Low readings matter more if you feel dizzy, faint or unusually tired. Measure again while seated and rested, and speak to a health professional if low readings keep appearing or you have those symptoms.";
    }
    if (flag.level === "caution") {
      return "Rest seated for five minutes and measure again. If your readings stay at or above this line over several days, share your log with a doctor or pharmacist.";
    }
  } else {
    if (flag.level === "urgent") {
      return "Rest and measure again. If your heart rate stays this far outside the typical range, or you feel faint, have chest pain or find it hard to breathe, contact a health professional or your local emergency service now.";
    }
    if (flag.direction === "low") {
      return "A low resting heart rate is common in people who exercise a lot. If that is not you, or you feel dizzy, faint or unusually tired, speak to a health professional.";
    }
    if (flag.level === "caution") {
      return "Measure again after resting. Activity, caffeine, stress, fever and some medicines raise heart rate. If it keeps staying above the typical range at rest, or you feel unwell, speak to a health professional.";
    }
  }
  return "Keep recording at similar times of day so changes show up early. Nothing needs to be done based on these readings alone.";
}

function explanationFor(type: VitalType, recent: Reading[], flags: ReadingFlag[]): string {
  const name = nameOf(type);
  let text = `Your latest ${name} reading, ${valueOf(recent[0])}, ${flags[0].reason}.`;

  const flagged = flags.filter((f) => f.level !== "normal").length;
  const others = flags[0].level === "normal" ? flagged : flagged - 1;
  if (others > 0) {
    const verb = others === 1 ? "was" : "were";
    text += flags[0].level === "normal"
      ? ` ${others} of your last ${recent.length} ${name} readings ${verb} flagged.`
      : ` ${others} other${others === 1 ? "" : "s"} among your last ${recent.length} ${verb} flagged too.`;
  }
  return text;
}

function limitationsFor(type: VitalType, recent: Reading[]): string {
  const parts = ["This is general information for adults, not a diagnosis, and a single reading cannot diagnose anything."];
  if (recent.length === 1) parts.push("It is based on one reading, so there is no pattern to look at yet.");
  if (type === "heart_rate") parts.push("Senzora does not know whether you were resting when you measured.");
  const demo = recent.filter((r) => r.source === "demo").length;
  if (demo === recent.length) parts.push("These readings are demo data, not yours.");
  else if (demo > 0) parts.push("Some of these readings are demo data, not yours.");
  return parts.join(" ");
}

/** One insight for one vital, built from its newest readings. */
export function buildInsight(readings: Reading[], type: VitalType): Insight {
  const name = nameOf(type);
  const recent = ofType(readings, type).sort(byNewest).slice(0, RECENT_COUNT);

  if (recent.length === 0) {
    return {
      id: `insight-${type}`,
      title: `No ${name} readings yet`,
      vital: type,
      status: "insufficient_data",
      explanation: `Senzora has nothing to look at yet, so it cannot say anything about your ${name}.`,
      nextStep: `Record a ${name} reading on the Vitals page to get an analysis.`,
      readingIds: [],
      createdAt: "",
    };
  }

  const flags = recent.map(classifyReading);
  // The worst recent flag decides the status. When two are equally bad, the newest one wins.
  const driver = flags.reduce((worst, f) => (LEVEL_RANK[f.level] > LEVEL_RANK[worst.level] ? f : worst), flags[0]);
  const status = STATUS_BY_LEVEL[driver.level];
  // If the newest reading is already back in range, say the flag was earlier instead of "now".
  const latestIsFlagged = flags[0].level !== "normal";
  const title =
    status === "urgent"
      ? latestIsFlagged ? `Your ${name} needs attention now` : `A recent ${name} reading was urgent`
      : status === "caution"
        ? latestIsFlagged ? `Your ${name} crossed a flag line` : `A recent ${name} reading was flagged`
        : `Your ${name} looks steady`;

  return {
    id: `insight-${type}`,
    title,
    vital: type,
    status,
    explanation: explanationFor(type, recent, flags),
    nextStep: nextStepFor(type, driver),
    readingIds: recent.map((r) => r.id),
    limitations: limitationsFor(type, recent),
    createdAt: recent[0].updatedAt,
  };
}
