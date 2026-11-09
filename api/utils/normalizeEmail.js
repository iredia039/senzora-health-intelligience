/** Trims spaces and lowercases an email, so Kaori@Gmail.com and kaori@gmail.com are the same account. */
function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : value
}

module.exports = { normalizeEmail }
