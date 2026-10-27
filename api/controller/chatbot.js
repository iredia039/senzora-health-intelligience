const askModel = require('../utils/openRouter')
const systemPrompt = require('../utils/systemPrompt')

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function chatbot(req, res) {
    const message = req.body.message

    if (typeof message !== "string") {
        return res.status(400).json({ error: 'message must be a string' })
    }

    if (message.trim() === "") {
        return res.status(400).json({ error: 'please fill in the message box' })
    }

    if (message.length > 500) {
        return res.status(400).json({ error: 'message is too long' })
    }

const readings = req.body.readings

if (readings !== undefined) {
    if (!Array.isArray(readings) || readings.length > 20) {
        return res.status(400).json({ error: 'readings must be a list of up to 20 readings' })
    }
}


}

module.exports = chatbot