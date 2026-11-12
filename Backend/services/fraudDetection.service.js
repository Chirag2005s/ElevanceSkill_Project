const Order = require("../models/Order.model");
const User = require("../models/User.model");
const Coupon = require("../models/Coupon.model");
const Refund = require("../models/Refund.model");
const Payment = require("../models/Payment.model");
const FraudActivity = require("../models/FraudActivity.model");
const FraudRecord = require("../models/FraudRecord.model");
const AdminAuditLog = require("../models/AdminAuditLog.model");
const notificationService = require("./notification.service");

/**
 * TASK 1: Fraud Detection and Order Validation System
 *
 * Risk Rules:
 * - Excessive orders in a short time (>= 2 previous orders within 15 minutes): +40
 * - More than 3 cancellations per day (> 3 cancelled orders in 24h): +20
 * - More than 5 coupon uses per day (> 5 coupon redemptions in 24h): +30
 * - More than 3 refund requests (> 3 refund requests in last 7 days): +20
 * - Repeated failed transactions (>= 3 failed payments in 24h): +25
 * - Suspicious order pattern (High-value COD order > ₹2500): +15
 *
 * Risk Classification:
 * - 0–49: Low Risk
 * - 50–70: Medium Risk
 * - Above 70: High Risk
 */
class FraudDetectionService {
    classifyRiskLevel(score) {
        if (score > 70) return "High";
        if (score >= 50) return "Medium";
        return "Low";
    }

    /**
     * Evaluates customer fraud risk before/during order creation
     */
    async evaluateOrderFraudRisk({ userId, couponCode = "", grandTotal = 0, paymentMethod = "ONLINE" }) {
        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            recentOrdersShortWindow,
            cancellationsToday,
            couponOrdersToday,
            refundRequestsRecent,
            failedPaymentsToday,
            userDoc,
        ] = await Promise.all([
            Order.countDocuments({
                user: userId,
                createdAt: { $gte: fifteenMinsAgo },
            }),
            Order.countDocuments({
                user: userId,
                status: "Cancelled",
                cancelledAt: { $gte: twentyFourHoursAgo },
            }),
            Order.countDocuments({
                user: userId,
                "pricing.couponCode": { $ne: "" },
                createdAt: { $gte: twentyFourHoursAgo },
            }),
            Refund.countDocuments({
                user: userId,
                createdAt: { $gte: sevenDaysAgo },
            }),
            Payment.countDocuments({
                user: userId,
                status: "failed",
                createdAt: { $gte: twentyFourHoursAgo },
            }),
            User.findById(userId).select("failedTransactionCount riskScore"),
        ]);

        let riskScore = 0;
        const reasons = [];
        const triggeredRules = [];

        // Rule 1: Excessive orders in a short time (+40)
        // If customer already placed >= 2 orders in the last 15 mins (making this the 3rd+ rapid order)
        if (recentOrdersShortWindow >= 2) {
            riskScore += 40;
            const reason = `Excessive orders in a short time (${recentOrdersShortWindow + 1} orders within 15 minutes)`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "EXCESSIVE_ORDERS_SHORT_TIME",
                description: reason,
                scoreAdded: 40,
            });
        }

        // Rule 2: More than 3 cancellations per day (+20)
        if (cancellationsToday > 3) {
            riskScore += 20;
            const reason = `More than 3 order cancellations in 24 hours (${cancellationsToday} cancellations)`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "EXCESSIVE_CANCELLATIONS",
                description: reason,
                scoreAdded: 20,
            });
        }

        // Rule 3: More than 5 coupon uses per day (+30)
        const effectiveCouponCount = couponCode ? couponOrdersToday + 1 : couponOrdersToday;
        if (effectiveCouponCount > 5) {
            riskScore += 30;
            const reason = `Abnormal coupon usage (${effectiveCouponCount} coupon uses within 24 hours)`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "ABNORMAL_COUPON_USAGE",
                description: reason,
                scoreAdded: 30,
            });
        }

        // Rule 4: More than 3 refund requests (+20)
        if (refundRequestsRecent > 3) {
            riskScore += 20;
            const reason = `Excessive refund requests (${refundRequestsRecent} refund requests)`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "EXCESSIVE_REFUND_REQUESTS",
                description: reason,
                scoreAdded: 20,
            });
        }

        // Rule 5: Repeated failed transactions (+25)
        const totalFailedTx = Math.max(failedPaymentsToday, userDoc?.failedTransactionCount || 0);
        if (totalFailedTx >= 3) {
            riskScore += 25;
            const reason = `Repeated failed transactions (${totalFailedTx} failed payment attempts)`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "REPEATED_FAILED_TRANSACTIONS",
                description: reason,
                scoreAdded: 25,
            });
        }

        // Rule 6: Suspicious order pattern (+15)
        if (paymentMethod === "COD" && grandTotal >= 2500) {
            riskScore += 15;
            const reason = `Suspicious high-value Cash-on-Delivery order (₹${grandTotal})`;
            reasons.push(reason);
            triggeredRules.push({
                ruleCode: "SUSPICIOUS_ORDER_PATTERN",
                description: reason,
                scoreAdded: 15,
            });
        }

        const riskLevel = this.classifyRiskLevel(riskScore);
        const isFlagged = riskScore >= 50;

        return {
            riskScore,
            riskLevel,
            isFlagged,
            reasons,
            triggeredRules,
            reviewStatus: isFlagged ? "pending_review" : "not_required",
        };
    }

    /**
     * Persists FraudRecord, FraudActivity logs, and updates User risk profile after order creation
     */
    async recordOrderFraudEvaluation(order, evaluation) {
        const userId = order.user?._id || order.user;

        // Log individual FraudActivity entries for each triggered rule
        if (evaluation.triggeredRules.length > 0) {
            const activities = evaluation.triggeredRules.map((rule) => ({
                user: userId,
                order: order._id,
                activityType: rule.ruleCode,
                pointsAdded: rule.scoreAdded,
                reason: rule.description,
                metadata: {
                    orderNumber: order.orderNumber,
                    grandTotal: order.pricing?.grandTotal,
                },
            }));
            await FraudActivity.insertMany(activities);
        }

        // Create FraudRecord if flagged or if any rule triggered
        if (evaluation.isFlagged || evaluation.riskScore > 0) {
            await FraudRecord.findOneAndUpdate(
                { order: order._id },
                {
                    order: order._id,
                    user: userId,
                    riskScore: evaluation.riskScore,
                    riskLevel: evaluation.riskLevel,
                    reasons: evaluation.reasons,
                    triggeredRules: evaluation.triggeredRules,
                    status: evaluation.isFlagged ? "pending_review" : "clean",
                },
                { upsert: true, new: true }
            );
        }

        // Update User's current riskScore and riskLevel
        await User.findByIdAndUpdate(userId, {
            riskScore: evaluation.riskScore,
            riskLevel: evaluation.riskLevel,
        });

        // Notify admins in real-time if order is Medium or High risk
        if (evaluation.isFlagged) {
            await notificationService.notifyAdminsFraudAlert(order, evaluation);
        }
    }

    /**
     * Re-evaluates customer risk upon order cancellation or refund request
     */
    async recordCancellationOrRefundActivity(userId, orderId, type = "CANCELLATION") {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (type === "CANCELLATION") {
            const cancellationsToday = await Order.countDocuments({
                user: userId,
                status: "Cancelled",
                cancelledAt: { $gte: twentyFourHoursAgo },
            });

            if (cancellationsToday > 3) {
                await FraudActivity.create({
                    user: userId,
                    order: orderId,
                    activityType: "EXCESSIVE_CANCELLATIONS",
                    pointsAdded: 20,
                    reason: `Customer exceeded 3 cancellations in 24 hours (${cancellationsToday} total)`,
                });

                const user = await User.findById(userId);
                if (user) {
                    user.riskScore = Math.max(user.riskScore, 20) + 10;
                    user.riskLevel = this.classifyRiskLevel(user.riskScore);
                    await user.save();
                }
            }
        }
    }

    /**
     * Admin Action: Approve a flagged order
     */
    async approveFlaggedOrder({ orderId, adminId, note = "Verified and approved by administrator", ipAddress = "127.0.0.1" }) {
        const order = await Order.findById(orderId);
        if (!order) return null;

        order.fraudFlag.reviewStatus = "approved";
        order.fraudFlag.reviewedBy = adminId;
        order.fraudFlag.reviewedAt = new Date();
        order.statusHistory.push({
            status: order.status,
            updatedBy: adminId,
            updatedByRole: "admin",
            note: `Fraud check approved: ${note}`,
            timestamp: new Date(),
        });
        await order.save();

        await FraudRecord.findOneAndUpdate(
            { order: orderId },
            {
                status: "approved",
                reviewedBy: adminId,
                reviewNote: note,
                reviewedAt: new Date(),
            },
            { upsert: true }
        );

        await AdminAuditLog.create({
            admin: adminId,
            action: "FRAUD_ORDER_APPROVED",
            targetType: "Order",
            targetId: order._id,
            summary: `Approved flagged order #${order.orderNumber}`,
            details: { riskScore: order.fraudFlag.riskScore, note },
            ipAddress,
        });

        await notificationService.createNotification({
            recipient: order.user,
            recipientRole: "customer",
            title: `Order #${order.orderNumber} Verified`,
            message: `Your order #${order.orderNumber} has passed security verification and is being processed.`,
            type: "ORDER_STATUS",
            order: order._id,
        });

        return order;
    }

    /**
     * Admin Action: Reject a suspicious order
     */
    async rejectFlaggedOrder({ orderId, adminId, note = "Rejected due to high fraud risk", ipAddress = "127.0.0.1" }) {
        const order = await Order.findById(orderId);
        if (!order) return null;

        const previousStatus = order.status;
        order.fraudFlag.reviewStatus = "rejected";
        order.fraudFlag.reviewedBy = adminId;
        order.fraudFlag.reviewedAt = new Date();
        order.status = "Cancelled";
        order.cancelledAt = new Date();
        order.cancelledByRole = "admin";
        order.cancellationReason = `Security Rejection: ${note}`;

        if (order.paymentStatus === "Paid") {
            order.paymentStatus = "Refund Initiated";
        }

        order.statusHistory.push({
            status: "Cancelled",
            updatedBy: adminId,
            updatedByRole: "admin",
            note: `Fraud check rejected: ${note}`,
            timestamp: new Date(),
        });

        await order.save();

        await FraudRecord.findOneAndUpdate(
            { order: orderId },
            {
                status: "rejected",
                reviewedBy: adminId,
                reviewNote: note,
                reviewedAt: new Date(),
            },
            { upsert: true }
        );

        await AdminAuditLog.create({
            admin: adminId,
            action: "FRAUD_ORDER_REJECTED",
            targetType: "Order",
            targetId: order._id,
            summary: `Rejected suspicious order #${order.orderNumber}`,
            details: { riskScore: order.fraudFlag.riskScore, note },
            ipAddress,
        });

        await notificationService.notifyOrderStatusChange(order, previousStatus);

        return order;
    }

    /**
     * Admin Action: Restrict or Unrestrict a suspicious customer account
     */
    async toggleUserRestriction({
        userId,
        adminId,
        isRestricted = true,
        reason = "Multiple high-risk fraud flags triggered",
        durationHours = 48,
        ipAddress = "127.0.0.1",
    }) {
        const user = await User.findById(userId);
        if (!user) return null;

        user.isRestricted = Boolean(isRestricted);
        user.restrictionReason = isRestricted ? reason : "";
        user.restrictedUntil = isRestricted
            ? new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000)
            : null;
        await user.save();

        await AdminAuditLog.create({
            admin: adminId,
            action: isRestricted ? "USER_ACCOUNT_RESTRICTED" : "USER_ACCOUNT_UNRESTRICTED",
            targetType: "User",
            targetId: user._id,
            summary: `${isRestricted ? "Restricted" : "Unrestricted"} user account ${user.email}`,
            details: { reason, durationHours, isRestricted },
            ipAddress,
        });

        await notificationService.createNotification({
            recipient: user._id,
            recipientRole: user.role,
            title: isRestricted ? "Account Temporarily Restricted" : "Account Restriction Lifted",
            message: isRestricted
                ? `Your account has been restricted for ${durationHours} hours. Reason: ${reason}`
                : "Your account restriction has been lifted by an administrator.",
            type: "FRAUD_ALERT",
        });

        return user;
    }
}

module.exports = new FraudDetectionService();

