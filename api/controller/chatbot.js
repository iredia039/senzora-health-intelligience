const askModel = require('../utils/openRouter')
const systemPrompt = require('../utils/systemPrompt')
const checkEmergency = require('../utils/emergencyChecks')
const { makeTitle } = require("../utils/openRouter");
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
            } else if (r.type === "blood_oxygen") {
                if (typeof r.spo2 !== "number" || !Number.isFinite(r.spo2) || r.spo2 < 50 || r.spo2 > 100) {
                    return res.status(400).json({ error: 'blood oxygen reading needs spo2 from 50 to 100' })
                }
            } else if (r.type === "body_temperature") {
                if (typeof r.celsius !== "number" || !Number.isFinite(r.celsius) || r.celsius < 30 || r.celsius > 45) {
                    return res.status(400).json({ error: 'temperature reading needs celsius from 30 to 45' })
                }
            } else {
                return res.status(400).json({ error: 'reading type must be heart_rate, blood_pressure, blood_oxygen or body_temperature' })
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

    // The emergency check only needs the message and readings, so it runs first.
    // That lets an emergency chat get a plain title without sending the message to the AI provider.
    const emergency = checkEmergency(message, readings)

    let conversation = null
    let isNewChat = false

    if (conversationId !== undefined) {
        conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        })

        if (conversation === null || conversation.userId !== userId) {
            return res.status(404).json({ error: 'conversation not found' })
        }
    } else {
        isNewChat = true

        // Temporary title: it is replaced by a short topic once the reply is ready.
        conversation = await prisma.conversation.create({
            data: {
                userId: userId,
                title: emergency ? "Urgent message" : message.slice(0, 40)
            }
        })
    }

    if (emergency) {
        try {
            await prisma.message.create({
                data: { role: "user", content: message, conversationId: conversation.id }
            })

            await prisma.message.create({
                data: { role: "assistant", content: emergency.reply, conversationId: conversation.id }
            })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: 'something went wrong, please try again' })
        }

        return res.status(200).json({
            reply: emergency.reply,
            conversationId: conversation.id,
            title: conversation.title,
            emergency: true
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
            if (r.type === "blood_oxygen") {
                return `${r.measuredAt}: blood oxygen ${r.spo2}%`
            }
            if (r.type === "body_temperature") {
                return `${r.measuredAt}: body temperature ${r.celsius} °C`
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

    // For a new chat, the title is made at the same time as the reply, so it adds no waiting.
    // makeTitle never throws: when it fails it returns the first 40 characters.

    let reply

    try {
        reply = await askModel(messages)
    } catch (error) {
        console.error(error)
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
        console.error(error)
        return res.status(500).json({ error: 'something went wrong, please try again' })
    }

    if (isNewChat) {
        const chatId = conversation.id

        // The reply is sent now. The title is asked for after it, then saved when ready.
        makeTitle(message)
            .then((title) => prisma.conversation.update({
                where: { id: chatId },
                data: { title: title }
            }))
            .catch((error) => console.error(error))
    }

    return res.status(200).json({
        reply: reply,
        conversationId: conversation.id,
        title: conversation.title
    })
}

module.exports = chatbot
