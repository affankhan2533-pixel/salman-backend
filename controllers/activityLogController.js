const ActivityLog = require('../models/ActivityLog');
const { sendSuccess } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get Activity Logs (Admin Audit Trail)
 * @route   GET /api/activity-logs
 * @access  Private (Super Admin, Manager)
 */
exports.getActivityLogs = asyncWrapper(async (req, res) => {
  const { action, resource, userId, page = 1, limit = 30 } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (userId) filter.user = userId;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await ActivityLog.countDocuments(filter);

  const logs = await ActivityLog.find(filter)
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const pagination = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return sendSuccess(res, 'Activity audit logs fetched successfully', logs, 200, pagination);
});
