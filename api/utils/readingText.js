function describeReadings(readings) {
    if (readings === undefined || readings.length === 0) {
        return "No readings were provided."
    }

    const lines = []

    for (const reading of readings) {
        if (reading.type === "blood_pressure") {
            lines.push(`${reading.measuredAt}: blood pressure ${reading.systolic}/${reading.diastolic} mmHg`)
        }
    }

    return lines.join("\n")
}

module.exports = describeReadings