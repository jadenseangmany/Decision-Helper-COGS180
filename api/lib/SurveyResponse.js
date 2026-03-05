const mongoose = require("mongoose");

const surveyResponseSchema = new mongoose.Schema({
    question: { type: String, required: true },
    recommendation: { type: String, required: true },
    decisionTimeMs: { type: Number, required: true },

    // Survey answers
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
    additionalFeedback: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
});

module.exports =
    mongoose.models.SurveyResponse ||
    mongoose.model("SurveyResponse", surveyResponseSchema);
