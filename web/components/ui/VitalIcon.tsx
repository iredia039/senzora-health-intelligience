import { Droplets, Gauge, HeartPulse, Thermometer, type LucideIcon } from "lucide-react";
import type { VitalType } from "@/types";

const ICONS: Record<VitalType, LucideIcon> = {
  heart_rate: HeartPulse,
  blood_pressure: Gauge,
  body_temperature: Thermometer,
  blood_oxygen: Droplets,
};

export function VitalIcon({ type, className = "size-4 shrink-0 text-accent-bright" }: { type: VitalType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} aria-hidden="true" />;
}
