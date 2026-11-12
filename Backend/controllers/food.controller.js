const Food = require("../models/Food.model");
const Category = require("../models/Category.model");
const Restaurant = require("../models/Restaurant.model");
const restaurantSearchService = require("../services/restaurantSearch.service");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * @desc    Get all food items (with optional search, restaurantId, category, isVeg filters)
 * @route   GET /api/foods
 * @access  Public
 */
const getFoods = asyncHandler(async (req, res) => {
    const { restaurantId, categoryName, isVeg, q, bestseller } = req.query;
    const filter = {};

    if (restaurantId) filter.restaurant = restaurantId;
    if (categoryName && categoryName !== "All") filter.categoryName = categoryName;
    if (isVeg === "true") filter.isVeg = true;
    if (bestseller === "true") filter.isBestseller = true;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { categoryName: { $regex: q, $options: "i" } },
        ];
    }

    const foods = await Food.find(filter)
        .populate("restaurant", "name rating deliveryTimeMinutes address isOpen offerText")
        .sort({ isBestseller: -1, rating: -1 });

    return sendSuccess(res, 200, "Food items fetched", { foods });
});

/**
 * @desc    Get single food item details + related items from same restaurant
 * @route   GET /api/foods/:id
 * @access  Public
 */
const getFoodById = asyncHandler(async (req, res) => {
    const food = await Food.findById(req.params.id).populate(
        "restaurant",
        "name bannerImage logoImage rating totalRatings cuisines deliveryTimeMinutes avgPriceForTwo address isOpen offerText"
    );

    if (!food) {
        throw new ApiError(404, "Food item not found");
    }

    const relatedFoods = await Food.find({
        restaurant: food.restaurant._id,
        _id: { $ne: food._id },
        isAvailable: true,
    }).limit(6);

    return sendSuccess(res, 200, "Food details fetched", {
        food,
        relatedFoods,
    });
});

/**
 * @desc    Add a new food item to a restaurant menu
 * @route   POST /api/foods
 * @access  Private (restaurant, admin)
 */
const createFood = asyncHandler(async (req, res) => {
    const {
        restaurantId,
        name,
        description,
        price,
        discountPrice,
        categoryName = "Recommended",
        image,
        isVeg = true,
        spiceLevel = "Medium",
        preparationTimeMinutes = 15,
        calories = 400,
        serves = "Serves 1",
        isBestseller = false,
        tags = [],
        addons = [],
    } = req.body;

    let restaurant = null;
    if (restaurantId) {
        restaurant = await Restaurant.findById(restaurantId);
    } else {
        restaurant = await Restaurant.findOne({ owner: req.user._id });
    }

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found for adding menu item");
    }

    let categoryDoc = await Category.findOne({
        restaurant: restaurant._id,
        name: categoryName,
    });
    if (!categoryDoc) {
        categoryDoc = await Category.create({
            restaurant: restaurant._id,
            name: categoryName,
        });
    }

    const food = await Food.create({
        restaurant: restaurant._id,
        category: categoryDoc._id,
        categoryName,
        name,
        description,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        image:
            image ||
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80",
        isVeg: Boolean(isVeg),
        spiceLevel,
        preparationTimeMinutes: Number(preparationTimeMinutes),
        calories: Number(calories),
        serves,
        isBestseller: Boolean(isBestseller),
        tags: Array.isArray(tags) ? tags : String(tags).split(",").map((t) => t.trim()).filter(Boolean),
        addons,
    });

    await restaurantSearchService.invalidateSearchCache();

    return sendSuccess(res, 201, "Food item added to menu", { food });
});

/**
 * @desc    Update a food item
 * @route   PUT /api/foods/:id
 * @access  Private (restaurant, admin)
 */
const updateFood = asyncHandler(async (req, res) => {
    const food = await Food.findById(req.params.id);
    if (!food) {
        throw new ApiError(404, "Food item not found");
    }

    const fields = [
        "name",
        "description",
        "price",
        "discountPrice",
        "categoryName",
        "image",
        "isVeg",
        "spiceLevel",
        "preparationTimeMinutes",
        "calories",
        "serves",
        "isBestseller",
        "isAvailable",
        "addons",
    ];

    for (const field of fields) {
        if (req.body[field] !== undefined) {
            food[field] = req.body[field];
        }
    }

    await food.save();
    await restaurantSearchService.invalidateSearchCache();

    return sendSuccess(res, 200, "Food item updated", { food });
});

/**
 * @desc    Delete a food item
 * @route   DELETE /api/foods/:id
 * @access  Private (restaurant, admin)
 */
const deleteFood = asyncHandler(async (req, res) => {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) {
        throw new ApiError(404, "Food item not found");
    }

    await restaurantSearchService.invalidateSearchCache();
    return sendSuccess(res, 200, "Food item deleted from menu", {});
});

/**
 * @desc    Create or manage menu categories for a restaurant
 * @route   POST /api/foods/categories
 * @access  Private (restaurant, admin)
 */
const createCategory = asyncHandler(async (req, res) => {
    const { restaurantId, name, description = "", displayOrder = 0 } = req.body;
    let restaurant = restaurantId
        ? await Restaurant.findById(restaurantId)
        : await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }

    const category = await Category.create({
        restaurant: restaurant._id,
        name,
        description,
        displayOrder: Number(displayOrder),
    });

    return sendSuccess(res, 201, "Menu category created", { category });
});

/**
 * @desc    Delete a menu category
 * @route   DELETE /api/foods/categories/:id
 * @access  Private (restaurant, admin)
 */
const deleteCategory = asyncHandler(async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    return sendSuccess(res, 200, "Category deleted", {});
});

module.exports = {
    getFoods,
    getFoodById,
    createFood,
    updateFood,
    deleteFood,
    createCategory,
    deleteCategory,
};

