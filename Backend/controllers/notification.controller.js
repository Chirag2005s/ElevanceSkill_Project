const Notification = require("../models/Notification.model");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * TASK 5 Endpoint: Get notifications and unread count for logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
    const [notifications, unreadCount] = await Promise.all([
        Notification.find({ recipient: req.user._id })
            .populate("order", "orderNumber status pricing")
            .sort({ createdAt: -1 })
            .limit(40),
        Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return sendSuccess(res, 200, "Notifications fetched", {
        notifications,
        unreadCount,
    });
});

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markNotificationRead = asyncHandler(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id },
        { isRead: true }
    );

    const unreadCount = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    return sendSuccess(res, 200, "Notification marked as read", { unreadCount });
});

/**
 * @desc    Mark all notifications as read for logged-in user
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllNotificationsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    return sendSuccess(res, 200, "All notifications marked as read", { unreadCount: 0 });
});

module.exports = {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
};

