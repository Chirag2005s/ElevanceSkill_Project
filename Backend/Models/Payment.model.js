const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        razorpayOrderId: {
            type: String,
            required: true,
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            default: "",
        },
        razorpaySignature: {
            type: String,
            default: "",
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "INR",
        },
        method: {
            type: String,
            enum: ["ONLINE", "COD", "UPI", "CARD", "NETBANKING"],
            default: "ONLINE",
        },
        status: {
            type: String,
            enum: ["created", "captured", "failed", "refund_initiated", "refunded"],
            default: "created",
            index: true,
        },
        failureReason: {
            type: String,
            default: "",
        },
        webhookVerified: {
            type: Boolean,
            default: false,
        },
        webhookEvents: [
            {
                event: { type: String },
                receivedAt: { type: Date, default: Date.now },
                payloadSummary: { type: String },
            },
        ],
    },
    {
        timestamps: true,
    }
);

paymentSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

