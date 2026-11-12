const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        vehicleType: {
            type: String,
            enum: ["Bike", "Scooter", "Electric Scooter", "Bicycle"],
            default: "Bike",
        },
        vehicleNumber: {
            type: String,
            required: true,
            trim: true,
            default: "KA-01-ZB-2026",
        },
        licenseNumber: {
            type: String,
            required: true,
            trim: true,
            default: "KA0120260098765",
        },
        zone: {
            type: String,
            default: "Central Bengaluru",
        },
        currentLocation: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            // GeoJSON [longitude, latitude]
            coordinates: {
                type: [Number],
                required: true,
                default: [77.5946, 12.9716],
            },
        },
        isOnline: {
            type: Boolean,
            default: true,
            index: true,
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
        activityStatus: {
            type: String,
            enum: ["Idle", "Assigned", "Picking Up", "Delivering", "Offline"],
            default: "Idle",
        },
        activeOrdersCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxConcurrentOrders: {
            type: Number,
            default: 2,
        },
        activeOrderIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
            },
        ],
        totalDeliveriesCompleted: {
            type: Number,
            default: 0,
        },
        totalRejections: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            default: 4.8,
            min: 1,
            max: 5,
        },
        earnings: {
            today: { type: Number, default: 0 },
            thisWeek: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            pendingPayout: { type: Number, default: 0 },
        },
        lastPingAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// 2dsphere index for MongoDB $near and $geoNear queries (Task 4)
deliveryPartnerSchema.index({ currentLocation: "2dsphere" });
deliveryPartnerSchema.index({ isOnline: 1, isAvailable: 1, activeOrdersCount: 1 });

module.exports =
    mongoose.models.DeliveryPartner || mongoose.model("DeliveryPartner", deliveryPartnerSchema);

