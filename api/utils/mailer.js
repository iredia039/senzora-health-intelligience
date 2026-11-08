function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * Sends an email through Brevo's HTTPS API (SMTP is blocked on Render's free plan).
 * With no BREVO_API_KEY outside production, the message is printed in the terminal instead.
 */
async function sendMail({ to, name, subject, html, text, devLog }) {
    const apiKey = process.env.BREVO_API_KEY

    if (!apiKey) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('BREVO_API_KEY is not set')
        }
        console.log(devLog)
        return
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
            accept: 'application/json'
        },
        body: JSON.stringify({
            sender: {
                name: process.env.MAIL_FROM_NAME || 'Senzora',
                email: process.env.MAIL_FROM_EMAIL
            },
            to: [{ email: to, name }],
            subject,
            htmlContent: html,
            textContent: text
        })
    })

    if (!response.ok) {
        const detail = await response.text()
        throw new Error(`Brevo responded ${response.status}: ${detail}`)
    }
}

function codeEmailHtml(title, intro, code, footer) {
    return `
        <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">${title}</h2>
            <p>${intro}</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:20px 0">${code}</p>
            <p style="color:#555">${footer}</p>
        </div>`
}

async function sendVerificationEmail(to, name, code) {
    await sendMail({
        to,
        name,
        subject: `${code} is your Senzora verification code`,
        html: codeEmailHtml(
            'Verify your email',
            `Hi ${escapeHtml(name)}, use this code to finish creating your Senzora account:`,
            code,
            'It expires in 10 minutes. If you did not sign up, ignore this email.'
        ),
        text: `Your Senzora verification code is ${code}. It expires in 10 minutes.`,
        devLog: `[dev] verification code for ${to}: ${code}`
    })
}

async function sendPasswordChangeEmail(to, name, code) {
    await sendMail({
        to,
        name,
        subject: `${code} is your Senzora password change code`,
        html: codeEmailHtml(
            'Confirm your password change',
            `Hi ${escapeHtml(name)}, use this code to confirm the new password for your Senzora account:`,
            code,
            'It expires in 10 minutes. If you did not ask for this, ignore this email and consider changing your password.'
        ),
        text: `Your Senzora password change code is ${code}. It expires in 10 minutes.`,
        devLog: `[dev] password change code for ${to}: ${code}`
    })
}

module.exports = { sendVerificationEmail, sendPasswordChangeEmail }