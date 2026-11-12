const DeliveryPartner = require("../models/DeliveryPartner.model");
const DeliveryAssignment = require("../models/DeliveryAssignment.model");
const Order = require("../models/Order.model");
const deliveryAssignmentService = require("../services/deliveryAssignment.service");
const asyncHandler = require("../utils/asyncHandler");
const { ApiError, sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 4 Endpoint: Set delivery partner availability & live GPS coordinates
 * @route   POST /api/delivery/set-status
 * @access  Private (delivery, admin)
 */
const setPartnerStatus = asyncHandler(async (req, res) => {
    const { isOnline, isAvailable, lat, lng, vehicleType, vehicleNumber, zone } = req.body;

    let partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
        partner = new DeliveryPartner({
            user: req.user._id,
            currentLocation: { type: "Point", coordinates: [77.6197, 12.9716] },
        });
    }

    if (isOnline !== undefined) {
        partner.isOnline = Boolean(isOnline);
        if (!partner.isOnline) {
            partner.isAvailable = false;
            partner.activityStatus = "Offline";
        } else if (partner.activeOrdersCount === 0) {
            partner.isAvailable = true;
            partner.activityStatus = "Idle";
        }
    }

    if (isAvailable !== undefined && partner.isOnline) {
        partner.isAvailable = Boolean(isAvailable);
        partner.activityStatus = partner.isAvailable ? "Idle" : "Assigned";
    }

    if (lat !== undefined && lng !== undefined) {
        partner.currentLocation = {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
        };
    }

    if (vehicleType) partner.vehicleType = vehicleType;
    if (vehicleNumber) partner.vehicleNumber = vehicleNumber;
    if (zone) partner.zone = zone;
    partner.lastPingAt = new Date();

    await partner.save();
    const populated = await DeliveryPartner.findById(partner._id).populate(
        "user",
        "name email phone avatar"
    );

    return sendSuccess(res, 200, "Delivery partner status and location updated", {
        partner: populated,
    });
});

/**
 * TASK 4 Endpoint: Find available nearby delivery partners using MongoDB 2dsphere $near query
 * @route   GET /api/delivery/available
 * @access  Private (admin, restaurant, delivery)
 */
const getAvailablePartners = asyncHandler(async (req, res) => {
    const { lat = 12.9716, lng = 77.5946, maxDistanceKm = 25 } = req.query;

    const candidates = await deliveryAssignmentService.findEligiblePartnersNear(
        [Number(lng), Number(lat)],
        [],
        Number(maxDistanceKm) * 1000
    );

    const allPartners = await DeliveryPartner.find()
        .populate("user", "name email phone avatar")
        .sort({ isOnline: -1, isAvailable: -1 });

    return sendSuccess(res, 200, "Available delivery partners fetched", {
        nearbyEligiblePartners: candidates,
        allPartners,
    });
});

/**
 * TASK 4 Endpoint: Get delivery assignments (for logged-in partner or all assignments for admin)
 * @route   GET /api/delivery/assignments
 * @access  Private (delivery, admin)
 */
const getDeliveryAssignments = asyncHandler(async (req, res) => {
    let filter = {};
    let partner = null;

    if (req.user.role === "delivery") {
        partner = await DeliveryPartner.findOne({ user: req.user._id }).populate(
            "user",
            "name email phone avatar"
        );
        if (!partner) {
            partner = await DeliveryPartner.create({
                user: req.user._id,
                currentLocation: { type: "Point", coordinates: [77.6197, 12.9716] },
            });
        }
        filter.deliveryPartner = partner._id;
    }

    const assignments = await DeliveryAssignment.find(filter)
        .populate({
            path: "order",
            populate: [
                { path: "restaurant", select: "name address phone location bannerImage" },
                { path: "user", select: "name phone email" },
            ],
        })
        .populate("restaurant", "name address phone location")
        .populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name email phone avatar" },
        })
        .sort({ createdAt: -1 })
        .limit(50);

    return sendSuccess(res, 200, "Delivery assignments fetched", {
        partner,
        assignments,
    });
});

/**
 * TASK 4 Endpoint: Delivery partner accepts or rejects an assignment
 * @route   POST /api/delivery/assignments/:assignmentId/respond
 * @access  Private (delivery, admin)
 */
const respondToAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const { action = "accept", reason = "Distance too far" } = req.body;

    if (!["accept", "reject"].includes(action)) {
        throw new ApiError(400, "Action must be either 'accept' or 'reject'");
    }

    const result = await deliveryAssignmentService.respondToAssignment({
        assignmentId,
        partnerUserId: req.user._id,
        action,
        reason,
    });

    if (!result) {
        throw new ApiError(404, "Delivery assignment or partner profile not found");
    }

    return sendSuccess(
        res,
        200,
        action === "accept"
            ? "Delivery assignment accepted"
            : "Assignment rejected and automatically reassigned",
        result
    );
});

/**
 * TASK 4 Admin Endpoint: Manually reassign an order to another delivery partner
 * @route   POST /api/admin/delivery/reassign/:orderId
 * @access  Private (admin)
 */
const adminReassignOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { targetPartnerId = null, reason = "Admin manual reassignment" } = req.body || {};

    const result = await deliveryAssignmentService.adminReassignOrder({
        orderId,
        targetPartnerId,
        adminId: req.user._id,
        reason,
    });

    if (!result) {
        throw new ApiError(404, "Order not found for reassignment");
    }

    return sendSuccess(res, 200, "Order delivery partner reassigned successfully", result);
});

module.exports = {
    setPartnerStatus,
    getAvailablePartners,
    getDeliveryAssignments,
    respondToAssignment,
    adminReassignOrder,
};

