const Order = require("../models/Order.model");
const Food = require("../models/Food.model");
const Restaurant = require("../models/Restaurant.model");
const Coupon = require("../models/Coupon.model");
const Cart = require("../models/Cart.model");
const Refund = require("../models/Refund.model");
const DeliveryPartner = require("../models/DeliveryPartner.model");
const DeliveryAssignment = require("../models/DeliveryAssignment.model");
const surgePricingService = require("../services/surgePricing.service");
const fraudDetectionService = require("../services/fraudDetection.service");
const deliveryAssignmentService = require("../services/deliveryAssignment.service");
const notificationService = require("../services/notification.service");
const recommendationService = require("../services/recommendation.service");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * Valid Order Lifecycle State Machine Transitions by Role (Task 5)
 * Customers CANNOT transition restaurant or delivery statuses.
 */
const ALLOWED_TRANSITIONS = {
    restaurant: {
        "Order Placed": ["Restaurant Accepted", "Restaurant Rejected"],
        "Restaurant Accepted": ["Food Preparing", "Ready for Pickup"],
        "Delivery Partner Assigned": ["Food Preparing", "Ready for Pickup"],
        "Food Preparing": ["Ready for Pickup"],
    },
    delivery: {
        "Restaurant Accepted": ["Picked Up"],
        "Food Preparing": ["Picked Up"],
        "Ready for Pickup": ["Picked Up"],
        "Delivery Partner Assigned": ["Picked Up", "Out for Delivery"],
        "Picked Up": ["Out for Delivery", "Delivered"],
        "Out for Delivery": ["Delivered"],
    },
    admin: {
        // Admin can move an order to any valid lifecycle state
        "*": [
            "Order Placed",
            "Restaurant Accepted",
            "Food Preparing",
            "Ready for Pickup",
            "Delivery Partner Assigned",
            "Picked Up",
            "Out for Delivery",
            "Delivered",
            "Restaurant Rejected",
            "Cancelled",
            "Refund Initiated",
            "Refund Completed",
        ],
    },
};

/**
 * TASK 1, 3, 5 Endpoint: Create a new order with independent backend pricing, surge calculation, and fraud detection
 * @route   POST /api/orders/create
 * @access  Private (customer, admin)
 */
const createOrder = asyncHandler(async (req, res) => {
    const {
        restaurantId,
        items = [],
        deliveryAddress,
        couponCode = "",
        paymentMethod = "ONLINE",
        specialInstructions = "",
        simulatedHour = null,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Cannot create an order with an empty cart");
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
        throw new ApiError(404, "Restaurant not found");
    }
    if (!restaurant.isOpen) {
        throw new ApiError(400, "This restaurant is currently closed for orders");
    }

    // 1. Independently fetch & validate every food item from MongoDB (NEVER trust frontend prices)
    const foodIds = items.map((i) => i.foodId || i.food?._id || i.food);
    const dbFoods = await Food.find({ _id: { $in: foodIds } });
    const foodMap = new Map(dbFoods.map((f) => [f._id.toString(), f]));

    let subtotal = 0;
    const validatedItems = [];

    for (const reqItem of items) {
        const fid = (reqItem.foodId || reqItem.food?._id || reqItem.food || "").toString();
        const foodDoc = foodMap.get(fid);
        if (!foodDoc) {
            throw new ApiError(404, `Food item ${fid} no longer exists`);
        }
        if (!foodDoc.isAvailable) {
            throw new ApiError(400, `${foodDoc.name} is currently out of stock`);
        }

        const qty = Math.max(1, Number(reqItem.quantity || 1));
        const unitPrice = Number(foodDoc.discountPrice || foodDoc.price);
        const addons = Array.isArray(reqItem.addons || reqItem.selectedAddons)
            ? reqItem.addons || reqItem.selectedAddons
            : [];
        const addonsTotal = addons.reduce((s, a) => s + Number(a.price || 0), 0);
        const itemTotal = (unitPrice + addonsTotal) * qty;

        subtotal += itemTotal;
        validatedItems.push({
            food: foodDoc._id,
            name: foodDoc.name,
            image: foodDoc.image,
            price: unitPrice,
            quantity: qty,
            isVeg: foodDoc.isVeg,
            addons,
            itemTotal,
        });
    }

    // 2. Independently calculate Dynamic Surge Delivery Fee on Backend (Task 3)
    const custCoords =
        deliveryAddress?.location?.coordinates ||
        (deliveryAddress?.lng && deliveryAddress?.lat
            ? [Number(deliveryAddress.lng), Number(deliveryAddress.lat)]
            : req.user.savedAddresses?.[0]?.location?.coordinates || [77.615, 12.9716]);

    const surgeBreakdown = await surgePricingService.calculateDeliveryFee({
        restaurantId: restaurant._id,
        restaurantCoordinates: restaurant.location?.coordinates,
        customerCoordinates: custCoords,
        subtotal,
        simulatedHour,
    });

    // 3. Validate Coupon on Backend if provided
    let discountAmount = 0;
    let appliedCouponDoc = null;
    const cleanCouponCode = couponCode ? couponCode.toUpperCase().trim() : "";

    if (cleanCouponCode) {
        const coupon = await Coupon.findOne({ code: cleanCouponCode, isActive: true });
        if (
            coupon &&
            new Date() <= new Date(coupon.validUntil) &&
            subtotal >= coupon.minOrderAmount
        ) {
            if (coupon.discountType === "percentage") {
                discountAmount = Math.round((subtotal * coupon.discountValue) / 100);
                if (coupon.maxDiscountAmount) {
                    discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
                }
            } else {
                discountAmount = coupon.discountValue;
            }
            discountAmount = Math.min(discountAmount, subtotal);
            appliedCouponDoc = coupon;
        }
    }

    const taxAmount = Math.round(subtotal * 0.05); // 5% GST
    const packagingFee = 20;
    const deliveryFee = surgeBreakdown.deliveryFee;
    const grandTotal = Math.max(
        1,
        subtotal + taxAmount + packagingFee + deliveryFee - discountAmount
    );

    // 4. Execute Real-Time Fraud Detection & Risk Scoring Engine (Task 1)
    const fraudEvaluation = await fraudDetectionService.evaluateOrderFraudRisk({
        userId: req.user._id,
        couponCode: cleanCouponCode,
        grandTotal,
        paymentMethod,
    });

    const orderNumber = `ZB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const order = await Order.create({
        orderNumber,
        user: req.user._id,
        restaurant: restaurant._id,
        items: validatedItems,
        pricing: {
            subtotal,
            taxAmount,
            packagingFee,
            baseDeliveryFee: surgeBreakdown.baseDeliveryFee,
            distanceFee: surgeBreakdown.distanceFee,
            distanceKm: surgeBreakdown.distanceKm,
            surgeMultiplier: surgeBreakdown.surgeMultiplier,
            demandLevel: surgeBreakdown.demandLevel,
            peakHourApplied: surgeBreakdown.peakHourApplied,
            regionName: surgeBreakdown.regionName,
            deliveryFee,
            discountAmount,
            couponCode: appliedCouponDoc ? appliedCouponDoc.code : "",
            grandTotal,
        },
        deliveryAddress: {
            label: deliveryAddress?.label || "Home",
            street:
                deliveryAddress?.street ||
                req.user.savedAddresses?.[0]?.street ||
                "100 Feet Road, Indiranagar",
            city: deliveryAddress?.city || "Bengaluru",
            state: deliveryAddress?.state || "Karnataka",
            pincode: deliveryAddress?.pincode || "560038",
            landmark: deliveryAddress?.landmark || "",
            location: {
                type: "Point",
                coordinates: custCoords,
            },
        },
        status: "Order Placed",
        statusHistory: [
            {
                status: "Order Placed",
                updatedBy: req.user._id,
                updatedByRole: req.user.role,
                note: fraudEvaluation.isFlagged
                    ? `Order placed (Flagged for ${fraudEvaluation.riskLevel} Risk Review - Score: ${fraudEvaluation.riskScore})`
                    : "Order placed successfully",
                timestamp: new Date(),
            },
        ],
        paymentMethod: paymentMethod === "COD" ? "COD" : "ONLINE",
        paymentStatus: "Pending",
        fraudFlag: {
            isFlagged: fraudEvaluation.isFlagged,
            riskScore: fraudEvaluation.riskScore,
            riskLevel: fraudEvaluation.riskLevel,
            reasons: fraudEvaluation.reasons,
            reviewStatus: fraudEvaluation.reviewStatus,
        },
        specialInstructions,
        estimatedDeliveryTime: new Date(
            Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60 * 1000
        ),
    });

    // Record Coupon usage
    if (appliedCouponDoc) {
        appliedCouponDoc.totalUsedCount += 1;
        appliedCouponDoc.usedBy.push({
            user: req.user._id,
            order: order._id,
            usedAt: new Date(),
        });
        await appliedCouponDoc.save();
    }

    // Increment order counts on Food items
    for (const vItem of validatedItems) {
        Food.findByIdAndUpdate(vItem.food, { $inc: { orderCount: vItem.quantity } }).catch(
            () => { }
        );
    }

    // Clear user's cart
    await Cart.findOneAndUpdate(
        { user: req.user._id },
        { restaurant: null, items: [], appliedCoupon: null, couponCode: "" }
    );

    // 5. Persist Fraud Record & Activity Logs (Task 1)
    await fraudDetectionService.recordOrderFraudEvaluation(order, fraudEvaluation);

    // 6. Send Real-Time Notifications to Customer & Restaurant Owner (Task 5)
    await notificationService.notifyOrderStatusChange(order, "");
    await notificationService.notifyRestaurantNewOrder(order, restaurant);

    // 7. Update User Preferences for Recommendation Engine (Task 6)
    recommendationService.syncUserPreferencesFromOrders(req.user._id).catch(() => { });

    const populatedOrder = await Order.findById(order._id)
        .populate("restaurant", "name bannerImage logoImage address phone location deliveryTimeMinutes")
        .populate("user", "name email phone");

    return sendSuccess(res, 201, "Order placed successfully", {
        order: populatedOrder,
        fraudEvaluation,
    });
});

/**
 * TASK 1 & 5 Endpoint: Cancel an eligible order
 * @route   POST /api/orders/cancel/:orderId
 * @access  Private (customer, admin)
 */
const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { reason = "Changed my mind" } = req.body || {};

    const order = await Order.findById(orderId).populate("restaurant");
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (
        req.user.role !== "admin" &&
        order.user.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(403, "You are not authorized to cancel this order");
    }

    // Customers can only cancel before food preparation begins
    const cancellableStatuses = ["Order Placed", "Restaurant Accepted"];
    if (req.user.role === "customer" && !cancellableStatuses.includes(order.status)) {
        throw new ApiError(
            400,
            `Order cannot be cancelled once it is in '${order.status}' stage.`
        );
    }

    const previousStatus = order.status;
    order.status = "Cancelled";
    order.cancelledAt = new Date();
    order.cancelledByRole = req.user.role;
    order.cancellationReason = reason;

    if (order.paymentStatus === "Paid") {
        order.paymentStatus = "Refund Initiated";
        await Refund.create({
            order: order._id,
            payment: order.payment,
            user: order.user,
            amount: order.pricing.grandTotal,
            reason: `Order cancelled: ${reason}`,
            status: "Pending",
        });
    }

    order.statusHistory.push({
        status: "Cancelled",
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        note: `Order cancelled (${reason})`,
        timestamp: new Date(),
    });

    await order.save();

    // Release delivery partner if one was assigned
    if (order.deliveryPartner) {
        await DeliveryPartner.findByIdAndUpdate(order.deliveryPartner, {
            $inc: { activeOrdersCount: -1 },
            $pull: { activeOrderIds: order._id },
            $set: { isAvailable: true, activityStatus: "Idle" },
        });
    }

    // Monitor repeated cancellations in Fraud Detection Engine (Task 1)
    await fraudDetectionService.recordCancellationOrRefundActivity(
        order.user,
        order._id,
        "CANCELLATION"
    );

    await notificationService.notifyOrderStatusChange(order, previousStatus);

    return sendSuccess(res, 200, "Order cancelled successfully", { order });
});

/**
 * TASK 4 & 5 Endpoint: Update Order Lifecycle Status with Role Validation & Auto Delivery Assignment
 * @route   PATCH /api/orders/update-status/:orderId
 * @access  Private (restaurant, delivery, admin)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status, note = "" } = req.body;

    if (!status) {
        throw new ApiError(400, "Target order status is required");
    }

    // Customers are strictly forbidden from calling update-status
    if (req.user.role === "customer") {
        throw new ApiError(
            403,
            "Customers are not permitted to update restaurant or delivery order statuses"
        );
    }

    const order = await Order.findById(orderId).populate("restaurant");
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Validate role transition rules
    const roleRules = ALLOWED_TRANSITIONS[req.user.role];
    if (!roleRules) {
        throw new ApiError(403, `Role '${req.user.role}' cannot update order status`);
    }

    if (req.user.role !== "admin") {
        const validNextStatuses = roleRules[order.status] || [];
        if (!validNextStatuses.includes(status)) {
            throw new ApiError(
                400,
                `Invalid status transition from '${order.status}' to '${status}' for role '${req.user.role}'`
            );
        }
    }

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
        status,
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        note: note || `Status updated to ${status}`,
        timestamp: new Date(),
    });

    if (status === "Delivered") {
        order.deliveredAt = new Date();
        if (order.paymentMethod === "COD") {
            order.paymentStatus = "Paid";
        }

        // Update restaurant stats
        await Restaurant.findByIdAndUpdate(order.restaurant._id || order.restaurant, {
            $inc: { totalOrdersCompleted: 1, popularityScore: 1 },
        });

        // Update delivery partner earnings & free up capacity
        if (order.deliveryPartner) {
            const assignment = await DeliveryAssignment.findOneAndUpdate(
                { order: order._id },
                { status: "delivered", completedAt: new Date() },
                { new: true }
            );
            const earning = assignment?.partnerEarning || Math.round((order.pricing?.deliveryFee || 40) * 0.85);

            await DeliveryPartner.findByIdAndUpdate(order.deliveryPartner, {
                $inc: {
                    activeOrdersCount: -1,
                    totalDeliveriesCompleted: 1,
                    "earnings.today": earning,
                    "earnings.thisWeek": earning,
                    "earnings.total": earning,
                    "earnings.pendingPayout": earning,
                },
                $pull: { activeOrderIds: order._id },
                $set: { isAvailable: true, activityStatus: "Idle" },
            });
        }
    } else if (status === "Picked Up" && order.deliveryPartner) {
        await DeliveryAssignment.findOneAndUpdate(
            { order: order._id },
            { status: "picked_up" }
        );
        await DeliveryPartner.findByIdAndUpdate(order.deliveryPartner, {
            activityStatus: "Picking Up",
        });
    } else if (status === "Out for Delivery" && order.deliveryPartner) {
        await DeliveryAssignment.findOneAndUpdate(
            { order: order._id },
            { status: "out_for_delivery" }
        );
        await DeliveryPartner.findByIdAndUpdate(order.deliveryPartner, {
            activityStatus: "Delivering",
        });
    } else if (status === "Restaurant Rejected") {
        if (order.paymentStatus === "Paid") {
            order.paymentStatus = "Refund Initiated";
        }
    }

    await order.save();

    // TASK 4: When restaurant accepts an order (or marks Ready for Pickup without partner), automatically trigger Smart Delivery Partner Assignment
    let assignmentOutcome = null;
    if (
        ["Restaurant Accepted", "Ready for Pickup"].includes(status) &&
        !order.deliveryPartner
    ) {
        assignmentOutcome = await deliveryAssignmentService.autoAssignDeliveryPartner(order._id);
    }

    // Emit live Socket.IO event & save notification (Task 5)
    const updatedOrder = await Order.findById(order._id)
        .populate("restaurant", "name bannerImage logoImage address phone location")
        .populate("user", "name email phone")
        .populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name phone avatar" },
        });

    await notificationService.notifyOrderStatusChange(updatedOrder, previousStatus);

    return sendSuccess(res, 200, `Order status updated to '${updatedOrder.status}'`, {
        order: updatedOrder,
        deliveryAssignment: assignmentOutcome,
    });
});

/**
 * TASK 4 & 5 Endpoint: Get single order details with full tracking timeline & partner coordinates
 * @route   GET /api/orders/:orderId
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId)
        .populate("restaurant", "name bannerImage logoImage address phone location deliveryTimeMinutes")
        .populate("user", "name email phone avatar")
        .populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name email phone avatar" },
        });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    const assignment = await DeliveryAssignment.findOne({ order: order._id }).populate({
        path: "deliveryPartner",
        populate: { path: "user", select: "name phone avatar" },
    });

    return sendSuccess(res, 200, "Order details fetched", {
        order,
        assignment,
    });
});

/**
 * TASK 5 Endpoint: Get order history for logged-in customer (or restaurant/admin)
 * @route   GET /api/orders/history
 * @access  Private
 */
const getOrderHistory = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === "customer") {
        filter.user = req.user._id;
    } else if (req.user.role === "restaurant") {
        const rest = await Restaurant.findOne({ owner: req.user._id });
        if (rest) filter.restaurant = rest._id;
    } else if (req.user.role === "delivery") {
        const partner = await DeliveryPartner.findOne({ user: req.user._id });
        if (partner) filter.deliveryPartner = partner._id;
    }

    if (status && status !== "All") {
        filter.status = status;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate("restaurant", "name bannerImage logoImage address phone location")
            .populate("user", "name email phone")
            .populate({
                path: "deliveryPartner",
                populate: { path: "user", select: "name phone avatar" },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Order.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Order history fetched", {
        orders,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)) || 1,
        },
    });
});

/**
 * @desc    Customer requests a refund on a delivered/cancelled/issue order
 * @route   POST /api/orders/:orderId/refund
 * @access  Private (customer)
 */
const requestRefund = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { reason = "Missing or damaged item in order" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "Not authorized to request refund for this order");
    }

    const existingRefund = await Refund.findOne({ order: order._id });
    if (existingRefund) {
        throw new ApiError(400, "A refund request already exists for this order");
    }

    const refund = await Refund.create({
        order: order._id,
        payment: order.payment,
        user: req.user._id,
        amount: order.pricing.grandTotal,
        reason,
        status: "Pending",
    });

    const previousStatus = order.status;
    order.status = "Refund Initiated";
    order.paymentStatus = "Refund Initiated";
    order.statusHistory.push({
        status: "Refund Initiated",
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        note: `Refund requested: ${reason}`,
        timestamp: new Date(),
    });
    await order.save();

    await fraudDetectionService.recordCancellationOrRefundActivity(
        req.user._id,
        order._id,
        "REFUND"
    );

    await notificationService.notifyOrderStatusChange(order, previousStatus);

    return sendSuccess(res, 201, "Refund request submitted successfully", {
        refund,
        order,
    });
});

module.exports = {
    createOrder,
    cancelOrder,
    updateOrderStatus,
    getOrderById,
    getOrderHistory,
    requestRefund,
};

