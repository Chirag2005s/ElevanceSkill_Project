const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ["Order", "User", "Restaurant", "DeliveryPartner", "SurgePricing", "Refund", "Coupon"],
            required: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        summary: {
            type: String,
            required: true,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
            default: "127.0.0.1",
        },
    },
    {
        timestamps: true,
    }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports =
    mongoose.models.AdminAuditLog || mongoose.model("AdminAuditLog", adminAuditLogSchema);

