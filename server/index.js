require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── POST /api/generate-questions ────────────────────────────────────────────
// Accepts: { question: "Tacos or burritos" }
// Returns: { questions: [{ id, text, lowLabel, highLabel }] }
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "question is required" });

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a decision-helper assistant. The user is trying to decide between two options.
Your job is to generate 4-6 short, fun clarifying questions that will help determine which option suits them better.
Each question should be answerable on a 1–10 scale. Provide low and high labels for the scale ends.

IMPORTANT RULES:
- Each question must focus on exactly ONE concept or trait. NEVER combine multiple traits in a single question (e.g. do NOT say "herbal and spicy" — ask about them separately).
- Questions MUST directly reference the specific options the user is deciding between BY NAME. For example, if deciding between "Pizza" and "Sushi", ask "How much does the freshness of Sushi appeal to you?" not "How much do you value freshness?"
- Make sure questions help distinguish between the two options — avoid questions where both options would score similarly.

Respond with ONLY valid JSON in this exact shape:
{
  "questions": [
    { "id": "q1", "text": "How much do you enjoy crunchy textures?", "lowLabel": "Not at all", "highLabel": "Love it" }
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
    res.json({ questions: parsed.questions });
  } catch (err) {
    console.error("generate-questions error:", err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ─── POST /api/generate-reflections ──────────────────────────────────────────
// Accepts: { question, answers: [{ questionText, value }] }
// Returns: { reflectionQuestions: [{ id, text }] }
app.post("/api/generate-reflections", async (req, res) => {
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

IMPORTANT RULES:
- Questions MUST reference the specific options by name (e.g. "Pizza" and "Sushi", not "Option A" and "Option B").
- Questions must NOT be leading—do not suggest one option is better. Ask questions that let the user discover their own preference.
- Do NOT just restate the choices. Instead, prompt the user to think about trade-offs, consequences, and feelings.
- Focus on things like: what they'd regret missing out on, how each option fits their current mood or situation, or what matters most to them right now.

Keep each question concise (1–2 sentences max).

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
    res.json({ reflectionQuestions: parsed.reflectionQuestions });
  } catch (err) {
    console.error("generate-reflections error:", err);
    res.status(500).json({ error: "Failed to generate reflection questions" });
  }
});

// ─── POST /api/decide ────────────────────────────────────────────────────────
// Accepts: { question, answers: [{ questionText, value }], reflectionAnswers: [{ questionText, answerText }] }
// Returns: { recommendation, reasoning }
app.post("/api/decide", async (req, res) => {
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

In addition to your main recommendation, provide a separate "alternativePerspective". This should be 2-3 sentences of personalized feedback on what choosing the OTHER option (the one you didn't recommend) could lead to. Frame this as "what if we followed it for the plot" (e.g. embracing chaos, taking a risk, or choosing a fun but less logical path).

Respond with ONLY valid JSON in this exact shape:
{
  "recommendation": "The actual option name, not Option A/B",
  "reasoning": "A thorough 4-6 sentence explanation referencing specific slider scores and reflection answers, explaining why this option is the best fit.",
  "alternativeOption": "The exact name of the other, non-recommended option",
  "alternativePerspective": "A 2-3 sentence 'for the plot' perspective on choosing the other option."
}`,
        },
        {
          role: "user",
          content: `I'm deciding between: ${question}\n\nHere are my quantitative answers:\n${answersText}\n\nHere are my reflection answers:\n${reflectionAnswersText}`,
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

// ─── Survey Response Schema ──────────────────────────────────────────────────
const surveyResponseSchema = new mongoose.Schema({
  question: { type: String, required: true },
  recommendation: { type: String, required: true },
  decisionTimeMs: { type: Number, required: true },
  helpfulPart: {
    type: String,
    required: true,
    enum: ["did_not_help", "scale_questions", "reflection_questions", "both"],
  },
  changedThinking: { type: Number, required: true, min: 1, max: 4 },
  affectedSpeed: { type: Number, required: true, min: 1, max: 4 },
  easierToThink: { type: Number, required: true, min: 1, max: 4 },
  moreThoughtful: { type: Number, required: true, min: 1, max: 4 },
  agreeWithDecision: { type: Number, required: true, min: 1, max: 4 },
  confidence: { type: Number, required: true, min: 1, max: 10 },
  dilemmaDifficulty: { type: Number, required: true, min: 1, max: 10 },
  additionalFeedback: { type: String, default: "" },
  sliderAnswers: [{ questionText: String, value: Number }],
  reflectionAnswers: [{ questionText: String, answerText: String }],
  createdAt: { type: Date, default: Date.now },
});

const SurveyResponse =
  mongoose.models.SurveyResponse ||
  mongoose.model("SurveyResponse", surveyResponseSchema);

// ─── POST /api/submit-survey ─────────────────────────────────────────────────
app.post("/api/submit-survey", async (req, res) => {
  try {
    const {
      question,
      recommendation,
      decisionTimeMs,
      helpfulPart,
      changedThinking,
      affectedSpeed,
      easierToThink,
      moreThoughtful,
      agreeWithDecision,
      confidence,
      dilemmaDifficulty,
      additionalFeedback,
      sliderAnswers,
      reflectionAnswers,
    } = req.body;

    if (!question || !recommendation || decisionTimeMs == null || !helpfulPart) {
      return res.status(400).json({ error: "Missing required survey fields" });
    }

    const response = await SurveyResponse.create({
      question,
      recommendation,
      decisionTimeMs,
      helpfulPart,
      changedThinking,
      affectedSpeed,
      easierToThink,
      moreThoughtful,
      agreeWithDecision,
      confidence,
      dilemmaDifficulty,
      additionalFeedback: additionalFeedback || "",
      sliderAnswers: sliderAnswers || [],
      reflectionAnswers: reflectionAnswers || [],
    });

    res.json({ success: true, id: response._id });
  } catch (err) {
    console.error("submit-survey error:", err);
    res.status(500).json({ error: "Failed to save survey response" });
  }
});

// ─── Connect to MongoDB and start server ─────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));
} else {
  console.warn("MONGODB_URI not set — survey submissions will fail");
}

app.listen(PORT, () => {
  console.log(`Decision Helper server running on http://localhost:${PORT}`);
});
