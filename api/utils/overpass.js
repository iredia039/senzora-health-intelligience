const cache = new Map()
const CACHE_LIFETIME = 10 * 60 * 1000

function makeKey(lat, lng, radiusKm) {
  const roundedLat = Number(lat).toFixed(2)
  const roundedLng = Number(lng).toFixed(2)
  return `${roundedLat}:${roundedLng}:${radiusKm}`
}

async function fetchNearbyFacilities(lat, lng, radiusKm) {
  const key = makeKey(lat, lng, radiusKm)

  // use the saved answer if it is still fresh
  const cached = cache.get(key)
  if (cached && Date.now() - cached.savedAt < CACHE_LIFETIME) {
    // console.log('cache hit', key)
    return cached.data
  }

  const metre = radiusKm * 1000
  const overpass = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ]

  const query = `[out:json][timeout:25];nwr["amenity"~"hospital|clinic"](around:${metre},${lat},${lng});out center 50;`

  async function askServer(url) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'senzora-dev/0.1',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(45000),
    })

    if (!response.ok) {
      throw new Error(`Overpass failed ${response.status}`)
    }

    const data = await response.json()
    return data.elements
  }

   try {
    const elements = await Promise.any(overpass.map(askServer))

    // save the answer with the time
    cache.set(key, { data: elements, savedAt: Date.now() })
    return elements
  } catch (error) {
    // Overpass failed: use the old saved answer if there is one
    if (cached) {
      return cached.data
    }
    throw error
  }
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
        open24h: tags.opening_hours === '24/7',
        address:[tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(' ') || 'Address not listed'
    }
}

module.exports = { fetchNearbyFacilities, toFacility };