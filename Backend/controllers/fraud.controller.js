const Order = require("../models/Order.model");
const User = require("../models/User.model");
const FraudRecord = require("../models/FraudRecord.model");
const FraudActivity = require("../models/FraudActivity.model");
const fraudDetectionService = require("../services/fraudDetection.service");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 1 Admin Endpoint: Get all flagged/suspicious orders and fraud summary metrics
 * @route   GET /api/admin/fraud/orders
 * @access  Private (admin)
 */
const getFlaggedOrders = asyncHandler(async (req, res) => {
    const { riskLevel, reviewStatus } = req.query;
    const filter = {
        $or: [{ "fraudFlag.isFlagged": true }, { "fraudFlag.riskScore": { $gt: 0 } }],
    };

    if (riskLevel && riskLevel !== "All") {
        filter["fraudFlag.riskLevel"] = riskLevel;
    }
    if (reviewStatus && reviewStatus !== "All") {
        filter["fraudFlag.reviewStatus"] = reviewStatus;
    }

    const [orders, restrictedUsers, recentActivities] = await Promise.all([
        Order.find(filter)
            .populate("user", "name email phone riskScore riskLevel isRestricted restrictionReason")
            .populate("restaurant", "name address")
            .sort({ "fraudFlag.riskScore": -1, createdAt: -1 })
            .limit(50),
        User.find({ $or: [{ isRestricted: true }, { riskScore: { $gte: 40 } }] })
            .select("name email phone role riskScore riskLevel isRestricted restrictionReason restrictedUntil failedTransactionCount")
            .sort({ riskScore: -1 }),
        FraudActivity.find()
            .populate("user", "name email")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 })
            .limit(30),
    ]);

    const highRiskCount = orders.filter((o) => o.fraudFlag?.riskLevel === "High").length;
    const mediumRiskCount = orders.filter((o) => o.fraudFlag?.riskLevel === "Medium").length;
    const pendingReviewCount = orders.filter(
        (o) => o.fraudFlag?.reviewStatus === "pending_review"
    ).length;

    return sendSuccess(res, 200, "Fraud detection orders and analytics fetched", {
        orders,
        restrictedUsers,
        recentActivities,
        summary: {
            totalFlaggedOrders: orders.length,
            highRiskCount,
            mediumRiskCount,
            pendingReviewCount,
            restrictedUsersCount: restrictedUsers.filter((u) => u.isRestricted).length,
        },
    });
});

/**
 * TASK 1 Admin Endpoint: Get detailed fraud analysis for a specific order
 * @route   GET /api/admin/fraud/orders/:orderId
 * @access  Private (admin)
 */
const getFraudOrderDetail = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const order = await Order.findById(orderId)
        .populate("user", "name email phone riskScore riskLevel isRestricted restrictionReason failedTransactionCount createdAt")
        .populate("restaurant", "name address phone");

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    const [fraudRecord, userActivities] = await Promise.all([
        FraudRecord.findOne({ order: order._id }).populate("reviewedBy", "name email"),
        FraudActivity.find({ user: order.user?._id || order.user })
            .sort({ createdAt: -1 })
            .limit(20),
    ]);

    return sendSuccess(res, 200, "Fraud order detail fetched", {
        order,
        fraudRecord,
        userActivities,
    });
});

/**
 * TASK 1 Admin Endpoint: Approve a flagged order
 * @route   PATCH /api/admin/fraud/orders/:orderId/approve
 * @access  Private (admin)
 */
const approveFraudOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { note = "Verified legitimate customer order" } = req.body || {};

    const order = await fraudDetectionService.approveFlaggedOrder({
        orderId,
        adminId: req.user._id,
        note,
        ipAddress: req.ip,
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return sendSuccess(res, 200, "Suspicious order approved by administrator", { order });
});

/**
 * TASK 1 Admin Endpoint: Reject a suspicious order
 * @route   PATCH /api/admin/fraud/orders/:orderId/reject
 * @access  Private (admin)
 */
const rejectFraudOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { note = "Rejected due to high fraud risk score" } = req.body || {};

    const order = await fraudDetectionService.rejectFlaggedOrder({
        orderId,
        adminId: req.user._id,
        note,
        ipAddress: req.ip,
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return sendSuccess(res, 200, "Suspicious order rejected and cancelled", { order });
});

/**
 * TASK 1 Admin Endpoint: Temporarily restrict or unrestrict a customer account
 * @route   PATCH /api/admin/fraud/users/:userId/restrict
 * @access  Private (admin)
 */
const restrictUserAccount = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const {
        isRestricted = true,
        reason = "Suspicious order pattern & high risk score",
        durationHours = 48,
    } = req.body || {};

    const updatedUser = await fraudDetectionService.toggleUserRestriction({
        userId,
        adminId: req.user._id,
        isRestricted,
        reason,
        durationHours,
        ipAddress: req.ip,
    });

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return sendSuccess(
        res,
        200,
        updatedUser.isRestricted
            ? `User account ${updatedUser.email} restricted`
            : `User account ${updatedUser.email} restriction removed`,
        { user: updatedUser }
    );
});

module.exports = {
    getFlaggedOrders,
    getFraudOrderDetail,
    approveFraudOrder,
    rejectFraudOrder,
    restrictUserAccount,
};

