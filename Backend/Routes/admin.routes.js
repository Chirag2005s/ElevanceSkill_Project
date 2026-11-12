const express = require("express");
const router = express.Router();

const {
    getDashboardOverview,
    getAllUsers,
    updateUserByAdmin,
    getAdminRestaurants,
    getAdminOrders,
    getDeliveryMonitoring,
    getSearchAnalytics,
    getCoupons,
    createCoupon,
    deleteCoupon,
    getRefunds,
    processRefundRequest,
    getAuditLogs,
} = require("../controllers/admin.controller");

const {
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
} = require("../controllers/restaurant.controller");

const { getSurgeSettings, updateSurgeSettings } = require("../controllers/surge.controller");
const { adminReassignOrder } = require("../controllers/delivery.controller");
const { getRecommendationAnalytics } = require("../controllers/recommendation.controller");
const fraudRoutes = require("./fraud.routes");

const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.use(protect, authorizeRoles("admin"));

// Dashboard Overview & Audit Logs
router.get("/overview", getDashboardOverview);
router.get("/audit-logs", getAuditLogs);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/:userId", updateUserByAdmin);

// Task 1: Fraud Detection Management
router.use("/fraud", fraudRoutes);

// Task 2: Restaurant Management & Search Analytics
router.get("/restaurants", getAdminRestaurants);
router.post("/restaurants/create", createRestaurant);
router.put("/restaurants/update/:restaurantId", updateRestaurant);
router.delete("/restaurants/delete/:restaurantId", deleteRestaurant);
router.get("/search-analytics", getSearchAnalytics);

// Task 3: Surge Pricing Configuration
router.get("/surge-settings", getSurgeSettings);
router.put("/surge-settings", updateSurgeSettings);

// Task 4: Delivery Partner Monitoring & Reassignment
router.get("/delivery-monitoring", getDeliveryMonitoring);
router.post("/delivery/reassign/:orderId", adminReassignOrder);

// Task 6: Recommendation Analytics
router.get("/recommendations/analytics", getRecommendationAnalytics);

// Order, Coupon & Refund Management
router.get("/orders", getAdminOrders);
router.get("/coupons", getCoupons);
router.post("/coupons", createCoupon);
router.delete("/coupons/:couponId", deleteCoupon);
router.get("/refunds", getRefunds);
router.patch("/refunds/:refundId", processRefundRequest);

module.exports = router;

