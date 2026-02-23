const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: "question is required" });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.8,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a decision-helper assistant. The user is trying to decide between two options.
Your job is to generate 4-6 short, fun clarifying questions that will help determine which option suits them better.
Each question should be answerable on a 1–10 scale. Provide low and high labels for the scale ends.

Respond with ONLY valid JSON in this exact shape:
{
  "questions": [
    { "id": "q1", "text": "How much do you enjoy crunchy textures?", "lowLabel": "Not at all", "highLabel": "Love it" },
    ...
  ]
}`,
                },
                {
                    role: "user",
                    content: `Help me decide: ${question}`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        res.status(200).json(parsed.questions);
    } catch (err) {
        console.error("generate-questions error:", err);
        res.status(500).json({ error: "Failed to generate questions" });
    }
};
