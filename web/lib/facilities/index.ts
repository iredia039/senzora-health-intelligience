import { apiRequest } from "@/lib/api";
import type { Facility, FacilityResult, FacilitySearch } from "./types";

export { AREAS } from "./mock";
export const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
export const DEFAULT_RADIUS_KM = 10;

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Haversine straight-line distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// API shape: Facility without "source" + server-computed distance
type ApiFacility = Omit<Facility, "source"> & { distanceKm: number };

// Fetch facilities from GET /facilities (OSM data or demo fallback)
export async function searchFacilities({ lat, lng, type, radiusKm = DEFAULT_RADIUS_KM }: FacilitySearch): Promise<FacilityResult[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) });
  if (type) params.set("type", type);

  const places = await apiRequest<ApiFacility[]>(`/facilities?${params.toString()}`);

  return places.map((place) => ({
    ...place,
      source: place.id.startsWith("geo-") ? "osm" : "demo",
    distanceKm: Math.round(place.distanceKm * 10) / 10,
  }));
}
