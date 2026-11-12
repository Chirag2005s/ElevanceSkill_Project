const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        reason: {
            type: String,
            required: [true, "Refund reason is required"],
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Processed", "Rejected"],
            default: "Pending",
            index: true,
        },
        razorpayRefundId: {
            type: String,
            default: "",
        },
        adminNote: {
            type: String,
            default: "",
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

refundSchema.index({ user: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Refund || mongoose.model("Refund", refundSchema);

