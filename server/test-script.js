const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

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

const SurveyResponse = mongoose.models.SurveyResponse || mongoose.model("SurveyResponse", surveyResponseSchema);

async function testSubmit() {
  console.log("Connecting to", process.env.MONGODB_URI);
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const response = await SurveyResponse.create({
      question: "Tacos vs Burritos",
      recommendation: "Tacos",
      decisionTimeMs: 12345,
      helpfulPart: "scale_questions",
      changedThinking: 2,
      affectedSpeed: 2,
      easierToThink: 2,
      moreThoughtful: 2,
      agreeWithDecision: 2,
      confidence: 5,
      dilemmaDifficulty: 5,
      additionalFeedback: "test",
      sliderAnswers: [{ questionText: "Crunchy?", value: 8 }],
      reflectionAnswers: [{ questionText: "What if you regret?", answerText: "I wont" }],
    });
    console.log("Success! ID:", response._id);
  } catch (err) {
    console.error("Validation Error:", err);
  } finally {
    mongoose.disconnect();
  }
}

testSubmit();
