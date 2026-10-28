export type FacilityType = "hospital" | "clinic";

/** One place Senzora can show. Keep these fields in step with the facilities entry in CONTRACT.md. */
export type Facility = {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  /** The neighbourhood, shown next to the city. */
  area: string;
  lat: number;
  lng: number;
  /** Has an emergency department. */
  emergency: boolean;
  open24h: boolean;
  /** "demo" while the places are made up. Real data from the API will use another value. */
  source: "demo";
};

/** A facility plus how far it is from the person searching. */
export type FacilityResult = Facility & { distanceKm: number };

/** What the frontend sends. The API will take the same values as query parameters. */
export type FacilitySearch = {
  lat: number;
  lng: number;
  type?: FacilityType;
  radiusKm?: number;
};

/** A city the person can pick when they do not share their location. */
export type Area = { id: string; label: string; lat: number; lng: number };
