const mongoose = require("mongoose");

const ORDER_STATUSES = [
    "Order Placed",
    "Restaurant Accepted",
    "Food Preparing",
    "Ready for Pickup",
    "Delivery Partner Assigned",
    "Picked Up",
    "Out for Delivery",
    "Delivered",
    "Restaurant Rejected",
    "Cancelled",
    "Refund Initiated",
    "Refund Completed",
];

const orderItemSchema = new mongoose.Schema(
    {
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true,
        },
        name: { type: String, required: true },
        image: { type: String, default: "" },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        isVeg: { type: Boolean, default: true },
        addons: [
            {
                name: { type: String },
                price: { type: Number, default: 0 },
            },
        ],
        itemTotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const statusTimelineSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ORDER_STATUSES,
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedByRole: {
            type: String,
            default: "system",
        },
        note: {
            type: String,
            default: "",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true,
        },
        deliveryPartner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryPartner",
            default: null,
            index: true,
        },
        items: {
            type: [orderItemSchema],
            required: true,
        },
        pricing: {
            subtotal: { type: Number, required: true, min: 0 },
            taxAmount: { type: Number, required: true, default: 0 },
            packagingFee: { type: Number, default: 20 },
            baseDeliveryFee: { type: Number, required: true, default: 30 },
            distanceFee: { type: Number, required: true, default: 0 },
            distanceKm: { type: Number, required: true, default: 2.5 },
            surgeMultiplier: { type: Number, required: true, default: 1.0 },
            demandLevel: {
                type: String,
                enum: ["Normal", "Medium", "High", "Extreme"],
                default: "Normal",
            },
            peakHourApplied: { type: String, default: "None" },
            regionName: { type: String, default: "Central Zone" },
            deliveryFee: { type: Number, required: true, min: 0 },
            discountAmount: { type: Number, default: 0 },
            couponCode: { type: String, default: "" },
            grandTotal: { type: Number, required: true, min: 0 },
        },
        deliveryAddress: {
            label: { type: String, default: "Home" },
            street: { type: String, required: true },
            city: { type: String, default: "Bengaluru" },
            state: { type: String, default: "Karnataka" },
            pincode: { type: String, default: "560001" },
            landmark: { type: String, default: "" },
            location: {
                type: {
                    type: String,
                    enum: ["Point"],
                    default: "Point",
                },
                coordinates: {
                    type: [Number],
                    default: [77.605, 12.975],
                },
            },
        },
        status: {
            type: String,
            enum: ORDER_STATUSES,
            default: "Order Placed",
            index: true,
        },
        statusHistory: {
            type: [statusTimelineSchema],
            default: [],
        },
        paymentMethod: {
            type: String,
            enum: ["ONLINE", "COD"],
            default: "ONLINE",
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refund Initiated", "Refunded"],
            default: "Pending",
            index: true,
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },
        fraudFlag: {
            isFlagged: { type: Boolean, default: false, index: true },
            riskScore: { type: Number, default: 0 },
            riskLevel: {
                type: String,
                enum: ["Low", "Medium", "High"],
                default: "Low",
            },
            reasons: { type: [String], default: [] },
            reviewStatus: {
                type: String,
                enum: ["not_required", "pending_review", "approved", "rejected"],
                default: "not_required",
            },
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
            },
            reviewedAt: { type: Date, default: null },
        },
        estimatedDeliveryTime: {
            type: Date,
            default: () => new Date(Date.now() + 35 * 60 * 1000),
        },
        deliveredAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancellationReason: { type: String, default: "" },
        cancelledByRole: { type: String, default: "" },
        specialInstructions: { type: String, default: "" },
        isReviewed: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
orderSchema.index({ "fraudFlag.isFlagged": 1, "fraudFlag.reviewStatus": 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;

