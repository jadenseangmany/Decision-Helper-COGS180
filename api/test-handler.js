const handler = require("./submit-survey");
require("dotenv").config({ path: "../server/.env" });

const req = {
    method: "POST",
    body: {
        question: "Tacos vs Burritos",
        recommendation: "Tacos",
        decisionTimeMs: 1000,
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
        reflectionAnswers: [{ questionText: "What?", answerText: "Nothing" }]
    }
};

const res = {
    statusCode: 200,
    headers: {},
    setHeader(key, val) { this.headers[key] = val; },
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log("Response:", this.statusCode, data); },
    end() { console.log("End"); }
};

handler(req, res).catch(console.error);
