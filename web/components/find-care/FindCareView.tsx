"use client";

import { useMemo, useState } from "react";
import { Clock, ExternalLink, Hospital, LoaderCircle, LocateFixed, MapPin, Siren, Stethoscope, type LucideIcon } from "lucide-react";
import { primaryButton, secondaryButton } from "@/components/ui/buttons";
import { AREAS, DEFAULT_RADIUS_KM, RADIUS_OPTIONS, searchFacilities } from "@/lib/facilities";
import type { FacilityResult, FacilityType } from "@/lib/facilities/types";

type Origin = { lat: number; lng: number; label: string };
type TypeFilter = "all" | FacilityType;

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hospital", label: "Hospitals" },
  { id: "clinic", label: "Clinics" },
];

const TYPE_INFO: Record<FacilityType, { label: string; icon: LucideIcon }> = {
  hospital: { label: "Hospital", icon: Hospital },
  clinic: { label: "Clinic", icon: Stethoscope },
};

const selectClass = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg";

/** Plain-language reasons, keyed by the browser's GeolocationPositionError codes. */
const LOCATION_ERRORS: Record<number, string> = {
  1: "Location permission was blocked. Choose an area below instead, or allow location for this site in your browser settings.",
  2: "Your device could not work out where you are. Choose an area below instead.",
  3: "Finding your location took too long. Try again, or choose an area below.",
};

function Badge({ icon: Icon, children, dashed = false }: { icon?: LucideIcon; children: React.ReactNode; dashed?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium text-muted ${dashed ? "border-dashed border-muted" : "border-line"}`}
    >
      {Icon && <Icon className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function FacilityCard({ facility }: { facility: FacilityResult }) {
  const { label, icon: Icon } = TYPE_INFO[facility.type];
  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-raised text-accent-bright">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-fg">{facility.name}</h3>
            <p className="text-sm text-muted">{facility.address}</p>
          </div>
        </div>
        <p className="shrink-0 text-right font-display text-lg font-semibold text-fg">
          {facility.distanceKm} <span className="text-sm font-medium text-muted">km</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>{label}</Badge>
        {facility.emergency && <Badge icon={Siren}>Emergency care</Badge>}
        {facility.open24h && <Badge icon={Clock}>Open 24 hours</Badge>}
        {facility.source === "demo" && <Badge dashed>Demo data</Badge>}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 rounded-md text-sm font-medium text-accent-bright underline-offset-4 hover:underline"
        >
          Get directions
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">to {facility.name} (opens in a new tab)</span>
        </a>
      </div>
    </li>
  );
}

export function FindCareView() {
  // Where the person is. It lives only in this component and is never saved.
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);

  const results = useMemo(
    () => (origin ? searchFacilities({ lat: origin.lat, lng: origin.lng, type: type === "all" ? undefined : type, radiusKm }) : []),
    [origin, type, radiusKm],
  );

  const useMyLocation = () => {
    setLocationError("");
    if (!("geolocation" in navigator)) {
      setLocationError("This browser cannot share your location. Choose an area below instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
        setLocating(false);
      },
      (err) => {
        setLocationError(LOCATION_ERRORS[err.code] ?? LOCATION_ERRORS[2]);
        setLocating(false);
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const chooseArea = (id: string) => {
    const area = AREAS.find((a) => a.id === id);
    setLocationError("");
    setOrigin(area ? { lat: area.lat, lng: area.lng, label: area.label } : null);
  };

  const areaId = AREAS.find((a) => origin && a.label === origin.label)?.id ?? "";

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-3 rounded-2xl border border-danger bg-card p-4 text-sm leading-relaxed text-fg">
        <Siren className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <span>If this is an emergency, call your local emergency service now. Do not wait for results on this page.</span>
      </p>

      <section aria-labelledby="where-heading" className="rounded-2xl border border-line bg-card p-5">
        <h2 id="where-heading" className="font-display text-lg font-semibold text-fg">
          Where are you?
        </h2>
        <p className="mt-1 text-sm text-muted">Your location is used to sort places by distance. It stays in this tab and is never saved.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <button type="button" onClick={useMyLocation} disabled={locating} className={`${primaryButton} w-full sm:w-auto`}>
              {locating ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="size-4" aria-hidden="true" />}
              {locating ? "Finding you" : "Use my location"}
            </button>
          </div>
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-fg">
              Or choose an area
            </label>
            <select id="area" value={areaId} onChange={(e) => chooseArea(e.target.value)} className={`${selectClass} mt-1.5`}>
              <option value="">Select a city</option>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p role="status" className={`mt-4 text-sm ${locationError ? "text-danger" : "text-muted"}`}>
          {locationError || (origin ? `Showing places near ${origin.label}.` : "")}
        </p>
      </section>

      {origin ? (
        <section aria-labelledby="results-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="results-heading" className="font-display text-lg font-semibold text-fg">
                Nearby care
              </h2>
              <p role="status" className="text-sm text-muted">
                {results.length} place{results.length === 1 ? "" : "s"} within {radiusKm} km. These are sample places for the prototype, not real facilities.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div role="group" aria-label="Type of place" className="flex rounded-xl border border-line bg-canvas p-1">
                {TYPE_FILTERS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={type === id}
                    onClick={() => setType(id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${type === id ? "bg-raised text-accent-bright" : "text-muted hover:text-fg"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="radius" className="block text-xs text-muted">
                  Within
                </label>
                <select id="radius" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className={`${selectClass} mt-1 py-2`}>
                  {RADIUS_OPTIONS.map((km) => (
                    <option key={km} value={km}>
                      {km} km
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {results.length > 0 ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {results.map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="text-sm font-medium text-fg">No {type === "all" ? "places" : TYPE_INFO[type].label.toLowerCase() + "s"} within {radiusKm} km</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Try a larger distance, or a different type of place.</p>
              {radiusKm < RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] && (
                <button type="button" onClick={() => setRadiusKm(RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1])} className={`${secondaryButton} mt-4`}>
                  Search within {RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1]} km
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <MapPin className="size-6 text-accent-bright" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-fg">Share your location or choose a city</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Hospitals and clinics will appear here, closest first.</p>
        </div>
      )}

      <p className="max-w-3xl text-xs leading-relaxed text-muted">
        Distances are in a straight line, not by road. Senzora gives general information, not a medical diagnosis.
      </p>
    </div>
  );
}
