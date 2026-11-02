const data = require('../data/facilities')
const { distance } = require('../utils/distance')
const { fetchNearbyFacilities, toFacility } = require("./utils/overpass");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getFacilities(req, res) {
    try {
            const facilities = {
        lat: req.query.lat,
        long:req.query.lng
    }

    const healthcareType = req.query.type
    const radius = req.query.radiusKm ? Number(req.query.radiusKm): 10

    if (!facilities.lat || !facilities.long) {
        return res.status(400).json({ error: 'latitude and longitude are required'})
    }

    const lat = Number(facilities.lat)
    const longs = Number(facilities.long)

    if (Number.isNaN(lat) || Number.isNaN(longs)) {
        return res.status(400).json({ error: 'lat and lng must be valid coordinates'})
    }

    // if (!healthcareType) {
    //     return res.status(400).json({ error: 'type not sent'})
    // }


    if (healthcareType && healthcareType !== 'clinic' && healthcareType !== 'hospital') {
        return res.status(400).json({ error: 'facility must be clinic or hospital'})
    }

    if (radius < 1 || radius > 50 || Number.isNaN(radius)) {
        return res.status(400).json({ error: 'radius must be between 1 to 50'})
    }

    const byType = data.filter((n) => !healthcareType || n.type === healthcareType)

    const withDistance = byType.map((n) => ({
        ...n,
        distanceKm:distance(lat, longs, n.lat, n.lng)
    }))

    const nearby = withDistance.filter((n) => n.distanceKm <= radius)

    const sorted = nearby.sort((a, b) => {
        return a.distanceKm - b.distanceKm
    })


    res.status(200).json(sorted)
    } catch (error) {
        return res.status(500).json({ error: 'something went wrong'})
    }
}

module.exports = getFacilities