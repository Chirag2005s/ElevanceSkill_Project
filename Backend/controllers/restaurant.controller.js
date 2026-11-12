const Restaurant = require("../models/Restaurant.model");
const Food = require("../models/Food.model");
const Category = require("../models/Category.model");
const Review = require("../models/Review.model");
const Order = require("../models/Order.model");
const UserPreference = require("../models/UserPreference.model");
const AdminAuditLog = require("../models/AdminAuditLog.model");
const restaurantSearchService = require("../services/restaurantSearch.service");
const cacheClient = require("../config/redis");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 2 Endpoint: Advanced Restaurant Search & Filtering
 * @route   GET /api/restaurants/search
 * @access  Public (Optional Auth for search history)
 */
const searchRestaurants = asyncHandler(async (req, res) => {
    const result = await restaurantSearchService.searchRestaurants(
        req.query,
        req.user?._id || null
    );
    return sendSuccess(
        res,
        200,
        "Restaurants fetched successfully",
        {
            restaurants: result.restaurants,
            pagination: result.pagination,
        },
        result.meta
    );
});

/**
 * @desc    Get all approved restaurants (with optional filter params)
 * @route   GET /api/restaurants
 * @access  Public
 */
const getAllRestaurants = asyncHandler(async (req, res) => {
    const result = await restaurantSearchService.searchRestaurants(
        { ...req.query, limit: req.query.limit || 20 },
        req.user?._id || null
    );
    return sendSuccess(
        res,
        200,
        "Restaurants retrieved",
        {
            restaurants: result.restaurants,
            pagination: result.pagination,
        },
        result.meta
    );
});

/**
 * @desc    Get single restaurant details with full categorized menu and reviews
 * @route   GET /api/restaurants/:id
 * @access  Public
 */
const getRestaurantById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const restaurant = await Restaurant.findById(id).populate("owner", "name email phone");

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    const [categories, foods, reviews] = await Promise.all([
        Category.find({ restaurant: restaurant._id, isActive: true }).sort({ displayOrder: 1 }),
        Food.find({ restaurant: restaurant._id }).sort({ isBestseller: -1, rating: -1 }),
        Review.find({ restaurant: restaurant._id })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 })
            .limit(20),
    ]);

    // Record view interaction if customer is logged in
    if (req.user?._id) {
        UserPreference.findOneAndUpdate(
            { user: req.user._id },
            {
                $push: {
                    viewedRestaurants: {
                        $each: [{ restaurant: restaurant._id, viewCount: 1, lastViewedAt: new Date() }],
                        $slice: -20,
                    },
                },
            },
            { upsert: true }
        ).catch(() => { });
    }

    return sendSuccess(res, 200, "Restaurant details fetched", {
        restaurant,
        categories,
        foods,
        reviews,
    });
});

/**
 * @desc    Get Restaurant Owner's own restaurant dashboard & analytics
 * @route   GET /api/restaurants/owner/dashboard
 * @access  Private (restaurant, admin)
 */
const getOwnerDashboard = asyncHandler(async (req, res) => {
    let restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant && req.user.role === "admin") {
        restaurant = await Restaurant.findOne();
    }

    if (!restaurant) {
        throw new ApiError(404, "No restaurant associated with your account.");
    }

    const [foods, categories, orders, reviews] = await Promise.all([
        Food.find({ restaurant: restaurant._id }).sort({ createdAt: -1 }),
        Category.find({ restaurant: restaurant._id }).sort({ displayOrder: 1 }),
        Order.find({ restaurant: restaurant._id })
            .populate("user", "name email phone")
            .populate({
                path: "deliveryPartner",
                populate: { path: "user", select: "name phone" },
            })
            .sort({ createdAt: -1 })
            .limit(50),
        Review.find({ restaurant: restaurant._id })
            .populate("user", "name avatar")
            .sort({ createdAt: -1 })
            .limit(25),
    ]);

    const completedOrders = orders.filter((o) => o.status === "Delivered");
    const totalRevenue = completedOrders.reduce(
        (sum, o) => sum + Number(o.pricing?.subtotal || 0),
        0
    );
    const incomingOrders = orders.filter((o) =>
        ["Order Placed", "Restaurant Accepted", "Food Preparing", "Ready for Pickup"].includes(
            o.status
        )
    );

    return sendSuccess(res, 200, "Restaurant owner dashboard fetched", {
        restaurant,
        stats: {
            totalOrders: orders.length,
            completedOrdersCount: completedOrders.length,
            activeIncomingCount: incomingOrders.length,
            totalMenuItems: foods.length,
            totalRevenue,
            rating: restaurant.rating,
            totalRatings: restaurant.totalRatings,
        },
        foods,
        categories,
        orders,
        reviews,
    });
});

/**
 * @desc    Create a new restaurant (Owner or Admin)
 * @route   POST /api/restaurants
 * @route   POST /api/admin/restaurants/create
 * @access  Private (restaurant, admin)
 */
const createRestaurant = asyncHandler(async (req, res) => {
    const {
        ownerId,
        name,
        description,
        cuisines,
        bannerImage,
        logoImage,
        street,
        area,
        city = "Bengaluru",
        state = "Karnataka",
        pincode = "560001",
        lat = 12.9716,
        lng = 77.5946,
        phone,
        email,
        priceRange = "$$",
        avgPriceForTwo = 350,
        deliveryTimeMinutes = 30,
        isVegOnly = false,
        hasVegOptions = true,
        offerText = "40% OFF up to ₹80",
    } = req.body;

    if (!name || !description) {
        throw new ApiError(400, "Restaurant name and description are required");
    }

    const cuisineArray = Array.isArray(cuisines)
        ? cuisines
        : (cuisines || "North Indian, Biryani")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);

    const restaurant = await Restaurant.create({
        owner: ownerId || req.user._id,
        name,
        description,
        cuisines: cuisineArray,
        bannerImage:
            bannerImage ||
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&auto=format&fit=crop&q=80",
        logoImage:
            logoImage ||
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80",
        address: {
            street: street || "100 Feet Road, Indiranagar",
            area: area || "Indiranagar",
            city,
            state,
            pincode,
        },
        location: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
        },
        phone: phone || req.user.phone || "9876543210",
        email: email || req.user.email,
        priceRange,
        avgPriceForTwo: Number(avgPriceForTwo),
        deliveryTimeMinutes: Number(deliveryTimeMinutes),
        isVegOnly: Boolean(isVegOnly),
        hasVegOptions: Boolean(hasVegOptions),
        offerText,
        isApproved: true,
        isOpen: true,
    });

    await restaurantSearchService.invalidateSearchCache();

    if (req.user.role === "admin") {
        await AdminAuditLog.create({
            admin: req.user._id,
            action: "RESTAURANT_CREATED",
            targetType: "Restaurant",
            targetId: restaurant._id,
            summary: `Created restaurant '${restaurant.name}'`,
        });
    }

    return sendSuccess(res, 201, "Restaurant created successfully", { restaurant });
});

/**
 * @desc    Update restaurant details (Owner or Admin)
 * @route   PUT /api/restaurants/:restaurantId
 * @route   PUT /api/admin/restaurants/update/:restaurantId
 * @access  Private (restaurant, admin)
 */
const updateRestaurant = asyncHandler(async (req, res) => {
    const restaurantId = req.params.restaurantId || req.params.id;
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    if (
        req.user.role !== "admin" &&
        restaurant.owner.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(403, "You are not authorized to update this restaurant");
    }

    const updatableFields = [
        "name",
        "description",
        "bannerImage",
        "logoImage",
        "phone",
        "email",
        "priceRange",
        "avgPriceForTwo",
        "deliveryTimeMinutes",
        "isVegOnly",
        "hasVegOptions",
        "isOpen",
        "isApproved",
        "isFeatured",
        "openingTime",
        "closingTime",
        "offerText",
    ];

    for (const field of updatableFields) {
        if (req.body[field] !== undefined) {
            restaurant[field] = req.body[field];
        }
    }

    if (req.body.cuisines !== undefined) {
        restaurant.cuisines = Array.isArray(req.body.cuisines)
            ? req.body.cuisines
            : String(req.body.cuisines)
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
    }

    if (req.body.address || req.body.street || req.body.area) {
        restaurant.address = {
            street: req.body.address?.street || req.body.street || restaurant.address.street,
            area: req.body.address?.area || req.body.area || restaurant.address.area,
            city: req.body.address?.city || req.body.city || restaurant.address.city,
            state: req.body.address?.state || req.body.state || restaurant.address.state,
            pincode: req.body.address?.pincode || req.body.pincode || restaurant.address.pincode,
        };
    }

    if (req.body.lat !== undefined && req.body.lng !== undefined) {
        restaurant.location = {
            type: "Point",
            coordinates: [Number(req.body.lng), Number(req.body.lat)],
        };
    }

    await restaurant.save();
    await restaurantSearchService.invalidateSearchCache();
    await cacheClient.delByPrefix("rec:");

    return sendSuccess(res, 200, "Restaurant updated successfully", { restaurant });
});

/**
 * @desc    Delete restaurant (Admin)
 * @route   DELETE /api/admin/restaurants/delete/:restaurantId
 * @access  Private (admin)
 */
const deleteRestaurant = asyncHandler(async (req, res) => {
    const { restaurantId } = req.params;
    const restaurant = await Restaurant.findByIdAndDelete(restaurantId);

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    await Food.deleteMany({ restaurant: restaurantId });
    await Category.deleteMany({ restaurant: restaurantId });
    await restaurantSearchService.invalidateSearchCache();

    await AdminAuditLog.create({
        admin: req.user._id,
        action: "RESTAURANT_DELETED",
        targetType: "Restaurant",
        targetId: restaurant._id,
        summary: `Deleted restaurant '${restaurant.name}' and its menu items`,
    });

    return sendSuccess(res, 200, "Restaurant deleted successfully", {});
});

/**
 * @desc    Submit a review & rating for a restaurant
 * @route   POST /api/restaurants/:id/reviews
 * @access  Private (customer)
 */
const addRestaurantReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { restaurantRating = 5, foodRating = 5, deliveryRating = 5, comment, orderId, tags = [] } = req.body;

    if (!comment) {
        throw new ApiError(400, "Please write a review comment");
    }

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    const review = await Review.create({
        user: req.user._id,
        restaurant: restaurant._id,
        order: orderId || null,
        restaurantRating: Number(restaurantRating),
        foodRating: Number(foodRating),
        deliveryRating: Number(deliveryRating),
        comment,
        tags,
    });

    // Recalculate restaurant average rating
    const allReviews = await Review.find({ restaurant: restaurant._id });
    const avg =
        allReviews.reduce((acc, r) => acc + Number(r.restaurantRating || 5), 0) /
        Math.max(1, allReviews.length);

    restaurant.rating = Number(avg.toFixed(1));
    restaurant.totalRatings = (restaurant.totalRatings || 0) + 1;
    await restaurant.save();

    if (orderId) {
        await Order.findByIdAndUpdate(orderId, { isReviewed: true });
    }

    await restaurantSearchService.invalidateSearchCache();

    const populatedReview = await Review.findById(review._id).populate("user", "name avatar");
    return sendSuccess(res, 201, "Review submitted! Thank you for your feedback.", {
        review: populatedReview,
        updatedRating: restaurant.rating,
    });
});

module.exports = {
    searchRestaurants,
    getAllRestaurants,
    getRestaurantById,
    getOwnerDashboard,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    addRestaurantReview,
};

