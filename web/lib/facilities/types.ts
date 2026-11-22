export type FacilityType = "hospital" | "clinic";

/** Facility — keep in sync with CONTRACT.md. */
export type Facility = {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
/** Neighbourhood label shown next to city. */
  area: string;
  lat: number;
  lng: number;
  /** Has emergency dept — false may also mean unconfirmed (OSM). */
  emergency: boolean;
  open24h: boolean;
  /** "osm" = real OpenStreetMap data, "demo" = fallback mock. */
  source: "osm" | "demo";
};

/** Facility with distance from the search origin. */
export type FacilityResult = Facility & { distanceKm: number };

/** What the frontend sends. The API takes the same values as query parameters. */
export type FacilitySearch = {
  lat: number;
  lng: number;
  type?: FacilityType;
  radiusKm?: number;
};

/** A city the person can pick when they do not share their location. */
export type Area = { id: string; label: string; lat: number; lng: number };
