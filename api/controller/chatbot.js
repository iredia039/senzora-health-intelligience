const askModel = require('../utils/openRouter')
const systemPrompt = require('../utils/systemPrompt')
const { prisma } = require('../prisma')


/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
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

        for (const r of readings) {
            if (typeof r !== "object" || r === null) {
                return res.status(400).json({ error: 'each reading must be an object' })
            }

            if (typeof r.measuredAt !== "string" || Number.isNaN(Date.parse(r.measuredAt))) {
                return res.status(400).json({ error: 'each reading needs a valid measuredAt date' })
            }

            if (r.type === "heart_rate") {
                if (typeof r.bpm !== "number" || !Number.isFinite(r.bpm)) {
                    return res.status(400).json({ error: 'heart rate reading needs a numeric bpm' })
                }
            } else if (r.type === "blood_pressure") {
                if (
                    typeof r.systolic !== "number" || !Number.isFinite(r.systolic) ||
                    typeof r.diastolic !== "number" || !Number.isFinite(r.diastolic)
                ) {
                    return res.status(400).json({ error: 'blood pressure reading needs numeric systolic and diastolic' })
                }
            } else {
                return res.status(400).json({ error: 'reading type must be heart_rate or blood_pressure' })
            }
        }
    }

const conversationId = req.body.conversationId

if (conversationId !== undefined) {
    if (typeof conversationId !== "number" || !Number.isInteger(conversationId) || conversationId < 1) {
        return res.status(400).json({ error: 'conversationId must be a positive whole number' })
    }
}

const userId = req.user.id

let conversation = null

if (conversationId !== undefined) {
    conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
    })

    if (conversation === null || conversation.userId !== userId) {
        return res.status(404).json({ error: 'conversation not found' })
    }
} else {
    conversation = await prisma.conversation.create({
        data: {
            userId: userId,
            title: message.slice(0, 40)
        }
    })
}

const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 10
})

history.reverse()


let userContent = message

if (readings !== undefined && readings.length > 0) {
    const lines = readings.map((r) => {
        if (r.type === "heart_rate") {
            return `${r.measuredAt}: heart rate ${r.bpm} bpm`
        }
        return `${r.measuredAt}: blood pressure ${r.systolic}/${r.diastolic} mmHg`
    })
    userContent = `${message}\n\nMy recent readings:\n${lines.join("\n")}`
}

const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userContent }
]

let reply

try {
    reply = await askModel(messages)
} catch (error) {
    console.log(error);

    return res.status(503).json({ error: 'assistant unavailable, please try again' })
    
}

try {
    await prisma.message.create({
        data: { role: "user", content: message, conversationId: conversation.id }
    })

    await prisma.message.create({
        data: { role: "assistant", content: reply, conversationId: conversation.id }
    })
} catch (error) {
    return res.status(500).json({ error: 'something went wrong, please try again' })
}

return res.status(200).json({
    reply: reply,
    conversationId: conversation.id,
    title: conversation.title
})
}

module.exports = chatbot