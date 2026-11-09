const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { prisma } = require('../prisma')
// const bcrypt = require('bcrypt')
const data = require('../data/facilities')
const { checkPassword } = require('../utils/checkPassword')
const { MAX_ATTEMPTS, generateCode, codeMatches, newCodeFields, newPasswordCodeFields, secondsUntilResend } = require('../utils/verification')
const { sendVerificationEmail, sendPasswordChangeEmail, sendPasswordResetEmail } = require('../utils/mailer')
const { normalizeEmail } = require('../utils/normalizeEmail')

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

async function register(req, res) {
    try {
        const data = {
            name: req.body.name,
            email: normalizeEmail(req.body.email),
            password: req.body.password,
            phone: req.body.phone
        }

        if (!data.name || !data.email || !data.password) {
            return res.status(400).json({ error: 'missing fields' })
        }

const passwordError = checkPassword(data.password)
if (passwordError) {
    return res.status(400).json({ error: passwordError })
}

        const existing = await prisma.user.findUnique({ where: { email: data.email } })

        if (existing && existing.emailVerified) {
            return res.status(409).json({ error: 'email already exist, please use another one' })
        }

        if (existing) {
            const wait = secondsUntilResend(existing.verifyCodeSentAt)
            if (wait > 0) {
                return res.status(429).json({ error: `please wait ${wait} seconds before trying again` })
            }
        }

        const hashed = await bcrypt.hash(data.password, 10)
        const code = generateCode()

        const fields = {
            name: data.name,
            email: data.email,
            hashPassword: hashed,
            phone: data.phone,
            emailVerified: false,
            ...newCodeFields(code)
        }

        // An unverified account is an abandoned signup, so the person starts over with the new details.
        const user = existing
            ? await prisma.user.update({ where: { id: existing.id }, data: fields })
            : await prisma.user.create({ data: fields })

        try {
            await sendVerificationEmail(user.email, user.name, code)
        } catch (error) {
            console.error('verification email error:', error)
            return res.status(502).json({ error: 'we could not send the verification email, please try again' })
        }

        res.status(201).json({ name: user.name, email: user.email, needsVerification: true })
    } catch (error) {
        console.error("register error:", error);
        return res.status(500).json({ error: "something went wrong, please try again" });
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function verifyEmail(req, res) {
    try {
        const email = normalizeEmail(req.body.email)
        const code = req.body.code

        if (typeof email !== 'string' || typeof code !== 'string' || !email || !code.trim()) {
            return res.status(400).json({ error: 'missing fields' })
        }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            return res.status(400).json({ error: 'wrong code' })
        }

        if (user.emailVerified) {
            return res.status(200).json({ message: 'email already verified' })
        }

        if (!user.verifyCodeHash || !user.verifyCodeExpiresAt || user.verifyCodeExpiresAt < new Date()) {
            return res.status(400).json({ error: 'code expired, please request a new one' })
        }

        if (user.verifyAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({ error: 'too many wrong attempts, please request a new code' })
        }

        if (!codeMatches(code.trim(), user.verifyCodeHash)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { verifyAttempts: { increment: 1 } }
            })
            return res.status(400).json({ error: 'wrong code' })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verifyCodeHash: null,
                verifyCodeExpiresAt: null,
                verifyAttempts: 0,
                verifyCodeSentAt: null
            }
        })

        res.status(200).json({ message: 'email verified' })
    } catch (error) {
        console.error('verifyEmail error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function resendCode(req, res) {
    try {
        const email = normalizeEmail(req.body.email)

        if (typeof email !== 'string' || !email) {
            return res.status(400).json({ error: 'missing fields' })
        }

        const reply = { message: 'if this email needs verification, a new code has been sent' }
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user || user.emailVerified) {
            return res.status(200).json(reply)
        }

        const wait = secondsUntilResend(user.verifyCodeSentAt)
        if (wait > 0) {
            return res.status(429).json({ error: `please wait ${wait} seconds before asking for another code` })
        }

        const code = generateCode()

        await prisma.user.update({
            where: { id: user.id },
            data: newCodeFields(code)
        })

        try {
            await sendVerificationEmail(user.email, user.name, code)
        } catch (error) {
            console.error('verification email error:', error)
            return res.status(502).json({ error: 'we could not send the verification email, please try again' })
        }

        res.status(200).json(reply)
    } catch (error) {
        console.error('resendCode error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}

async function login(req, res) {
    try {
            const data = {
        email: normalizeEmail(req.body.email),
        password:req.body.password
    }

    if (!data.email || !data.password) {
        return res.status(400).json({ error: 'please fill the fields'})
    }

    const mail = await prisma.user.findUnique({ where:{
        email: data.email
    }})

    if (!mail) {
        return res.status(401).json({ error: 'invalid credentials'})
    }

    const compared = await bcrypt.compare(data.password, mail.hashPassword)

    if (!compared) {
        return res.status(401).json({ error: 'invalid credentials'})
    }

    if (!mail.emailVerified) {
        return res.status(403).json({ error: 'please verify your email first', code: 'EMAIL_NOT_VERIFIED' })
    }

    const tokenly = jwt.sign({id:mail.id}, process.env.JWT_SECRET, {expiresIn: '1d'})
    

    res.status(200).json({token:tokenly, user:{id:mail.id, name:mail.name}})
    } catch (error) {
        return res.status(500).json({error: 'something went wrong'})
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function me(req, res) {
    try {
        const userId = req.user.id

        const data = await prisma.user.findUnique({
            where:{
                id: userId
            },
            select:{
                id: true,
                name: true,
                email: true
            }
        })

        res.status(200).json(data)
    } catch (error) {
        return res.status(500).json({ error: 'something went wrong, please try again'})
    }
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

async function edit(req, res) {
    try {
            const name = req.body.name

    if (typeof name !== "string") {
        return res.status(400).json({ error: 'name must be 1 to 50 characters long'})
    }

    const trimmed = name.trim()

    if (trimmed === "" || trimmed.length > 50) {
        return res.status(400).json({ error: 'name must be 1 to 50 characters long'})
    }

    const id = req.user.id

const data = await prisma.user.update({
    where:{
        id: id,
    },
    data:{
        name: trimmed
    },
    select:{
        id: true,
        name: true,
        email: true
    }
})

    res.status(200).json(data)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'something went wrong'})
    }
}


/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requestPasswordChange(req, res) {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'missing fields' })
        }

        const passwordError = checkPassword(newPassword)
        if (passwordError) {
            return res.status(400).json({ error: passwordError })
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } })
        if (!user) {
            return res.status(404).json({ error: 'user not found' })
        }

        const wait = secondsUntilResend(user.passwordCodeSentAt)
        if (wait > 0) {
            return res.status(429).json({ error: `please wait ${wait} seconds before trying again` })
        }

        const correct = await bcrypt.compare(currentPassword, user.hashPassword)
        if (!correct) {
            return res.status(400).json({ error: 'current password is wrong' })
        }

        const same = await bcrypt.compare(newPassword, user.hashPassword)
        if (same) {
            return res.status(400).json({ error: 'new password must be different from the current one' })
        }

        const hashed = await bcrypt.hash(newPassword, 10)
        const code = generateCode()

        await prisma.user.update({
            where: { id: user.id },
            data: newPasswordCodeFields(code, hashed)
        })

        try {
            await sendPasswordChangeEmail(user.email, user.name, code)
        } catch (error) {
            console.error('password change email error:', error)
            return res.status(502).json({ error: 'we could not send the verification email, please try again' })
        }

        return res.status(200).json({ message: 'verification code sent' })
    } catch (error) {
        console.error('request password change error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}

async function confirmPasswordChange(req, res) {
    try {
        const code = req.body.code

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'missing fields' })
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } })
        if (!user) {
            return res.status(404).json({ error: 'user not found' })
        }

        if (!user.passwordCodeHash || !user.pendingHashPassword) {
            return res.status(400).json({ error: 'no password change is waiting, please start again' })
        }

        if (user.passwordCodeExpiresAt < new Date()) {
            return res.status(400).json({ error: 'code expired, please request a new one' })
        }

        if (user.passwordCodeAttempts >= MAX_ATTEMPTS) {
            return res.status(429).json({ error: 'too many wrong attempts, please request a new code' })
        }

        if (!codeMatches(code, user.passwordCodeHash)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordCodeAttempts: { increment: 1 } }
            })
            return res.status(400).json({ error: 'wrong code' })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashPassword: user.pendingHashPassword,
                pendingHashPassword: null,
                passwordCodeHash: null,
                passwordCodeExpiresAt: null,
                passwordCodeAttempts: 0,
                passwordCodeSentAt: null
            }
        })

        return res.status(200).json({ message: 'password changed' })
    } catch (error) {
        console.error('confirm password change error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}

async function forgotPassword(req, res) {
    try {
        const email = normalizeEmail(req.body.email)

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'missing fields' })
        }

        // The answer is always the same, so nobody can use this form to learn which emails have accounts.
        const reply = { message: 'a code was sent to your email' }

        const user = await prisma.user.findUnique({ where: { email } })

        if (!user || !user.emailVerified || secondsUntilResend(user.passwordCodeSentAt) > 0) {
            return res.status(200).json(reply)
        }

        const code = generateCode()

        // pendingHashPassword stays empty: that is how a reset is told apart from a logged-in password change.
        await prisma.user.update({
            where: { id: user.id },
            data: newPasswordCodeFields(code, null)
        })

        try {
            await sendPasswordResetEmail(user.email, user.name, code)
        } catch (error) {
            console.error('password reset email error:', error)
        }

        return res.status(200).json(reply)
    } catch (error) {
        console.error('forgot password error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}

async function resetPassword(req, res) {
    try {
        const { code, newPassword } = req.body
        const email = normalizeEmail(req.body.email)

        if (!email || !code || !newPassword || typeof email !== 'string' || typeof code !== 'string') {
            return res.status(400).json({ error: 'missing fields' })
        }

        const passwordError = checkPassword(newPassword)
        if (passwordError) {
            return res.status(400).json({ error: passwordError })
        }

        // Every code failure gets this same answer, so it reveals nothing about the account.
        const invalid = { error: 'invalid or expired code, please request a new one' }

        const user = await prisma.user.findUnique({ where: { email } })

        // A waiting logged-in password change (pendingHashPassword set) is never a reset.
        if (!user || !user.passwordCodeHash || user.pendingHashPassword || user.passwordCodeExpiresAt < new Date()) {
            return res.status(400).json(invalid)
        }

        if (user.passwordCodeAttempts >= MAX_ATTEMPTS) {
            return res.status(400).json(invalid)
        }

        if (!codeMatches(code, user.passwordCodeHash)) {
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordCodeAttempts: { increment: 1 } }
            })
            return res.status(400).json(invalid)
        }

        const hashed = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashPassword: hashed,
                pendingHashPassword: null,
                passwordCodeHash: null,
                passwordCodeExpiresAt: null,
                passwordCodeAttempts: 0,
                passwordCodeSentAt: null
            }
        })

        return res.status(200).json({ message: 'password changed' })
    } catch (error) {
        console.error('reset password error:', error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }
}



module.exports = { register, login, me, edit, requestPasswordChange, confirmPasswordChange, verifyEmail, resendCode, forgotPassword, resetPassword }
