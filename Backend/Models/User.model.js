const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
    {
        label: {
            type: String,
            enum: ["Home", "Work", "Other"],
            default: "Home",
        },
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true, default: "Bengaluru" },
        state: { type: String, trim: true, default: "Karnataka" },
        pincode: { type: String, trim: true, default: "560001" },
        landmark: { type: String, trim: true },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            // [longitude, latitude]
            coordinates: {
                type: [Number],
                default: [77.5946, 12.9716],
            },
        },
        isDefault: { type: Boolean, default: false },
    },
    { _id: true }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [80, "Name cannot exceed 80 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },
        avatar: {
            type: String,
            default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
        },
        role: {
            type: String,
            enum: ["customer", "restaurant", "delivery", "admin"],
            default: "customer",
            index: true,
        },
        savedAddresses: {
            type: [addressSchema],
            default: [],
        },
        wishlist: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Restaurant",
            },
        ],
        favoriteFoods: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Food",
            },
        ],
        // Fraud & Risk Management Fields
        riskScore: {
            type: Number,
            default: 0,
            min: 0,
        },
        riskLevel: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Low",
        },
        isRestricted: {
            type: Boolean,
            default: false,
            index: true,
        },
        restrictionReason: {
            type: String,
            default: "",
        },
        restrictedUntil: {
            type: Date,
            default: null,
        },
        failedTransactionCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ role: 1, isRestricted: 1 });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
