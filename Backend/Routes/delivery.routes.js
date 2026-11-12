const express = require("express");
const router = express.Router();
const {
    setPartnerStatus,
    getAvailablePartners,
    getDeliveryAssignments,
    respondToAssignment,
} = require("../controllers/delivery.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Task 4 Required Endpoints
router.post("/set-status", protect, authorizeRoles("delivery", "admin"), setPartnerStatus);
router.get("/available", protect, authorizeRoles("admin", "restaurant", "delivery"), getAvailablePartners);
router.get("/assignments", protect, authorizeRoles("delivery", "admin"), getDeliveryAssignments);
router.post(
    "/assignments/:assignmentId/respond",
    protect,
    authorizeRoles("delivery", "admin"),
    respondToAssignment
);

module.exports = router;

