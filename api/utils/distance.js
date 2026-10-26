function radians(degrees) {
    return degrees * Math.PI / 180
}

function distance(latitude1, longitude1, latitude2, longitude2) {
    const EARTH_RADIUS_KM = 6371
    const dlat = radians(latitude2 - latitude1)
    const dlong = radians(longitude2 - longitude1)
    const latPart = Math.sin(dlat/2 )**2
    const mix = Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(dlong/2)**2
    const last = latPart + mix
    const c = 2 * Math.atan2(Math.sqrt(last), Math.sqrt(1 - last))
    const km = EARTH_RADIUS_KM * c
    return Math.round(km * 10)/10
}

module.exports = { distance }