const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "Coupon code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        discountType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
            default: "percentage",
        },
        discountValue: {
            type: Number,
            required: true,
            min: 1,
        },
        minOrderAmount: {
            type: Number,
            default: 150,
            min: 0,
        },
        maxDiscountAmount: {
            type: Number,
            default: 150,
            min: 0,
        },
        validFrom: {
            type: Date,
            default: Date.now,
        },
        validUntil: {
            type: Date,
            required: true,
        },
        usageLimitPerUser: {
            type: Number,
            default: 3,
        },
        dailyUsageLimitPerUser: {
            type: Number,
            default: 2,
        },
        totalUsageLimit: {
            type: Number,
            default: 1000,
        },
        totalUsedCount: {
            type: Number,
            default: 0,
        },
        usedBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
                usedAt: { type: Date, default: Date.now },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);

