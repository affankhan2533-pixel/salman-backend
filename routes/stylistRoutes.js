const express = require('express');
const router = express.Router();
const {
  getStylists,
  getStylist,
  createStylist,
  updateStylist,
  deleteStylist,
} = require('../controllers/stylistController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createStylistSchema, updateStylistSchema } = require('../validators/stylistValidator');

router
  .route('/')
  .get(getStylists)
  .post(
    protect,
    authorize('Super Admin', 'Manager'),
    upload.single('avatar'),
    validate(createStylistSchema),
    createStylist
  );

router
  .route('/:id')
  .get(getStylist)
  .put(
    protect,
    authorize('Super Admin', 'Manager'),
    upload.single('avatar'),
    validate(updateStylistSchema),
    updateStylist
  )
  .delete(protect, authorize('Super Admin'), deleteStylist);

module.exports = router;
