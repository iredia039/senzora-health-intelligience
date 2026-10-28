import { MOCK_FACILITIES } from "./mock";
import type { FacilityResult, FacilitySearch } from "./types";

export { AREAS } from "./mock";
export const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
export const DEFAULT_RADIUS_KM = 10;

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance between two points on Earth (the haversine formula). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * The one place the Find Care page gets its facilities from.
 * Today it filters made-up data. When the API is ready, only this function changes:
 * it will call GET /facilities with the same values and return the same shape.
 */
export function searchFacilities({ lat, lng, type, radiusKm = DEFAULT_RADIUS_KM }: FacilitySearch): FacilityResult[] {
  return MOCK_FACILITIES.filter((f) => !type || f.type === type)
    .map((f) => ({ ...f, distanceKm: Math.round(distanceKm({ lat, lng }, f) * 10) / 10 }))
    .filter((f) => f.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
