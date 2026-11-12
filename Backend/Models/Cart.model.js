const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        food: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"],
            max: [25, "Maximum 25 units per item"],
            default: 1,
        },
        selectedAddons: [
            {
                name: { type: String },
                price: { type: Number, default: 0 },
            },
        ],
        specialInstructions: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { _id: true }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            default: null,
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
        appliedCoupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null,
        },
        couponCode: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

