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
        const { question, answers, reflectionAnswers } = req.body;
        if (!question || !answers)
            return res.status(400).json({ error: "question and answers are required" });

        const answersText = answers
            .map((a) => `• "${a.questionText}" → ${a.value}/10`)
            .join("\n");

        const reflectionAnswersText = reflectionAnswers && reflectionAnswers.length > 0
            ? reflectionAnswers.map((a) => `• "${a.questionText}" → ${a.answerText}`).join("\n")
            : "No reflection answers provided.";

        const completion = await openai.chat.completions.create({
            model: "gpt-5.4",
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are a decision-helper assistant. The user was deciding between two options and answered several clarifying questions on a 1–10 scale, as well as a couple of open-ended reflection questions.
Using your own knowledge about the two options AND the user's answers, determine which option is the best fit.

IMPORTANT: In your recommendation, use the ACTUAL NAME of the option (e.g. "Pizza", "Stay home", "Not killing the patient"), NOT generic labels like "Option A" or "Option B".

Your reasoning MUST be thorough and persuasive. Write 4-6 sentences that:
1. Reference SPECIFIC slider scores (e.g. "You rated X an 8/10, which suggests...") — cover at least 2-3 of the slider answers.
2. Connect the user's reflection answers to the recommendation.
3. Explain how the recommended option aligns with their stated priorities and values.
4. Help the user feel confident that this is the right choice.

Respond with ONLY valid JSON in this exact shape:
{
  "recommendation": "The actual option name, not Option A/B",
  "reasoning": "A thorough 4-6 sentence explanation referencing specific slider scores and reflection answers, explaining why this option is the best fit."
}`,
                },
                {
                    role: "user",
                    content: `I'm deciding between: ${question}\n\nHere are my quantitative answers:\n${answersText}\n\nHere are my reflection answers:\n${reflectionAnswersText}`,
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
