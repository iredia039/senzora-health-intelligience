const crypto = require('crypto')

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_SECONDS = 60
const MAX_ATTEMPTS = 5

/** A random 6-digit code, always 6 characters long. */
function generateCode() {
    return String(crypto.randomInt(100000, 1000000))
}

/** Only this hash is stored, never the code itself. */
function hashCode(code) {
    return crypto.createHmac('sha256', process.env.JWT_SECRET).update(code).digest('hex')
}

function codeMatches(code, storedHash) {
    const a = Buffer.from(hashCode(code), 'hex')
    const b = Buffer.from(storedHash, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** The user fields to save whenever a fresh code is issued. */
function newCodeFields(code) {
    return {
        verifyCodeHash: hashCode(code),
        verifyCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        verifyAttempts: 0,
        verifyCodeSentAt: new Date()
    }
}

/** 0 means a new code can be sent now. */
function secondsUntilResend(sentAt) {
    if (!sentAt) return 0
    const elapsed = Math.floor((Date.now() - sentAt.getTime()) / 1000)
    return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed)
}

/** The user fields to save when a password change is waiting for its code. */
function newPasswordCodeFields(code, pendingHash) {
    return {
        pendingHashPassword: pendingHash,
        passwordCodeHash: hashCode(code),
        passwordCodeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        passwordCodeAttempts: 0,
        passwordCodeSentAt: new Date()
    }
}

module.exports = { MAX_ATTEMPTS, generateCode, codeMatches, newCodeFields, secondsUntilResend, newPasswordCodeFields }
