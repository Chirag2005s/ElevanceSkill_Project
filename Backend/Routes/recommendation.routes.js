const express = require("express");
const router = express.Router();
const {
    getRecommendations,
    getRecommendationsForUserId,
    getRecommendationAnalytics,
} = require("../controllers/recommendation.controller");
const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.get("/", optionalAuth, getRecommendations);
router.get("/analytics", protect, authorizeRoles("admin"), getRecommendationAnalytics);
router.get("/:userId", optionalAuth, getRecommendationsForUserId);

module.exports = router;

