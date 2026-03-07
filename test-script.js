const mongoose = require("mongoose");
const SurveyResponse = require("./api/lib/SurveyResponse");
require("dotenv").config({ path: "./server/.env" });

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
