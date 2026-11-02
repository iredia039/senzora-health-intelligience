export type VitalType = "heart_rate" | "blood_pressure" | "body_temperature" | "blood_oxygen";

/** "demo" readings come from the Load demo data action and are always labelled as such. */
export type ReadingSource = "manual" | "device" | "demo";

type ReadingBase = {
  id: string;
  /** ISO 8601 timestamp of when the measurement was taken. */
  measuredAt: string;
  source: ReadingSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type HeartRateReading = ReadingBase & { type: "heart_rate"; bpm: number };

export type BloodPressureReading = ReadingBase & {
  type: "blood_pressure";
  systolic: number;
  diastolic: number;
};

/** Degrees Celsius, one decimal place, for example 36.8. */
export type BodyTemperatureReading = ReadingBase & { type: "body_temperature"; celsius: number };

/** Oxygen saturation (SpO2) as a whole-number percentage, for example 97. */
export type BloodOxygenReading = ReadingBase & { type: "blood_oxygen"; spo2: number };

export type Reading = HeartRateReading | BloodPressureReading | BodyTemperatureReading | BloodOxygenReading;

/** What the vitals form collects; the storage layer adds ids, source and timestamps. */
export type ReadingInput =
  | { type: "heart_rate"; bpm: number; measuredAt: string; notes?: string }
  | { type: "blood_pressure"; systolic: number; diastolic: number; measuredAt: string; notes?: string }
  | { type: "body_temperature"; celsius: number; measuredAt: string; notes?: string }
  | { type: "blood_oxygen"; spo2: number; measuredAt: string; notes?: string };

export type ThemePreference = "light" | "dark" | "system";

export type Preferences = {
  displayName: string;
  theme: ThemePreference;
  /** Prototype analysis rules are written for adults only. */
  ageGroup: "adult";
  alertsEnabled: boolean;
};

export type InsightStatus = "reassuring" | "caution" | "urgent" | "insufficient_data";

export type Insight = {
  id: string;
  title: string;
  vital: VitalType;
  status: InsightStatus;
  explanation: string;
  nextStep: string;
  /** Reading ids this insight is based on. */
  readingIds: string[];
  limitations?: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  /** True for responses from the deterministic prototype assistant. */
  prototype?: boolean;
};
