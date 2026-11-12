const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
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
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        restaurantRating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        foodRating: {
            type: Number,
            default: 5,
            min: 1,
            max: 5,
        },
        deliveryRating: {
            type: Number,
            default: 5,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: [true, "Review comment is required"],
            trim: true,
            maxlength: 1000,
        },
        tags: {
            type: [String],
            default: [],
        },
        ownerReply: {
            text: { type: String, default: "" },
            repliedAt: { type: Date, default: null },
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);

