import type { Area, Facility } from "./types";

/** Made-up places, always labelled as demo data. Coordinates are approximate and the addresses are not real. */
const demo = (f: Omit<Facility, "source">): Facility => ({ ...f, source: "demo" });

export const AREAS: Area[] = [
  { id: "abuja", label: "Abuja", lat: 9.0765, lng: 7.3986 },
  { id: "jos", label: "Jos", lat: 9.8965, lng: 8.8583 },
  { id: "lagos", label: "Lagos", lat: 6.5244, lng: 3.3792 },
];

export const MOCK_FACILITIES: Facility[] = [
  demo({ id: "abj-1", name: "Hotaru General Hospital", type: "hospital", address: "Demo address, Garki, Abuja", area: "Garki", lat: 9.0359, lng: 7.4395, emergency: true, open24h: true }),
  demo({ id: "abj-2", name: "Kazehaya Family Clinic", type: "clinic", address: "Demo address, Wuse 2, Abuja", area: "Wuse 2", lat: 9.0765, lng: 7.4639, emergency: false, open24h: false }),
  demo({ id: "abj-3", name: "Sohma Memorial Hospital", type: "hospital", address: "Demo address, Maitama, Abuja", area: "Maitama", lat: 9.0925, lng: 7.4538, emergency: true, open24h: true }),
  demo({ id: "abj-4", name: "Futaba Health Clinic", type: "clinic", address: "Demo address, Gwarinpa, Abuja", area: "Gwarinpa", lat: 9.1122, lng: 7.4015, emergency: false, open24h: false }),
  demo({ id: "abj-5", name: "Otani Medical Centre", type: "hospital", address: "Demo address, Asokoro, Abuja", area: "Asokoro", lat: 9.0514, lng: 7.4749, emergency: true, open24h: false }),

  demo({ id: "jos-1", name: "Takasu Family Clinic", type: "clinic", address: "Demo address, Rayfield, Jos", area: "Rayfield", lat: 9.8884, lng: 8.8741, emergency: false, open24h: false }),
  demo({ id: "jos-2", name: "Mei Care Hospital", type: "hospital", address: "Demo address, Jos North", area: "Jos North", lat: 9.9283, lng: 8.8921, emergency: true, open24h: true }),
  demo({ id: "jos-3", name: "Hori Wellness Clinic", type: "clinic", address: "Demo address, Bukuru, Jos", area: "Bukuru", lat: 9.7926, lng: 8.8573, emergency: false, open24h: false }),

  demo({ id: "los-1", name: "Kamisama General Hospital", type: "hospital", address: "Demo address, Ikeja, Lagos", area: "Ikeja", lat: 6.6018, lng: 3.3515, emergency: true, open24h: true }),
  demo({ id: "los-2", name: "Hachi Community Clinic", type: "clinic", address: "Demo address, Yaba, Lagos", area: "Yaba", lat: 6.5095, lng: 3.3711, emergency: false, open24h: false }),
  demo({ id: "los-3", name: "Mikage Medical Centre", type: "hospital", address: "Demo address, Victoria Island, Lagos", area: "Victoria Island", lat: 6.4281, lng: 3.4219, emergency: true, open24h: false }),
];
