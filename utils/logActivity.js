const ActivityLog = require('../models/ActivityLog');

/**
 * Log Admin Action Audit Trail
 */
const logActivity = async ({ req, user, action, resource, resourceId, details = {} }) => {
  try {
    const userId = user ? user._id : req?.user ? req.user._id : null;
    const ip = req ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip : '';
    const agent = req ? req.headers['user-agent'] : '';

    await ActivityLog.create({
      user: userId,
      action,
      resource: resource || '',
      resourceId: resourceId || null,
      details,
      ipAddress: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
      userAgent: agent || '',
    });
  } catch (error) {
    console.error('[ActivityLog Error]: Failed to log activity:', error.message);
  }
};

module.exports = logActivity;
