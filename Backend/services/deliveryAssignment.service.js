const DeliveryPartner = require("../models/DeliveryPartner.model");
const DeliveryAssignment = require("../models/DeliveryAssignment.model");
const Order = require("../models/Order.model");
const Restaurant = require("../models/Restaurant.model");
const AdminAuditLog = require("../models/AdminAuditLog.model");
const notificationService = require("./notification.service");
const { calculateGeoJsonDistanceKm, estimateTravelMinutes } = require("../utils/calculateDistance");

/**
 * TASK 4: Smart Delivery Partner Assignment System
 *
 * Features:
 * - MongoDB 2dsphere geospatial $near query to locate nearby partners
 * - Composite candidate scoring (distance, current workload, rating, activity status)
 * - Atomic MongoDB findOneAndUpdate locking to prevent duplicate/race assignments
 * - Partner accept/reject workflow with automatic fallback reassignment
 * - Admin manual reassignment support
 */
class DeliveryAssignmentService {
    /**
     * Finds eligible nearby delivery partners using MongoDB 2dsphere $near geospatial query
     */
    async findEligiblePartnersNear(coordinates = [77.5946, 12.9716], excludedPartnerIds = [], maxDistanceMeters = 25000) {
        const [lng, lat] =
            Array.isArray(coordinates) && coordinates.length === 2
                ? coordinates
                : [77.5946, 12.9716];

        let partners = [];
        try {
            partners = await DeliveryPartner.find({
                isOnline: true,
                isAvailable: true,
                _id: { $nin: excludedPartnerIds },
                $expr: { $lt: ["$activeOrdersCount", "$maxConcurrentOrders"] },
                currentLocation: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [Number(lng), Number(lat)],
                        },
                        $maxDistance: maxDistanceMeters,
                    },
                },
            })
                .populate("user", "name email phone avatar")
                .limit(10);
        } catch {
            // Fallback if $near radius has no match within 25km: fetch online available partners
            partners = await DeliveryPartner.find({
                isOnline: true,
                isAvailable: true,
                _id: { $nin: excludedPartnerIds },
                $expr: { $lt: ["$activeOrdersCount", "$maxConcurrentOrders"] },
            })
                .populate("user", "name email phone avatar")
                .limit(10);
        }

        // Score and sort candidates by proximity, workload, and rating
        const scored = partners.map((partner) => {
            const distKm = calculateGeoJsonDistanceKm(
                partner.currentLocation?.coordinates,
                [Number(lng), Number(lat)]
            );
            // Lower score is better: distance + workload penalty (3km equivalent per active order) - rating bonus
            const compositeScore =
                distKm + (partner.activeOrdersCount || 0) * 3.0 - (partner.rating || 4.5) * 0.4;

            return {
                partner,
                distanceToRestaurantKm: distKm,
                compositeScore: Number(compositeScore.toFixed(2)),
            };
        });

        scored.sort((a, b) => a.compositeScore - b.compositeScore);
        return scored;
    }

    /**
     * Automatically assigns the best available delivery partner to an order using atomic MongoDB locking
     */
    async autoAssignDeliveryPartner(orderId) {
        const order = await Order.findById(orderId).populate("restaurant");
        if (!order) return { assigned: false, reason: "Order not found" };

        const existingAssignment = await DeliveryAssignment.findOne({ order: order._id });
        if (
            existingAssignment &&
            existingAssignment.deliveryPartner &&
            ["offered", "accepted", "picked_up", "out_for_delivery"].includes(
                existingAssignment.status
            )
        ) {
            return {
                assigned: true,
                alreadyAssigned: true,
                assignment: existingAssignment,
            };
        }

        const excludedIds = existingAssignment
            ? (existingAssignment.rejectedBy || []).map((r) => r.partner)
            : [];

        const restaurantCoords = order.restaurant?.location?.coordinates || [77.5946, 12.9716];
        const customerCoords = order.deliveryAddress?.location?.coordinates || [77.605, 12.975];
        const deliveryDistanceKm = calculateGeoJsonDistanceKm(restaurantCoords, customerCoords);

        const candidates = await this.findEligiblePartnersNear(restaurantCoords, excludedIds);

        let lockedPartner = null;
        let selectedCandidateMeta = null;

        // Iterate through ranked candidates and acquire an atomic lock on the first available partner
        for (const candidate of candidates) {
            const updatedPartner = await DeliveryPartner.findOneAndUpdate(
                {
                    _id: candidate.partner._id,
                    isOnline: true,
                    isAvailable: true,
                    $expr: { $lt: ["$activeOrdersCount", "$maxConcurrentOrders"] },
                },
                {
                    $inc: { activeOrdersCount: 1 },
                    $addToSet: { activeOrderIds: order._id },
                    $set: { activityStatus: "Assigned", lastPingAt: new Date() },
                },
                { new: true }
            ).populate("user", "name email phone avatar");

            if (updatedPartner) {
                // If partner reached max concurrent orders, mark isAvailable = false
                if (updatedPartner.activeOrdersCount >= updatedPartner.maxConcurrentOrders) {
                    updatedPartner.isAvailable = false;
                    await updatedPartner.save();
                }
                lockedPartner = updatedPartner;
                selectedCandidateMeta = candidate;
                break;
            }
        }

        const partnerEarning = Math.max(
            35,
            Math.round((order.pricing?.deliveryFee || 40) * 0.85)
        );

        // Case where no delivery partner is currently available
        if (!lockedPartner) {
            const unassignedRecord = await DeliveryAssignment.findOneAndUpdate(
                { order: order._id },
                {
                    order: order._id,
                    restaurant: order.restaurant?._id || order.restaurant,
                    deliveryPartner: null,
                    status: "no_partner_available",
                    pickupLocation: {
                        address: `${order.restaurant?.name || "Restaurant"}, ${order.restaurant?.address?.area || ""}`,
                        coordinates: restaurantCoords,
                    },
                    dropLocation: {
                        address: `${order.deliveryAddress?.street || ""}, ${order.deliveryAddress?.city || ""}`,
                        coordinates: customerCoords,
                    },
                    deliveryDistanceKm,
                    partnerEarning,
                },
                { upsert: true, new: true }
            );

            return {
                assigned: false,
                reason: "No eligible delivery partner currently available nearby",
                assignment: unassignedRecord,
            };
        }

        const estMinutes = estimateTravelMinutes(
            selectedCandidateMeta.distanceToRestaurantKm + deliveryDistanceKm,
            10
        );

        const assignment = await DeliveryAssignment.findOneAndUpdate(
            { order: order._id },
            {
                $set: {
                    restaurant: order.restaurant?._id || order.restaurant,
                    deliveryPartner: lockedPartner._id,
                    status: "accepted",
                    pickupLocation: {
                        address: `${order.restaurant?.name || "Restaurant"}, ${order.restaurant?.address?.area || ""}`,
                        coordinates: restaurantCoords,
                    },
                    dropLocation: {
                        address: `${order.deliveryAddress?.street || ""}, ${order.deliveryAddress?.city || ""}`,
                        coordinates: customerCoords,
                    },
                    distanceToRestaurantKm: selectedCandidateMeta.distanceToRestaurantKm,
                    deliveryDistanceKm,
                    estimatedDurationMinutes: estMinutes,
                    partnerEarning,
                    assignedAt: new Date(),
                    acceptedAt: new Date(),
                },
                $push: {
                    assignmentHistory: {
                        partner: lockedPartner._id,
                        action: "assigned",
                        timestamp: new Date(),
                        note: `Auto-assigned nearest partner (${selectedCandidateMeta.distanceToRestaurantKm} km away)`,
                    },
                },
            },
            { upsert: true, new: true }
        ).populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name email phone avatar" },
        });

        // Update Order with assigned delivery partner
        const previousStatus = order.status;
        order.deliveryPartner = lockedPartner._id;
        if (["Restaurant Accepted", "Order Placed"].includes(order.status)) {
            order.status = "Delivery Partner Assigned";
            order.statusHistory.push({
                status: "Delivery Partner Assigned",
                updatedBy: lockedPartner.user?._id || null,
                updatedByRole: "system",
                note: `Delivery partner ${lockedPartner.user?.name || ""} assigned (${selectedCandidateMeta.distanceToRestaurantKm} km from restaurant)`,
                timestamp: new Date(),
            });
        }
        await order.save();

        await notificationService.notifyDeliveryPartnerNewAssignment(
            lockedPartner,
            order,
            assignment
        );
        await notificationService.notifyOrderStatusChange(order, previousStatus);

        return {
            assigned: true,
            partner: lockedPartner,
            assignment,
        };
    }

    /**
     * Delivery Partner accepts or rejects an assignment
     */
    async respondToAssignment({ assignmentId, partnerUserId, action, reason = "Unable to fulfill" }) {
        const partner = await DeliveryPartner.findOne({ user: partnerUserId });
        if (!partner) return null;

        const assignment = await DeliveryAssignment.findById(assignmentId);
        if (!assignment) return null;

        if (action === "accept") {
            assignment.status = "accepted";
            assignment.acceptedAt = new Date();
            assignment.assignmentHistory.push({
                partner: partner._id,
                action: "accepted",
                timestamp: new Date(),
                note: "Partner confirmed pickup assignment",
            });
            await assignment.save();
            return { action: "accepted", assignment };
        }

        // Rejection path: release current partner lock and automatically reassign to next best partner
        assignment.status = "rejected";
        assignment.rejectedBy.push({
            partner: partner._id,
            reason,
            rejectedAt: new Date(),
        });
        assignment.assignmentHistory.push({
            partner: partner._id,
            action: "rejected",
            timestamp: new Date(),
            note: `Partner rejected: ${reason}`,
        });
        assignment.deliveryPartner = null;
        await assignment.save();

        // Decrement activeOrdersCount on rejecting partner
        partner.activeOrdersCount = Math.max(0, (partner.activeOrdersCount || 1) - 1);
        partner.activeOrderIds = (partner.activeOrderIds || []).filter(
            (id) => id.toString() !== assignment.order.toString()
        );
        partner.isAvailable = partner. isOnline;
        partner.activityStatus = partner.activeOrdersCount > 0 ? "Delivering" : "Idle";
        partner.totalRejections = (partner.totalRejections || 0) + 1;
        await partner.save();

        // Trigger automatic reassignment excluding partners who rejected
        const reassignmentResult = await this.autoAssignDeliveryPartner(assignment.order);
        return {
            action: "rejected_and_reassigned",
            reassignmentResult,
        };
    }

    /**
     * Admin manual reassignment of an order to a specific or next best delivery partner
     */
    async adminReassignOrder({ orderId, targetPartnerId = null, adminId, reason = "Admin manual reassignment" }) {
        const order = await Order.findById(orderId).populate("restaurant");
        if (!order) return null;

        const existingAssignment = await DeliveryAssignment.findOne({ order: order._id });

        // Release old partner if one was assigned
        if (existingAssignment?.deliveryPartner) {
            await DeliveryPartner.findByIdAndUpdate(existingAssignment.deliveryPartner, {
                $inc: { activeOrdersCount: -1 },
                $pull: { activeOrderIds: order._id },
                $set: { isAvailable: true, activityStatus: "Idle" },
            });
        }

        let newPartner = null;
        if (targetPartnerId) {
            newPartner = await DeliveryPartner.findByIdAndUpdate(
                targetPartnerId,
                {
                    $inc: { activeOrdersCount: 1 },
                    $addToSet: { activeOrderIds: order._id },
                    $set: { activityStatus: "Assigned", isOnline: true },
                },
                { new: true }
            ).populate("user", "name email phone avatar");
        } else {
            // Auto-select next best partner excluding previous partner
            if (existingAssignment?.deliveryPartner) {
                existingAssignment.rejectedBy.push({
                    partner: existingAssignment.deliveryPartner,
                    reason: "Admin reassigned away",
                    rejectedAt: new Date(),
                });
                existingAssignment.deliveryPartner = null;
                await existingAssignment.save();
            }
            const autoRes = await this.autoAssignDeliveryPartner(order._id);
            return autoRes;
        }

        if (!newPartner) return { assigned: false, reason: "Target delivery partner not found" };

        const restCoords = order.restaurant?.location?.coordinates || [77.5946, 12.9716];
        const custCoords = order.deliveryAddress?.location?.coordinates || [77.605, 12.975];
        const distToRest = calculateGeoJsonDistanceKm(
            newPartner.currentLocation?.coordinates,
            restCoords
        );

        const updatedAssignment = await DeliveryAssignment.findOneAndUpdate(
            { order: order._id },
            {
                $set: {
                    restaurant: order.restaurant?._id || order.restaurant,
                    deliveryPartner: newPartner._id,
                    status: "accepted",
                    distanceToRestaurantKm: distToRest,
                    assignedAt: new Date(),
                    acceptedAt: new Date(),
                },
                $push: {
                    assignmentHistory: {
                        partner: newPartner._id,
                        action: "admin_reassigned",
                        timestamp: new Date(),
                        note: reason,
                    },
                },
            },
            { upsert: true, new: true }
        ).populate({
            path: "deliveryPartner",
            populate: { path: "user", select: "name email phone avatar" },
        });

        order.deliveryPartner = newPartner._id;
        order.statusHistory.push({
            status: order.status,
            updatedBy: adminId,
            updatedByRole: "admin",
            note: `Delivery partner reassigned to ${newPartner.user?.name || "Partner"}: ${reason}`,
            timestamp: new Date(),
        });
        await order.save();

        if (adminId) {
            await AdminAuditLog.create({
                admin: adminId,
                action: "DELIVERY_REASSIGNED",
                targetType: "Order",
                targetId: order._id,
                summary: `Reassigned order #${order.orderNumber} to partner ${newPartner.user?.name}`,
                details: { targetPartnerId: newPartner._id, reason },
            });
        }

        await notificationService.notifyDeliveryPartnerNewAssignment(
            newPartner,
            order,
            updatedAssignment
        );

        return {
            assigned: true,
            partner: newPartner,
            assignment: updatedAssignment,
        };
    }
}

module.exports = new DeliveryAssignmentService();

