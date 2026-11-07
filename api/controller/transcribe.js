function extensionFor(contentType) {
    if (contentType.includes('ogg')) {
        return 'ogg'
    }

    if (contentType.includes('mp4') || contentType.includes('m4a')) {
        return 'mp4'
    }

    if (contentType.includes('wav')) {
        return 'wav'
    }

    return 'webm'
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function transcribe(req, res) {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
        return res.status(503).json({ error: 'voice transcription is not configured' })
    }

    const audio = req.body

    if (!Buffer.isBuffer(audio) || audio.length === 0) {
        return res.status(400).json({ error: 'send a recording as the request body' })
    }

    const contentType = String(req.headers['content-type'] || 'audio/webm')
    const baseType = contentType.split(';')[0]

    const form = new FormData()
    form.append('file', new Blob([audio], { type: baseType }), `voice.${extensionFor(contentType)}`)
    form.append('model', 'whisper-large-v3-turbo')
    form.append('response_format', 'json')
    form.append('temperature', '0')

    // A two-letter language hint (like "en") makes short clips less likely to be misread.
    const language = req.query.lang

    if (typeof language === 'string' && /^[a-z]{2}$/.test(language)) {
        form.append('language', language)
    }

    let response

    try {
        response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: AbortSignal.timeout(30000)
        })
    } catch (error) {
        console.error('transcribe failed:', error.message, error.cause && error.cause.code)
        return res.status(503).json({ error: 'transcription unavailable, please try again' })
    }

    if (response.status === 429) {
        console.error('transcribe rate limited')
        return res.status(429).json({ error: 'too many voice requests, wait a moment and try again' })
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => '')
        console.error('transcribe failed, status', response.status, detail.slice(0, 200))
        return res.status(503).json({ error: 'transcription unavailable, please try again' })
    }

    let data

    try {
        data = await response.json()
    } catch (error) {
        console.error('transcribe returned unreadable data')
        return res.status(503).json({ error: 'transcription unavailable, please try again' })
    }

    const text = typeof data.text === 'string' ? data.text.trim() : ''

    return res.status(200).json({ text: text })
}

module.exports = transcribe
