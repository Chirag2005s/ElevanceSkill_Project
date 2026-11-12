const express = require("express");
const router = express.Router();
const {
    getFlaggedOrders,
    getFraudOrderDetail,
    approveFraudOrder,
    rejectFraudOrder,
    restrictUserAccount,
} = require("../controllers/fraud.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.use(protect, authorizeRoles("admin"));

// Task 1 Required Admin Fraud Endpoints
router.get("/orders", getFlaggedOrders);
router.get("/orders/:orderId", getFraudOrderDetail);
router.patch("/orders/:orderId/approve", approveFraudOrder);
router.patch("/orders/:orderId/reject", rejectFraudOrder);
router.patch("/users/:userId/restrict", restrictUserAccount);

module.exports = router;

