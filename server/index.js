require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── POST /api/generate-questions ────────────────────────────────────────────
// Accepts: { question: "Tacos or burritos" }
// Returns: [{ id, text, lowLabel, highLabel }]
app.post("/api/generate-questions", async (req, res) => {
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
    res.json(parsed.questions);
  } catch (err) {
    console.error("generate-questions error:", err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ─── POST /api/decide ────────────────────────────────────────────────────────
// Accepts: { question, answers: [{ questionText, value }] }
// Returns: { recommendation, reasoning }
app.post("/api/decide", async (req, res) => {
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
    res.json(parsed);
  } catch (err) {
    console.error("decide error:", err);
    res.status(500).json({ error: "Failed to decide" });
  }
});

app.listen(PORT, () => {
  console.log(`Decision Helper server running on http://localhost:${PORT}`);
});
