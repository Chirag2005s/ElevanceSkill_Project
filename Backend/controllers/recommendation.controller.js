const recommendationService = require("../services/recommendation.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 6 Endpoint: Get personalized restaurant recommendations for logged-in or guest user
 * @route   GET /api/restaurants/recommendations
 * @access  Public (Optional Auth)
 */
const getRecommendations = asyncHandler(async (req, res) => {
    const userId = req.user?._id || null;
    const limit = Number(req.query.limit || 8);

    const data = await recommendationService.getRecommendationsForUser(userId, limit);
    return sendSuccess(res, 200, "Personalized restaurant recommendations fetched", data);
});

/**
 * TASK 6 Endpoint: Get personalized restaurant recommendations for a specific userId
 * @route   GET /api/restaurants/recommendations/:userId
 * @access  Public / Private
 */
const getRecommendationsForUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 8);

    const data = await recommendationService.getRecommendationsForUser(userId, limit);
    return sendSuccess(res, 200, "User restaurant recommendations fetched", data);
});

/**
 * TASK 6 Admin Endpoint: Get recommendation engine analytics
 * @route   GET /api/admin/recommendations/analytics
 * @access  Private (admin)
 */
const getRecommendationAnalytics = asyncHandler(async (req, res) => {
    const analytics = await recommendationService.getRecommendationAnalytics();
    return sendSuccess(res, 200, "Recommendation analytics fetched", analytics);
});

module.exports = {
    getRecommendations,
    getRecommendationsForUserId,
    getRecommendationAnalytics,
};

