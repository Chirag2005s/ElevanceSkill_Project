const User = require("../models/User.model");
const Restaurant = require("../models/Restaurant.model");
const DeliveryPartner = require("../models/DeliveryPartner.model");
const UserPreference = require("../models/UserPreference.model");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");
const { attachTokenCookies } = require("../utils/generateToken");

/**
 * @desc    Register a new user (customer, restaurant, delivery)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        role = "customer",
        street,
        city,
        pincode,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        restaurantName,
        cuisines,
    } = req.body;

    if (!name || !email || !password || !phone) {
        throw new ApiError(400, "Name, email, password, and phone number are required.");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        throw new ApiError(409, "An account with this email address already exists.");
    }

    const allowedRole = ["customer", "restaurant", "delivery", "admin"].includes(role)
        ? role
        : "customer";

    const defaultAddress = {
        label: "Home",
        street: street || "100 Feet Road, Indiranagar",
        city: city || "Bengaluru",
        state: "Karnataka",
        pincode: pincode || "560038",
        location: {
            type: "Point",
            coordinates: [77.6408, 12.9784],
        },
        isDefault: true,
    };

    const user = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        phone,
        role: allowedRole,
        savedAddresses: [defaultAddress],
    });

    // Initialize role-specific profiles automatically
    if (allowedRole === "customer") {
        await UserPreference.create({ user: user._id });
    } else if (allowedRole === "delivery") {
        await DeliveryPartner.create({
            user: user._id,
            vehicleType: vehicleType || "Bike",
            vehicleNumber: vehicleNumber || "KA-01-ZB-7788",
            licenseNumber: licenseNumber || "KA0120260055443",
            currentLocation: {
                type: "Point",
                coordinates: [77.6197, 12.9716],
            },
            isOnline: true,
            isAvailable: true,
        });
    } else if (allowedRole === "restaurant" && restaurantName) {
        await Restaurant.create({
            owner: user._id,
            name: restaurantName,
            description: `Authentic delicacies freshly prepared by ${restaurantName}.`,
            cuisines: Array.isArray(cuisines)
                ? cuisines
                : (cuisines || "North Indian, Biryani").split(",").map((c) => c.trim()),
            address: {
                street: street || "80 Feet Road, Koramangala",
                area: "Koramangala",
                city: city || "Bengaluru",
                pincode: pincode || "560034",
            },
            location: {
                type: "Point",
                coordinates: [77.6245, 12.9352],
            },
            phone,
            email: user.email,
        });
    }

    const { accessToken } = attachTokenCookies(res, user);

    const userResponse = await User.findById(user._id).populate("wishlist", "name bannerImage rating");

    return sendSuccess(res, 201, "Account registered successfully", {
        user: userResponse,
        token: accessToken,
    });
});

/**
 * @desc    Authenticate user & set HTTP-only JWT cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Please provide both email and password.");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
        throw new ApiError(401, "Invalid email or password.");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password.");
    }

    if (!user.isActive) {
        throw new ApiError(403, "Your account has been deactivated. Please contact admin.");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = attachTokenCookies(res, user);

    let roleContext = {};
    if (user.role === "restaurant") {
        const restaurant = await Restaurant.findOne({ owner: user._id });
        roleContext.restaurant = restaurant;
    } else if (user.role === "delivery") {
        let partner = await DeliveryPartner.findOne({ user: user._id });
        if (!partner) {
            partner = await DeliveryPartner.create({
                user: user._id,
                currentLocation: { type: "Point", coordinates: [77.6197, 12.9716] },
            });
        }
        roleContext.deliveryPartner = partner;
    }

    const sanitizedUser = await User.findById(user._id).populate(
        "wishlist",
        "name bannerImage rating cuisines deliveryTimeMinutes avgPriceForTwo"
    );

    return sendSuccess(res, 200, "Logged in successfully", {
        user: sanitizedUser,
        token: accessToken,
        ...roleContext,
    });
});

/**
 * @desc    Logout user & clear HTTP-only cookies
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
    res.clearCookie("token", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    return sendSuccess(res, 200, "Logged out successfully", {});
});

/**
 * @desc    Get current logged in user profile with role context
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
        "wishlist",
        "name bannerImage rating cuisines deliveryTimeMinutes avgPriceForTwo address isOpen offerText"
    );

    let roleContext = {};
    if (user.role === "restaurant") {
        roleContext.restaurant = await Restaurant.findOne({ owner: user._id });
    } else if (user.role === "delivery") {
        roleContext.deliveryPartner = await DeliveryPartner.findOne({ user: user._id });
    }

    return sendSuccess(res, 200, "Current user profile fetched", {
        user,
        ...roleContext,
    });
});

module.exports = {
    register,
    login,
    logout,
    getMe,
};

