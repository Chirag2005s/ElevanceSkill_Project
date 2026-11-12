const mongoose = require("mongoose");

const deliveryAssignmentSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true,
            index: true,
        },
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryPartner",
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: [
                "searching",
                "offered",
                "accepted",
                "picked_up",
                "out_for_delivery",
                "delivered",
                "rejected",
                "expired",
                "no_partner_available",
            ],
            default: "searching",
            index: true,
        },
        pickupLocation: {
            address: { type: String, default: "" },
            coordinates: {
                type: [Number],
                default: [77.5946, 12.9716],
            },
        },
        dropLocation: {
            address: { type: String, default: "" },
            coordinates: {
                type: [Number],
                default: [77.605, 12.975],
            },
        },
        distanceToRestaurantKm: {
            type: Number,
            default: 1.2,
        },
        deliveryDistanceKm: {
            type: Number,
            default: 3.0,
        },
        estimatedDurationMinutes: {
            type: Number,
            default: 25,
        },
        partnerEarning: {
            type: Number,
            default: 45,
        },
        rejectedBy: [
            {
                partner: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner" },
                reason: { type: String, default: "Busy / Far" },
                rejectedAt: { type: Date, default: Date.now },
            },
        ],
        assignmentHistory: [
            {
                partner: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner" },
                action: { type: String }, // offered, accepted, rejected, admin_reassigned
                timestamp: { type: Date, default: Date.now },
                note: { type: String, default: "" },
            },
        ],
        assignedAt: {
            type: Date,
            default: Date.now,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

deliveryAssignmentSchema.index({ deliveryPartner: 1, status: 1 });
deliveryAssignmentSchema.index({ status: 1, createdAt: -1 });

module.exports =
    mongoose.models.DeliveryAssignment ||
    mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);

