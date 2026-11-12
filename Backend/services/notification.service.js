const Notification = require("../models/Notification.model");
const {
    emitToUser,
    emitToOrderRoom,
    emitToRestaurant,
    emitToDeliveryPartner,
    emitToAdmins,
} = require("../sockets/socket");

/**
 * Task 5: Real-Time Order Status & Notification Service
 * Persists notifications in MongoDB and broadcasts instant Socket.IO events.
 */
class NotificationService {
    async createNotification({
        recipient,
        recipientRole = "customer",
        title,
        message,
        type = "ORDER_STATUS",
        order = null,
        metadata = {},
    }) {
        if (!recipient) return null;

        const notification = await Notification.create({
            recipient,
            recipientRole,
            title,
            message,
            type,
            order,
            metadata,
        });

        const unreadCount = await Notification.countDocuments({
            recipient,
            isRead: false,
        });

        emitToUser(recipient, "notification:new", {
            notification,
            unreadCount,
        });

        return notification;
    }

    async notifyOrderStatusChange(order, previousStatus = "") {
        const statusMessages = {
            "Order Placed": `Your order #${order.orderNumber} has been placed successfully!`,
            "Restaurant Accepted": `Great news! The restaurant has accepted your order #${order.orderNumber}.`,
            "Food Preparing": `Chef is now preparing your delicious meal for order #${order.orderNumber}.`,
            "Ready for Pickup": `Your order #${order.orderNumber} is packed and ready for pickup.`,
            "Delivery Partner Assigned": `A delivery partner has been assigned to your order #${order.orderNumber}.`,
            "Picked Up": `Your order #${order.orderNumber} has been picked up from the restaurant.`,
            "Out for Delivery": `Your order #${order.orderNumber} is on the way! Track live on the map.`,
            "Delivered": `Order #${order.orderNumber} delivered! Enjoy your meal and rate your experience.`,
            "Restaurant Rejected": `Sorry, the restaurant could not accept order #${order.orderNumber}. Any payment will be refunded.`,
            "Cancelled": `Order #${order.orderNumber} has been cancelled.`,
            "Refund Initiated": `Refund of ₹${order.pricing?.grandTotal || 0} has been initiated for order #${order.orderNumber}.`,
            "Refund Completed": `Refund of ₹${order.pricing?.grandTotal || 0} for order #${order.orderNumber} has been credited.`,
        };

        const message =
            statusMessages[order.status] ||
            `Order #${order.orderNumber} status updated to ${order.status}.`;

        // 1. Save & emit to Customer
        await this.createNotification({
            recipient: order.user?._id || order.user,
            recipientRole: "customer",
            title: `Order ${order.status}`,
            message,
            type: order.status.includes("Refund") ? "REFUND" : "ORDER_STATUS",
            order: order._id,
            metadata: {
                orderNumber: order.orderNumber,
                status: order.status,
                previousStatus,
            },
        });

        // 2. Broadcast to order room for live tracking page
        emitToOrderRoom(order._id, "order:status_updated", {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            previousStatus,
            statusHistory: order.statusHistory,
            deliveryPartner: order.deliveryPartner,
            updatedAt: new Date().toISOString(),
        });

        // 3. Broadcast to restaurant room
        if (order.restaurant) {
            const restId = order.restaurant._id || order.restaurant;
            emitToRestaurant(restId, "restaurant:order_updated", {
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
            });
        }
    }

    async notifyRestaurantNewOrder(order, restaurantDoc) {
        if (!restaurantDoc?.owner) return;

        await this.createNotification({
            recipient: restaurantDoc.owner,
            recipientRole: "restaurant",
            title: `New Order #${order.orderNumber}`,
            message: `New order worth ₹${order.pricing?.grandTotal} received (${order.items?.length || 1} items).`,
            type: "NEW_ORDER",
            order: order._id,
            metadata: {
                orderNumber: order.orderNumber,
                restaurantId: restaurantDoc._id,
                grandTotal: order.pricing?.grandTotal,
            },
        });

        emitToRestaurant(restaurantDoc._id, "restaurant:new_order", {
            order,
        });
    }

    async notifyDeliveryPartnerNewAssignment(partnerDoc, order, assignment) {
        if (!partnerDoc?.user) return;

        await this.createNotification({
            recipient: partnerDoc.user._id || partnerDoc.user,
            recipientRole: "delivery",
            title: `New Delivery Assignment #${order.orderNumber}`,
            message: `Pickup order #${order.orderNumber} (${assignment.distanceToRestaurantKm} km away). Est. Earning: ₹${assignment.partnerEarning}.`,
            type: "DELIVERY_ASSIGNMENT",
            order: order._id,
            metadata: {
                assignmentId: assignment._id,
                orderId: order._id,
                orderNumber: order.orderNumber,
                earning: assignment.partnerEarning,
            },
        });

        emitToDeliveryPartner(partnerDoc._id, "delivery:new_assignment", {
            assignment,
            order,
        });
    }

    async notifyAdminsFraudAlert(order, fraudEvaluation) {
        emitToAdmins("admin:fraud_alert", {
            orderId: order._id,
            orderNumber: order.orderNumber,
            userId: order.user,
            riskScore: fraudEvaluation.riskScore,
            riskLevel: fraudEvaluation.riskLevel,
            reasons: fraudEvaluation.reasons,
            detectedAt: new Date().toISOString(),
        });
    }
}

module.exports = new NotificationService();

