const mongoose = require("mongoose");

const regionalConfigSchema = new mongoose.Schema(
    {
        regionName: { type: String, required: true, trim: true },
        centerCoordinates: {
            // [longitude, latitude]
            type: [Number],
            default: [77.5946, 12.9716],
        },
        radiusKm: { type: Number, default: 10 },
        regionalMultiplier: { type: Number, default: 1.0, min: 0.8, max: 3.0 },
        baseFeeOverride: { type: Number, default: null },
        isActive: { type: Boolean, default: true },
    },
    { _id: true }
);

const surgePricingSchema = new mongoose.Schema(
    {
        configName: {
            type: String,
            default: "Global Dynamic Surge Engine",
            unique: true,
        },
        isEnabled: {
            type: Boolean,
            default: true,
        },
        baseDeliveryFee: {
            type: Number,
            default: 30,
            min: 0,
        },
        perKmRate: {
            type: Number,
            default: 8,
            min: 0,
        },
        freeDeliveryThreshold: {
            type: Number,
            default: 999,
        },
        peakHours: {
            lunch: {
                enabled: { type: Boolean, default: true },
                startHour: { type: Number, default: 12 }, // 12 PM
                endHour: { type: Number, default: 15 }, // 3 PM
                multiplier: { type: Number, default: 1.2 },
            },
            dinner: {
                enabled: { type: Boolean, default: true },
                startHour: { type: Number, default: 19 }, // 7 PM
                endHour: { type: Number, default: 22 }, // 10 PM
                multiplier: { type: Number, default: 1.3 },
            },
        },
        demandMultipliers: {
            normal: { type: Number, default: 1.0 },
            medium: { type: Number, default: 1.2 },
            high: { type: Number, default: 1.5 },
            extreme: { type: Number, default: 2.0 },
        },
        demandThresholds: {
            // Active orders threshold or activeOrders / availablePartners ratio
            mediumActiveOrders: { type: Number, default: 5 },
            highActiveOrders: { type: Number, default: 12 },
            extremeActiveOrders: { type: Number, default: 20 },
        },
        manualDemandOverride: {
            enabled: { type: Boolean, default: false },
            level: {
                type: String,
                enum: ["Normal", "Medium", "High", "Extreme"],
                default: "Normal",
            },
        },
        regionalConfigs: {
            type: [regionalConfigSchema],
            default: [
                {
                    regionName: "Central Bengaluru (MG Road / Indiranagar)",
                    centerCoordinates: [77.6197, 12.9716],
                    radiusKm: 6,
                    regionalMultiplier: 1.1,
                    isActive: true,
                },
                {
                    regionName: "South Tech Corridor (Koramangala / HSR)",
                    centerCoordinates: [77.6245, 12.9352],
                    radiusKm: 8,
                    regionalMultiplier: 1.15,
                    isActive: true,
                },
                {
                    regionName: "Whitefield / ITPL Zone",
                    centerCoordinates: [77.7499, 12.9698],
                    radiusKm: 10,
                    regionalMultiplier: 1.2,
                    isActive: true,
                },
            ],
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.SurgePricing || mongoose.model("SurgePricing", surgePricingSchema);

