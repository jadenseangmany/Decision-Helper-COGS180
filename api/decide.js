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
        const { question, answers } = req.body;
        if (!question || !answers)
            return res.status(400).json({ error: "question and answers are required" });

        const answersText = answers
            .map((a) => `• "${a.questionText}" → ${a.value}/10`)
            .join("\n");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a decision-helper assistant. The user was deciding between two options and answered several clarifying questions on a 1–10 scale.
Using your own knowledge about the two options AND the user's answers, determine which option is the best fit.

Respond with ONLY valid JSON in this exact shape:
{
  "recommendation": "Option A",
  "reasoning": "A 2-4 sentence explanation of why this option fits best, referencing the user's specific answers and how they relate to each option."
}`,
                },
                {
                    role: "user",
                    content: `I'm deciding between: ${question}\n\nHere are my answers:\n${answersText}`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        res.status(200).json(parsed);
    } catch (err) {
        console.error("decide error:", err);
        res.status(500).json({ error: "Failed to decide" });
    }
};
