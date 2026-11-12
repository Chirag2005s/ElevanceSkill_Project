const express = require("express");
const router = express.Router();
const {
    calculateDeliveryFee,
    getSurgeSettings,
    updateSurgeSettings,
} = require("../controllers/surge.controller");
const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.post("/calculate", optionalAuth, calculateDeliveryFee);
router.get("/settings", protect, authorizeRoles("admin"), getSurgeSettings);
router.put("/settings", protect, authorizeRoles("admin"), updateSurgeSettings);

module.exports = router;

