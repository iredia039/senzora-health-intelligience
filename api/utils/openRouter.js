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

    return reply
}


module.exports = askModel;