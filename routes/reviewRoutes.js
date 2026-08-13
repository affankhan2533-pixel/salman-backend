const express = require('express');
const router = express.Router();
const {
  getReviews,
  getReview,
  createReview,
  updateReviewStatus,
  replyToReview,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  submitReviewSchema,
  approveReviewSchema,
  replyReviewSchema,
} = require('../validators/reviewValidator');

router
  .route('/')
  .get(getReviews)
  .post(validate(submitReviewSchema), createReview);

router
  .route('/:id')
  .get(getReview)
  .delete(protect, authorize('Super Admin'), deleteReview);

router
  .route('/:id/approve')
  .patch(
    protect,
    authorize('Super Admin', 'Manager'),
    validate(approveReviewSchema),
    updateReviewStatus
  );

router
  .route('/:id/reply')
  .post(
    protect,
    authorize('Super Admin', 'Manager'),
    validate(replyReviewSchema),
    replyToReview
  );

module.exports = router;
