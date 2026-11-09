const { rateLimit } = require('express-rate-limit')

function makeLimiter(limit) {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        // No digits in this message: the signup form reads a number out of 429 messages as a wait time.
        message: { error: 'too many attempts, please wait a while and try again' },
    })
}

// Each limiter counts per IP address, and every route that shares one shares its count.
const loginLimiter = makeLimiter(5)   // login
const codeLimiter = makeLimiter(10)   // routes that check a 6-digit code
const emailLimiter = makeLimiter(8)   // routes that send an email

module.exports = { loginLimiter, codeLimiter, emailLimiter }
