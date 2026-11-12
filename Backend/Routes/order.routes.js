const express = require("express");
const router = express.Router();
const {
    createOrder,
    cancelOrder,
    updateOrderStatus,
    getOrderById,
    getOrderHistory,
    requestRefund,
} = require("../controllers/order.controller");
const { calculateDeliveryFee } = require("../controllers/surge.controller");
const { protect, ensureNotRestricted, optionalAuth } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const { orderLimiter } = require("../middleware/rateLimit.middleware");

// Task 3: Calculate Dynamic Surge Delivery Fee
router.post("/calculate-delivery-fee", optionalAuth, calculateDeliveryFee);

// Task 1, 3, 5: Create Order
router.post("/create", protect, ensureNotRestricted, orderLimiter, createOrder);

// Task 5: Order History
router.get("/history", protect, getOrderHistory);

// Task 1 & 5: Cancel Order
router.post("/cancel/:orderId", protect, cancelOrder);

// Task 4 & 5: Update Order Status (Strictly Restaurant, Delivery, or Admin)
router.patch(
    "/update-status/:orderId",
    protect,
    authorizeRoles("restaurant", "delivery", "admin"),
    updateOrderStatus
);

// Refund request
router.post("/:orderId/refund", protect, ensureNotRestricted, requestRefund);

// Task 4 & 5: Get Single Order Details
router.get("/:orderId", protect, getOrderById);

module.exports = router;

