const Holiday = require('../models/Holiday');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get All Holidays
 * @route   GET /api/holidays
 * @access  Public
 */
exports.getHolidays = asyncWrapper(async (req, res) => {
  const holidays = await Holiday.find()
    .populate('createdBy', 'name role')
    .sort({ date: 1 });

  return sendSuccess(res, 'Holidays fetched successfully', holidays);
});

/**
 * @desc    Create Salon Holiday
 * @route   POST /api/holidays
 * @access  Private (Super Admin, Manager)
 */
exports.createHoliday = asyncWrapper(async (req, res) => {
  const { date, reason, isRecurring } = req.body;

  const existing = await Holiday.findOne({ date });
  if (existing) {
    return sendError(res, 'A holiday is already scheduled on this date', 409);
  }

  const holiday = await Holiday.create({
    date,
    reason,
    isRecurring: Boolean(isRecurring),
    createdBy: req.user._id,
  });

  return sendSuccess(res, 'Holiday created successfully', holiday, 201);
});

/**
 * @desc    Delete Salon Holiday
 * @route   DELETE /api/holidays/:id
 * @access  Private (Super Admin, Manager)
 */
exports.deleteHoliday = asyncWrapper(async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) {
    return sendError(res, 'Holiday record not found', 404);
  }

  return sendSuccess(res, 'Holiday removed successfully');
});
