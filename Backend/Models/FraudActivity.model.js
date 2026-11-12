const mongoose = require("mongoose");

const fraudActivitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        activityType: {
            type: String,
            enum: [
                "EXCESSIVE_ORDERS_SHORT_TIME",
                "EXCESSIVE_CANCELLATIONS",
                "ABNORMAL_COUPON_USAGE",
                "EXCESSIVE_REFUND_REQUESTS",
                "REPEATED_FAILED_TRANSACTIONS",
                "SUSPICIOUS_ORDER_PATTERN",
            ],
            required: true,
            index: true,
        },
        pointsAdded: {
            type: Number,
            required: true,
            min: 0,
        },
        reason: {
            type: String,
            required: true,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

fraudActivitySchema.index({ user: 1, activityType: 1, createdAt: -1 });

module.exports =
    mongoose.models.FraudActivity || mongoose.model("FraudActivity", fraudActivitySchema);

