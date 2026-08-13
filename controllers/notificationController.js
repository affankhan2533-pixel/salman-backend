const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get Admin Notifications List
 * @route   GET /api/notifications
 * @access  Private (Admin, Manager)
 */
exports.getNotifications = asyncWrapper(async (req, res) => {
  const { channel, status, limit = 50 } = req.query;
  const filter = {};

  if (channel) filter.channel = channel;
  if (status) filter.status = status;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  const unreadCount = await Notification.countDocuments({ readAt: null });

  return sendSuccess(res, 'Notifications fetched successfully', {
    unreadCount,
    notifications,
  });
});

/**
 * @desc    Mark Notification as Read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private (Admin, Manager)
 */
exports.markAsRead = asyncWrapper(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return sendError(res, 'Notification not found', 404);
  }

  return sendSuccess(res, 'Notification marked as read', notification);
});

/**
 * @desc    Mark All Notifications as Read
 * @route   PATCH /api/notifications/read-all
 * @access  Private (Admin, Manager)
 */
exports.markAllAsRead = asyncWrapper(async (req, res) => {
  await Notification.updateMany({ readAt: null }, { readAt: new Date() });
  return sendSuccess(res, 'All notifications marked as read');
});
