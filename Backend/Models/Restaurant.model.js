const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "Restaurant name is required"],
            trim: true,
            maxlength: [120, "Restaurant name cannot exceed 120 characters"],
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: [true, "Restaurant description is required"],
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        cuisines: {
            type: [String],
            required: [true, "At least one cuisine is required"],
            index: true,
        },
        bannerImage: {
            type: String,
            default: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80",
        },
        logoImage: {
            type: String,
            default: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80",
        },
        address: {
            street: { type: String, required: true, trim: true },
            area: { type: String, required: true, trim: true },
            city: { type: String, required: true, trim: true, default: "Bengaluru" },
            state: { type: String, trim: true, default: "Karnataka" },
            pincode: { type: String, required: true, trim: true },
        },
        location: {
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
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        rating: {
            type: Number,
            default: 4.2,
            min: 0,
            max: 5,
            index: true,
        },
        totalRatings: {
            type: Number,
            default: 25,
            min: 0,
        },
        priceRange: {
            type: String,
            enum: ["$", "$$", "$$$", "$$$$"],
            default: "$$",
        },
        avgPriceForTwo: {
            type: Number,
            required: true,
            default: 350,
            min: 50,
            index: true,
        },
        deliveryTimeMinutes: {
            type: Number,
            required: true,
            default: 30,
            min: 10,
            max: 120,
            index: true,
        },
        isVegOnly: {
            type: Boolean,
            default: false,
            index: true,
        },
        hasVegOptions: {
            type: Boolean,
            default: true,
            index: true,
        },
        isOpen: {
            type: Boolean,
            default: true,
            index: true,
        },
        isApproved: {
            type: Boolean,
            default: true,
            index: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        openingTime: {
            type: String,
            default: "09:00",
        },
        closingTime: {
            type: String,
            default: "23:30",
        },
        popularityScore: {
            type: Number,
            default: 50,
            index: true,
        },
        totalOrdersCompleted: {
            type: Number,
            default: 0,
        },
        searchImpressions: {
            type: Number,
            default: 0,
        },
        recommendationImpressions: {
            type: Number,
            default: 0,
        },
        offerText: {
            type: String,
            default: "50% OFF up to ₹100",
        },
        fssaiLicense: {
            type: String,
            default: "11223344556677",
        },
    },
    {
        timestamps: true,
    }
);

// Geospatial 2dsphere index for proximity queries
restaurantSchema.index({ location: "2dsphere" });

// Text index for full-text search across name, cuisines, description, and area
restaurantSchema.index(
    {
        name: "text",
        cuisines: "text",
        description: "text",
        "address.area": "text",
        "address.city": "text",
    },
    {
        weights: {
            name: 10,
            cuisines: 8,
            "address.area": 5,
            description: 2,
        },
        name: "RestaurantTextSearchIndex",
    }
);

// Compound index for high-frequency filtering & sorting
restaurantSchema.index({
    isApproved: 1,
    isOpen: 1,
    rating: -1,
    deliveryTimeMinutes: 1,
    avgPriceForTwo: 1,
});

restaurantSchema.pre("save", function () {
    if (this.isModified("name") || !this.slug) {
        this.slug = `${this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")}-${this._id.toString().slice(-4)}`;
    }
});

module.exports = mongoose.models.Restaurant || mongoose.model("Restaurant", restaurantSchema);

