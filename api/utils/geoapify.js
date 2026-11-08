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
    return cached.data
  }

  const apiKey = process.env.GEOAPIFY_API_KEY
  if (!apiKey) {
    throw new Error('GEOAPIFY_API_KEY is not set')
  }

  // Geoapify wants longitude first, then latitude
  const params = new URLSearchParams({
    categories: 'healthcare.hospital,healthcare.clinic_or_praxis',
    filter: `circle:${lng},${lat},${radiusKm * 1000}`,
    bias: `proximity:${lng},${lat}`,
    limit: '100',
    apiKey,
  })

  try {
    const response = await fetch(`https://api.geoapify.com/v2/places?${params}`, {
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`Geoapify failed ${response.status}`)
    }

    const data = await response.json()
    const features = data.features || []

    cache.set(key, { data: features, savedAt: Date.now() })
    return features
  } catch (error) {
    // Geoapify failed: use the old saved answer if there is one
    if (cached) {
      return cached.data
    }
    throw error
  }
}

function toFacility(feature) {
  const p = feature.properties || {}

  if (!p.name || p.lat == null || p.lon == null) {
    return null
  }

  const categories = p.categories || []

  return {
    id: 'geo-' + p.place_id,
    name: p.name,
    type: categories.includes('healthcare.hospital') ? 'hospital' : 'clinic',
    lat: p.lat,
    lng: p.lon,
    area: p.suburb || p.district || p.city || '',
    emergency: p.datasource?.raw?.emergency === 'yes',
    open24h: p.opening_hours === '24/7',
    address: p.address_line2 || p.formatted || 'Address not listed',
  }
}

module.exports = { fetchNearbyFacilities, toFacility }