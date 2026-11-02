// utils/overpass.js

// const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

async function fetchNearbyFacilities(lat, lng, radiusKm) {
  // 1. radiusKm -> metres
    const metre = radiusKm * 1000
    const overpass = ['https://overpass-api.de/api/interpreter',
'https://overpass.kumi.systems/api/interpreter',
'https://overpass.private.coffee/api/interpreter']

  // 2. the query text, with lat, lng and the metres put in using ${...}
  //    (keep out center, but change the limit from 20 to 50)
    const query = `[out:json][timeout:25];nwr["amenity"~"hospital|clinic"](around:${metre},${lat},${lng});out center 50;`;
    let lastError;

  // 3. POST it like your test did, plus a 20 second cancel

    for (const url of overpass) {
        try {
                const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "senzora-dev/0.1"
        },
        body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(45000),
    });

  // 4. if the response is not ok, throw an Error that includes response.status
    if (!response.ok) {
    throw new Error(`Overpass failed ${response.status}`);
        
    }

  // 5. read the JSON and return only the elements list
  const data = await response.json()
  return data.elements
        } catch (error) {
            lastError = error
            console.warn(`warning ${url} ${error.message}`)
        }
        
    }
    throw lastError
}

function toFacility(element) {
    const tags = element.tags || {}
    const lat = element.lat ?? element.center?.lat
    const lng = element.lon ?? element.center?.lon

    if (!tags.name || lat == null || lng == null) {
        return null
    }
    return {
        id: 'osm' + '-' + element.type + '-' + element.id,
        name: tags.name,
        type: tags.amenity,
        lat,
        lng,
        area: tags['addr:suburb'] || tags['addr:city'] || '',
        emergency: tags.emergency === 'yes',
        open24h: tags.opening_hours === '24/7'
    }
}

module.exports = { fetchNearbyFacilities, toFacility };