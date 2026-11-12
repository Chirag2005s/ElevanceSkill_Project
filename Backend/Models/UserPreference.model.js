const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        cuisineScores: {
            // Map of cuisine name -> affinity weight
            type: Map,
            of: Number,
            default: {},
        },
        favoriteRestaurants: [
            {
                restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
                orderCount: { type: Number, default: 1 },
                lastOrderedAt: { type: Date, default: Date.now },
            },
        ],
        vegOrderCount: {
            type: Number,
            default: 0,
        },
        nonVegOrderCount: {
            type: Number,
            default: 0,
        },
        prefersVeg: {
            type: Boolean,
            default: false,
        },
        averageOrderSpend: {
            type: Number,
            default: 350,
        },
        totalOrdersAnalyzed: {
            type: Number,
            default: 0,
        },
        recentSearches: [
            {
                query: { type: String },
                cuisine: { type: String },
                searchedAt: { type: Date, default: Date.now },
            },
        ],
        viewedRestaurants: [
            {
                restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
                viewCount: { type: Number, default: 1 },
                lastViewedAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.UserPreference || mongoose.model("UserPreference", userPreferenceSchema);

