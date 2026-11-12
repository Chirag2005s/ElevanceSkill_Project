const express = require("express");
const router = express.Router();
const {
    searchRestaurants,
    getAllRestaurants,
    getRestaurantById,
    getOwnerDashboard,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    addRestaurantReview,
} = require("../controllers/restaurant.controller");
const {
    getRecommendations,
    getRecommendationsForUserId,
} = require("../controllers/recommendation.controller");
const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Task 2: Search & Filtering
router.get("/search", optionalAuth, searchRestaurants);

// Task 6: Dynamic Restaurant Recommendations
router.get("/recommendations", optionalAuth, getRecommendations);
router.get("/recommendations/:userId", optionalAuth, getRecommendationsForUserId);

// Restaurant Owner Dashboard
router.get("/owner/dashboard", protect, authorizeRoles("restaurant", "admin"), getOwnerDashboard);

// Public listing & details
router.get("/", optionalAuth, getAllRestaurants);
router.get("/:id", optionalAuth, getRestaurantById);

// Owner / Admin CRUD & Customer Reviews
router.post("/", protect, authorizeRoles("restaurant", "admin"), createRestaurant);
router.put("/:restaurantId", protect, authorizeRoles("restaurant", "admin"), updateRestaurant);
router.delete("/:restaurantId", protect, authorizeRoles("admin"), deleteRestaurant);
router.post("/:id/reviews", protect, addRestaurantReview);

module.exports = router;

