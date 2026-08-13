const Review = require('../models/Review');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get All Reviews (Public: Approved only; Admin: All/Filterable)
 * @route   GET /api/reviews
 * @access  Public
 */
exports.getReviews = asyncWrapper(async (req, res) => {
  const { status, featured, service, stylist } = req.query;
  const filter = {};

  // If public client, default to Approved reviews only
  if (!req.user || !['Super Admin', 'Manager', 'Receptionist'].includes(req.user.role)) {
    filter.status = 'Approved';
  } else if (status) {
    filter.status = status;
  }

  if (featured === 'true') filter.isFeatured = true;
  if (service) filter.service = service;
  if (stylist) filter.stylist = stylist;

  const reviews = await Review.find(filter)
    .populate('service', 'title category')
    .populate('stylist', 'name title avatar')
    .populate('approvedBy', 'name role')
    .populate('reply.repliedBy', 'name role')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 'Reviews fetched successfully', reviews);
});

/**
 * @desc    Get Single Review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
exports.getReview = asyncWrapper(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('service', 'title category')
    .populate('stylist', 'name title avatar')
    .populate('approvedBy', 'name role')
    .populate('reply.repliedBy', 'name role');

  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  return sendSuccess(res, 'Review details fetched successfully', review);
});

/**
 * @desc    Public Submit Client Review (Default status: Pending)
 * @route   POST /api/reviews
 * @access  Public
 */
exports.createReview = asyncWrapper(async (req, res) => {
  const { clientName, clientAvatar, rating, comment, service, stylist } = req.body;

  const review = await Review.create({
    clientName,
    clientAvatar: clientAvatar || '',
    rating: Number(rating),
    comment,
    service: service || null,
    stylist: stylist || null,
    status: 'Pending',
  });

  return sendSuccess(
    res,
    'Thank you! Your review has been submitted and is pending moderation.',
    review,
    201
  );
});

/**
 * @desc    Approve or Reject Review (Admin)
 * @route   PATCH /api/reviews/:id/approve
 * @access  Private (Super Admin, Manager)
 */
exports.updateReviewStatus = asyncWrapper(async (req, res) => {
  const { status, isFeatured } = req.body;

  let review = await Review.findById(req.params.id);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  review.status = status;
  if (status === 'Approved') {
    review.approvedBy = req.user._id;
  }
  if (isFeatured !== undefined) {
    review.isFeatured = Boolean(isFeatured);
  }

  await review.save();
  const updated = await Review.findById(review._id)
    .populate('approvedBy', 'name role')
    .populate('service', 'title')
    .populate('stylist', 'name');

  return sendSuccess(res, `Review status updated to ${status}`, updated);
});

/**
 * @desc    Reply to Client Review (Admin)
 * @route   POST /api/reviews/:id/reply
 * @access  Private (Super Admin, Manager)
 */
exports.replyToReview = asyncWrapper(async (req, res) => {
  const { replyText } = req.body;

  let review = await Review.findById(req.params.id);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  review.reply = {
    text: replyText,
    repliedBy: req.user._id,
    repliedAt: new Date(),
  };

  await review.save();
  const updated = await Review.findById(review._id).populate('reply.repliedBy', 'name role');

  return sendSuccess(res, 'Reply added to review successfully', updated);
});

/**
 * @desc    Delete Review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Super Admin)
 */
exports.deleteReview = asyncWrapper(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) {
    return sendError(res, 'Review not found', 404);
  }

  return sendSuccess(res, 'Review deleted successfully');
});
