const User = require("../models/User.model");
const Restaurant = require("../models/Restaurant.model");
const Order = require("../models/Order.model");
const DeliveryPartner = require("../models/DeliveryPartner.model");
const DeliveryAssignment = require("../models/DeliveryAssignment.model");
const Coupon = require("../models/Coupon.model");
const Refund = require("../models/Refund.model");
const AdminAuditLog = require("../models/AdminAuditLog.model");
const restaurantSearchService = require("../services/restaurantSearch.service");
const recommendationService = require("../services/recommendation.service");
const surgePricingService = require("../services/surgePricing.service");
const notificationService = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * @desc    Get comprehensive Admin Dashboard Overview Analytics
 * @route   GET /api/admin/overview
 * @access  Private (admin)
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
    const [
        totalCustomers,
        totalRestaurantOwners,
        totalRestaurants,
        totalDeliveryPartners,
        allOrders,
        flaggedOrdersCount,
        pendingRefundsCount,
        recentAuditLogs,
        searchAnalytics,
        recommendationAnalytics,
        surgeSettings,
    ] = await Promise.all([
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "restaurant" }),
        Restaurant.countDocuments(),
        DeliveryPartner.countDocuments(),
        Order.find()
            .populate("user", "name email")
            .populate("restaurant", "name cuisines")
            .sort({ createdAt: -1 }),
        Order.countDocuments({ "fraudFlag.isFlagged": true }),
        Refund.countDocuments({ status: "Pending" }),
        AdminAuditLog.find().populate("admin", "name email").sort({ createdAt: -1 }).limit(15),
        restaurantSearchService.getSearchAnalytics(),
        recommendationService.getRecommendationAnalytics(),
        surgePricingService.getOrCreateSurgeSettings(),
    ]);

    const completedOrders = allOrders.filter((o) => o.status === "Delivered");
    const cancelledOrders = allOrders.filter((o) =>
        ["Cancelled", "Restaurant Rejected"].includes(o.status)
    );
    const activeOrders = allOrders.filter(
        (o) =>
            ![
                "Delivered",
                "Cancelled",
                "Restaurant Rejected",
                "Refund Initiated",
                "Refund Completed",
            ].includes(o.status)
    );

    const totalRevenue = completedOrders.reduce(
        (sum, o) => sum + Number(o.pricing?.grandTotal || 0),
        0
    );
    const averageOrderValue =
        completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

    // Revenue by cuisine breakdown
    const revenueByRestaurantMap = new Map();
    for (const ord of completedOrders) {
        const rName = ord.restaurant?.name || "Restaurant";
        revenueByRestaurantMap.set(
            rName,
            (revenueByRestaurantMap.get(rName) || 0) + Number(ord.pricing?.grandTotal || 0)
        );
    }
    const topRevenueRestaurants = Array.from(revenueByRestaurantMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

    const liveDemand = await surgePricingService.evaluateLiveDemand(surgeSettings);

    return sendSuccess(res, 200, "Admin dashboard analytics fetched", {
        metrics: {
            totalCustomers,
            totalRestaurantOwners,
            totalRestaurants,
            totalDeliveryPartners,
            totalOrders: allOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            activeOrders: activeOrders.length,
            totalRevenue,
            averageOrderValue,
            flaggedOrdersCount,
            pendingRefundsCount,
        },
        liveSurgeStatus: {
            demandLevel: liveDemand.demandLevel,
            surgeMultiplier: liveDemand.demandMultiplier,
            activeOrdersCount: liveDemand.activeOrdersCount,
            availablePartnersCount: liveDemand.availablePartnersCount,
        },
        topRevenueRestaurants,
        recentOrders: allOrders.slice(0, 12),
        recentAuditLogs,
        searchAnalytics,
        recommendationAnalytics,
    });
});

/**
 * @desc    Get all users with filtering by role & restriction status
 * @route   GET /api/admin/users
 * @access  Private (admin)
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const { role, isRestricted, q } = req.query;
    const filter = {};
    if (role && role !== "all") filter.role = role;
    if (isRestricted === "true") filter.isRestricted = true;
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { phone: { $regex: q, $options: "i" } },
        ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
    return sendSuccess(res, 200, "Users fetched", { users });
});

/**
 * @desc    Update user role or active status
 * @route   PATCH /api/admin/users/:userId
 * @access  Private (admin)
 */
const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, isActive, isRestricted, restrictionReason } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (isRestricted !== undefined) {
        user.isRestricted = Boolean(isRestricted);
        user.restrictionReason = isRestricted ? restrictionReason || "Restricted by Admin" : "";
    }

    await user.save();

    await AdminAuditLog.create({
        admin: req.user._id,
        action: "USER_UPDATED",
        targetType: "User",
        targetId: user._id,
        summary: `Updated user ${user.email} (role: ${user.role}, active: ${user.isActive})`,
    });

    return sendSuccess(res, 200, "User updated successfully", { user });
});

/**
 * @desc    Get all restaurants for Admin Management
 * @route   GET /api/admin/restaurants
 * @access  Private (admin)
 */
const getAdminRestaurants = asyncHandler(async (req, res) => {
    const restaurants = await Restaurant.find()
        .populate("owner", "name email phone")
        .sort({ createdAt: -1 });
    return sendSuccess(res, 200, "All restaurants fetched for admin", { restaurants });
});

/**
 * @desc    Get all orders for Admin Management
 * @route   GET /api/admin/orders
 * @access  Private (admin)
 */
const getAdminOrders = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = status && status !== "All" ? { status } : {};

    const orders = await Order.find(filter)
        .populate("user", "name email phone riskScore riskLevel")
        .populate("restaurant", "name address phone")
        .populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name phone" },
        })
        .sort({ createdAt: -1 })
        .limit(100);

    return sendSuccess(res, 200, "All orders fetched", { orders });
});

/**
 * @desc    Get delivery partners & assignment monitoring data
 * @route   GET /api/admin/delivery-monitoring
 * @access  Private (admin)
 */
const getDeliveryMonitoring = asyncHandler(async (req, res) => {
    const [partners, assignments, unassignedOrders] = await Promise.all([
        DeliveryPartner.find()
            .populate("user", "name email phone avatar")
            .sort({ isOnline: -1, isAvailable: -1 }),
        DeliveryAssignment.find()
            .populate({
                path: "order",
                populate: [
                    { path: "restaurant", select: "name address" },
                    { path: "user", select: "name phone" },
                ],
            })
            .populate({
                path: "deliveryPartner",
                populate: { path: "user", select: "name phone email" },
            })
            .sort({ updatedAt: -1 })
            .limit(50),
        Order.find({
            deliveryPartner: null,
            status: { $in: ["Order Placed", "Restaurant Accepted", "Food Preparing", "Ready for Pickup"] },
        })
            .populate("restaurant", "name address")
            .populate("user", "name phone"),
    ]);

    const availablePartners = partners.filter((p) => p.isOnline && p.isAvailable);
    const busyPartners = partners.filter((p) => p.isOnline && !p.isAvailable);
    const offlinePartners = partners.filter((p) => !p.isOnline);
    const failedAssignments = assignments.filter((a) =>
        ["no_partner_available", "rejected", "expired"].includes(a.status)
    );

    return sendSuccess(res, 200, "Delivery monitoring data fetched", {
        summary: {
            totalPartners: partners.length,
            availableCount: availablePartners.length,
            busyCount: busyPartners.length,
            offlineCount: offlinePartners.length,
            activeAssignmentsCount: assignments.filter((a) =>
                ["offered", "accepted", "picked_up", "out_for_delivery"].includes(a.status)
            ).length,
            failedAssignmentsCount: failedAssignments.length,
        },
        partners,
        assignments,
        unassignedOrders,
    });
});

/**
 * @desc    Get Restaurant Search Analytics (Task 2 Admin Page)
 * @route   GET /api/admin/search-analytics
 * @access  Private (admin)
 */
const getSearchAnalytics = asyncHandler(async (req, res) => {
    const analytics = await restaurantSearchService.getSearchAnalytics();
    return sendSuccess(res, 200, "Search analytics fetched", analytics);
});

/**
 * @desc    Manage Coupons (List, Create, Delete)
 * @route   GET / POST / DELETE /api/admin/coupons
 * @access  Private (admin)
 */
const getCoupons = asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Coupons fetched", { coupons });
});

const createCoupon = asyncHandler(async (req, res) => {
    const {
        code,
        title,
        description,
        discountType = "percentage",
        discountValue = 20,
        minOrderAmount = 199,
        maxDiscountAmount = 120,
        validDays = 30,
    } = req.body;

    if (!code || !title) {
        throw new ApiError(400, "Coupon code and title are required");
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase().trim(),
        title,
        description,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount),
        maxDiscountAmount: Number(maxDiscountAmount),
        validUntil: new Date(Date.now() + Number(validDays) * 24 * 60 * 60 * 1000),
    });

    await AdminAuditLog.create({
        admin: req.user._id,
        action: "COUPON_CREATED",
        targetType: "Coupon",
        targetId: coupon._id,
        summary: `Created coupon code ${coupon.code}`,
    });

    return sendSuccess(res, 201, "Coupon created successfully", { coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
    await Coupon.findByIdAndDelete(req.params.couponId);
    return sendSuccess(res, 200, "Coupon deleted", {});
});

/**
 * @desc    Get and Process Refund Requests
 * @route   GET /api/admin/refunds
 * @route   PATCH /api/admin/refunds/:refundId
 * @access  Private (admin)
 */
const getRefunds = asyncHandler(async (req, res) => {
    const refunds = await Refund.find()
        .populate("user", "name email phone riskScore")
        .populate("order", "orderNumber status pricing paymentMethod createdAt")
        .populate("processedBy", "name email")
        .sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Refund requests fetched", { refunds });
});

const processRefundRequest = asyncHandler(async (req, res) => {
    const { refundId } = req.params;
    const { status = "Processed", adminNote = "Approved and refunded to original payment source" } =
        req.body;

    const refund = await Refund.findById(refundId);
    if (!refund) {
        throw new ApiError(404, "Refund request not found");
    }

    refund.status = status;
    refund.adminNote = adminNote;
    refund.processedBy = req.user._id;
    refund.processedAt = new Date();
    if (status === "Processed" || status === "Approved") {
        refund.razorpayRefundId = `rfnd_test_${Date.now().toString().slice(-8)}`;
    }
    await refund.save();

    const order = await Order.findById(refund.order);
    if (order) {
        const prevStatus = order.status;
        if (status === "Processed" || status === "Approved") {
            order.status = "Refund Completed";
            order.paymentStatus = "Refunded";
        }
        order.statusHistory.push({
            status: order.status,
            updatedBy: req.user._id,
            updatedByRole: "admin",
            note: `Refund ${status}: ${adminNote}`,
            timestamp: new Date(),
        });
        await order.save();
        await notificationService.notifyOrderStatusChange(order, prevStatus);
    }

    await AdminAuditLog.create({
        admin: req.user._id,
        action: `REFUND_${status.toUpperCase()}`,
        targetType: "Refund",
        targetId: refund._id,
        summary: `Marked refund of ₹${refund.amount} as ${status}`,
    });

    return sendSuccess(res, 200, `Refund ${status.toLowerCase()} successfully`, { refund });
});

/**
 * @desc    Get Admin Audit Logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (admin)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
    const logs = await AdminAuditLog.find()
        .populate("admin", "name email role")
        .sort({ createdAt: -1 })
        .limit(100);

    return sendSuccess(res, 200, "Admin audit logs fetched", { logs });
});

module.exports = {
    getDashboardOverview,
    getAllUsers,
    updateUserByAdmin,
    getAdminRestaurants,
    getAdminOrders,
    getDeliveryMonitoring,
    getSearchAnalytics,
    getCoupons,
    createCoupon,
    deleteCoupon,
    getRefunds,
    processRefundRequest,
    getAuditLogs,
};

