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
            model: "gpt-5.4",
            temperature: 0.8,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a decision-helper assistant. The user is deciding between two options and has already answered several quantitative questions on a 1–10 scale.

Your job is to generate exactly 2 short, thoughtful, open-ended reflection questions that will help the user think more deeply about their decision before receiving a recommendation.

Draw inspiration from these kinds of intents (but do NOT use all of them—pick the 2 most relevant given the user's dilemma and their answers so far):
- Why is this decision important to you?
- What factors or priorities matter most for this decision?
- What are the possible outcomes of each option?
- Which option aligns best with your priorities and values?
- After thinking through your options, which one are you leaning toward, and why?
- Reflect on your decision-making process—what feels right?

The goal is to help the user gain clarity and confidence, not to overwhelm them. Keep each question concise (1–2 sentences max).

Respond with ONLY valid JSON in this exact shape:
{
  "reflectionQuestions": [
    { "id": "r1", "text": "..." },
    { "id": "r2", "text": "..." }
  ]
}`,
                },
                {
                    role: "user",
                    content: `I'm deciding between: ${question}\n\nHere are my answers so far:\n${answersText}`,
                },
            ],
        });

        const parsed = JSON.parse(completion.choices[0].message.content);
        res.status(200).json({ reflectionQuestions: parsed.reflectionQuestions });
    } catch (err) {
        console.error("generate-reflections error:", err);
        res.status(500).json({ error: "Failed to generate reflection questions" });
    }
};
