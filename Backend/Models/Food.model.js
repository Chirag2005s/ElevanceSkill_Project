const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        categoryName: {
            type: String,
            required: true,
            trim: true,
            default: "Recommended",
        },
        name: {
            type: String,
            required: [true, "Food item name is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Food description is required"],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Food price is required"],
            min: [1, "Price must be greater than 0"],
            index: true,
        },
        discountPrice: {
            type: Number,
            default: null,
        },
        image: {
            type: String,
            default: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
        },
        isVeg: {
            type: Boolean,
            required: true,
            default: true,
            index: true,
        },
        spiceLevel: {
            type: String,
            enum: ["Mild", "Medium", "Spicy", "Extra Spicy"],
            default: "Medium",
        },
        preparationTimeMinutes: {
            type: Number,
            default: 15,
            min: 5,
        },
        calories: {
            type: Number,
            default: 380,
        },
        serves: {
            type: String,
            default: "Serves 1",
        },
        isBestseller: {
            type: Boolean,
            default: false,
        },
        isAvailable: {
            type: Boolean,
            default: true,
            index: true,
        },
        rating: {
            type: Number,
            default: 4.3,
            min: 0,
            max: 5,
        },
        totalRatings: {
            type: Number,
            default: 12,
        },
        orderCount: {
            type: Number,
            default: 0,
        },
        tags: {
            type: [String],
            default: [],
        },
        addons: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true, min: 0 },
                isVeg: { type: Boolean, default: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

foodSchema.index({ restaurant: 1, isAvailable: 1, categoryName: 1 });
foodSchema.index({ name: "text", description: "text", categoryName: "text", tags: "text" });

module.exports = mongoose.models.Food || mongoose.model("Food", foodSchema);

