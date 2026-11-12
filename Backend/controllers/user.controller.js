const User = require("../models/User.model");
const Cart = require("../models/Cart.model");
const Food = require("../models/Food.model");
const Restaurant = require("../models/Restaurant.model");
const Coupon = require("../models/Coupon.model");
const UserPreference = require("../models/UserPreference.model");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * @desc    Update logged-in user profile & saved addresses
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, avatar, savedAddresses } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;
    if (Array.isArray(savedAddresses)) {
        user.savedAddresses = savedAddresses;
    }

    await user.save();
    return sendSuccess(res, 200, "Profile updated successfully", { user });
});

/**
 * @desc    Add a new delivery address to user profile
 * @route   POST /api/users/addresses
 * @access  Private
 */
const addAddress = asyncHandler(async (req, res) => {
    const { label = "Home", street, city = "Bengaluru", state = "Karnataka", pincode = "560001", landmark = "", lat, lng, isDefault = false } = req.body;

    if (!street) {
        throw new ApiError(400, "Street address is required");
    }

    const user = await User.findById(req.user._id);
    if (isDefault) {
        user.savedAddresses.forEach((addr) => {
            addr.isDefault = false;
        });
    }

    user.savedAddresses.push({
        label,
        street,
        city,
        state,
        pincode,
        landmark,
        location: {
            type: "Point",
            coordinates: [
                lng !== undefined ? Number(lng) : 77.615,
                lat !== undefined ? Number(lat) : 12.9716,
            ],
        },
        isDefault: isDefault || user.savedAddresses.length === 0,
    });

    await user.save();
    return sendSuccess(res, 201, "Address saved successfully", {
        savedAddresses: user.savedAddresses,
    });
});

/**
 * @desc    Delete a saved address
 * @route   DELETE /api/users/addresses/:addressId
 * @access  Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.savedAddresses = user.savedAddresses.filter(
        (a) => a._id.toString() !== req.params.addressId
    );
    await user.save();
    return sendSuccess(res, 200, "Address removed", {
        savedAddresses: user.savedAddresses,
    });
});

/**
 * @desc    Toggle restaurant in user's wishlist
 * @route   POST /api/users/wishlist/:restaurantId
 * @access  Private
 */
const toggleWishlist = asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    const user = await User.findById(req.user._id);

    const existsIndex = user.wishlist.findIndex(
        (id) => id.toString() === restaurantId.toString()
    );

    let added = false;
    if (existsIndex > -1) {
        user.wishlist.splice(existsIndex, 1);
    } else {
        user.wishlist.push(restaurantId);
        added = true;
    }

    await user.save();
    const populatedUser = await User.findById(req.user._id).populate(
        "wishlist",
        "name bannerImage rating cuisines deliveryTimeMinutes avgPriceForTwo address isOpen offerText"
    );

    return sendSuccess(
        res,
        200,
        added ? "Added to your wishlist" : "Removed from your wishlist",
        {
            wishlist: populatedUser.wishlist,
            added,
        }
    );
});

/**
 * @desc    Get user's wishlist restaurants
 * @route   GET /api/users/wishlist
 * @access  Private
 */
const getWishlist = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
        "wishlist",
        "name bannerImage logoImage rating totalRatings cuisines deliveryTimeMinutes avgPriceForTwo address isOpen offerText isVegOnly"
    );
    return sendSuccess(res, 200, "Wishlist fetched", {
        wishlist: user?.wishlist || [],
    });
});

/**
 * @desc    Get user's server-side cart
 * @route   GET /api/users/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
    let cart = await Cart.findOne({ user: req.user._id })
        .populate("restaurant", "name address location deliveryTimeMinutes isOpen offerText")
        .populate("items.food", "name price discountPrice image isVeg isAvailable restaurant")
        .populate("appliedCoupon");

    if (!cart) {
        cart = await Cart.create({ user: req.user._id, items: [] });
    }

    return sendSuccess(res, 200, "Cart fetched", { cart });
});

/**
 * @desc    Sync / update user's cart
 * @route   POST /api/users/cart
 * @access  Private
 */
const updateCart = asyncHandler(async (req, res) => {
    const { restaurantId, items = [], couponCode = "" } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        cart = new Cart({ user: req.user._id });
    }

    cart.restaurant = items.length > 0 ? restaurantId : null;
    cart.items = items.map((item) => ({
        food: item.food?._id || item.food || item.foodId,
        quantity: Math.max(1, Number(item.quantity || 1)),
        selectedAddons: item.selectedAddons || [],
        specialInstructions: item.specialInstructions || "",
    }));
    cart.couponCode = couponCode ? couponCode.toUpperCase().trim() : "";

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
        .populate("restaurant", "name address location deliveryTimeMinutes isOpen offerText")
        .populate("items.food", "name price discountPrice image isVeg isAvailable restaurant");

    return sendSuccess(res, 200, "Cart updated", { cart: populatedCart });
});

/**
 * @desc    Clear user's cart
 * @route   DELETE /api/users/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
    await Cart.findOneAndUpdate(
        { user: req.user._id },
        { restaurant: null, items: [], appliedCoupon: null, couponCode: "" },
        { upsert: true }
    );
    return sendSuccess(res, 200, "Cart cleared", {});
});

/**
 * @desc    Get active available coupons & validate a coupon code
 * @route   GET /api/users/coupons
 * @access  Public / Optional Auth
 */
const getAvailableCoupons = asyncHandler(async (req, res) => {
    const now = new Date();
    const coupons = await Coupon.find({
        isActive: true,
        validUntil: { $gte: now },
    }).sort({ discountValue: -1 });

    return sendSuccess(res, 200, "Available coupons fetched", { coupons });
});

/**
 * @desc    Validate and calculate discount for a coupon code
 * @route   POST /api/users/coupons/validate
 * @access  Private
 */
const validateCoupon = asyncHandler(async (req, res) => {
    const { code, subtotal } = req.body;
    if (!code) {
        throw new ApiError(400, "Please enter a coupon code");
    }

    const coupon = await Coupon.findOne({
        code: code.toUpperCase().trim(),
        isActive: true,
    });

    if (!coupon) {
        throw new ApiError(404, "Invalid or inactive coupon code");
    }

    if (new Date() > new Date(coupon.validUntil)) {
        throw new ApiError(400, "This coupon code has expired");
    }

    const orderSubtotal = Number(subtotal || 0);
    if (orderSubtotal < coupon.minOrderAmount) {
        throw new ApiError(
            400,
            `Minimum order value of ₹${coupon.minOrderAmount} is required for coupon ${coupon.code}`
        );
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
        discountAmount = Math.round((orderSubtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
    } else {
        discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);

    return sendSuccess(res, 200, `Coupon ${coupon.code} applied! You saved ₹${discountAmount}`, {
        coupon: {
            _id: coupon._id,
            code: coupon.code,
            title: coupon.title,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderAmount: coupon.minOrderAmount,
            maxDiscountAmount: coupon.maxDiscountAmount,
        },
        discountAmount,
    });
});

module.exports = {
    updateProfile,
    addAddress,
    deleteAddress,
    toggleWishlist,
    getWishlist,
    getCart,
    updateCart,
    clearCart,
    getAvailableCoupons,
    validateCoupon,
};

