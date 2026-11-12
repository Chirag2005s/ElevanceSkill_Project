const express = require("express");
const router = express.Router();
const {
    createPaymentOrder,
    verifyPaymentSignature,
    recordPaymentFailure,
    handleRazorpayWebhook,
    getPaymentHistory,
} = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPaymentSignature);
router.post("/failure", protect, recordPaymentFailure);
router.post("/webhook", handleRazorpayWebhook);
router.get("/history", protect, getPaymentHistory);

module.exports = router;

