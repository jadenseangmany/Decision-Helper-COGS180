const connectDB = require("./lib/db");
const SurveyResponse = require("./lib/SurveyResponse");

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        await connectDB();

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
            additionalFeedback,
        } = req.body;

        // Basic validation
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
            additionalFeedback: additionalFeedback || "",
        });

        res.status(200).json({ success: true, id: response._id });
    } catch (err) {
        console.error("submit-survey error:", err);
        res.status(500).json({ error: "Failed to save survey response" });
    }
};
