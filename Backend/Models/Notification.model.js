const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        recipientRole: {
            type: String,
            enum: ["customer", "restaurant", "delivery", "admin"],
            default: "customer",
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: [
                "ORDER_STATUS",
                "NEW_ORDER",
                "DELIVERY_ASSIGNMENT",
                "FRAUD_ALERT",
                "PAYMENT",
                "REFUND",
                "PROMOTION",
                "SYSTEM",
            ],
            default: "ORDER_STATUS",
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports =
    mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

