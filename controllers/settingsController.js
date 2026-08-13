const Settings = require('../models/Settings');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');
const logActivity = require('../utils/logActivity');

/**
 * @desc    Get Salon Business Settings
 * @route   GET /api/settings
 * @access  Public
 */
exports.getSettings = asyncWrapper(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }

  return sendSuccess(res, 'Salon settings fetched successfully', settings);
});

/**
 * @desc    Update Salon Business Settings
 * @route   PUT /api/settings
 * @access  Private (Super Admin, Manager)
 */
exports.updateSettings = asyncWrapper(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({});
  }

  const {
    businessName,
    hindiName,
    tagline,
    workingHours,
    contactDetails,
    socialLinks,
    salonSettings,
  } = req.body;

  if (businessName !== undefined) settings.businessName = businessName;
  if (hindiName !== undefined) settings.hindiName = hindiName;
  if (tagline !== undefined) settings.tagline = tagline;
  if (workingHours !== undefined) settings.workingHours = workingHours;
  if (contactDetails !== undefined) settings.contactDetails = contactDetails;
  if (socialLinks !== undefined) settings.socialLinks = socialLinks;
  if (salonSettings !== undefined) settings.salonSettings = salonSettings;

  await settings.save();

  logActivity({ req, user: req.user, action: 'UPDATE_SETTINGS', resource: 'Settings', resourceId: settings._id });

  return sendSuccess(res, 'Salon business settings updated successfully', settings);
});
