require('net').setDefaultAutoSelectFamily(false)

const { setGlobalDispatcher, Agent } = require('undici')
setGlobalDispatcher(new Agent({ connect: { timeout: 30000 } }))

const query = `[out:json][timeout:25];nwr["amenity"~"hospital|clinic"](around:10000,9.0765,7.3986);out center 20;`
console.log(query);

async function test() {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "senzora-dev/0.1"
        },
        body: "data=" + encodeURIComponent(query)
    })

    const data = await response.json()
    console.log(data.elements.length)
    console.log(data.elements[0])
    console.log(data.elements[0].tags)
    console.log(response.status);
}

// test()
const { fetchNearbyFacilities, toFacility } = require("./utils/overpass");

console.log(toFacility({ type: "node", id: 1, lat: 9.06, lon: 7.42, tags: { amenity: "clinic", name: "Kobe Clinic", "addr:housenumber": "12", "addr:street": "Aminu Kano Crescent", "addr:city": "Abuja" } }).address);
console.log(toFacility({ type: "node", id: 2, lat: 9.06, lon: 7.42, tags: { amenity: "clinic", name: "Mabushi Clinic" } }).address);