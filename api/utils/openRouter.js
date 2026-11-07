require("dotenv").config();

async function askModel(messages) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const apiModel = process.env.OPENROUTER_MODEL;

    if (!apiKey || !apiModel) {
        throw new Error("openRouter is not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: apiModel, messages })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply || reply.trim() === "") {
        throw new Error("openRouter returned an empty reply");
    }

    return reply;
}

async function makeTitle(message) {
    const fallback = message.slice(0, 40);

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const apiModel = process.env.OPENROUTER_MODEL;

        if (!apiKey || !apiModel) {
            console.log("title failed, openRouter is not configured");
            return fallback;
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiModel,
                max_tokens: 300,
                messages: [
                    {
                        role: "system",
                        content: "Write a title of 2 to 5 words naming the topic of the user's message. Reply with the title only: no quotes, no full stop, no diagnosis."
                    },
                    { role: "user", content: message }
                ]
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.log("title failed, status", response.status);
            return fallback;
        }

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content;

        if (!raw || raw.trim() === "") {
            console.log("title failed, empty content", JSON.stringify(data.choices?.[0]?.message));
            return fallback;
        }

        const title = raw.trim().replace(/^["']+|["'.]+$/g, "").slice(0, 50);

        console.log("title made:", title);

        return title === "" ? fallback : title;
    } catch (error) {
        console.log("title failed, error", error.message, error.cause && error.cause.code);
        return fallback;
    }
}

module.exports = askModel;
module.exports.makeTitle = makeTitle;