const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');

router
  .route('/')
  .get(getCategories)
  .post(protect, authorize('Super Admin', 'Manager'), validate(createCategorySchema), createCategory);

router
  .route('/:idOrSlug')
  .get(getCategory);

router
  .route('/:id')
  .put(protect, authorize('Super Admin', 'Manager'), validate(updateCategorySchema), updateCategory)
  .delete(protect, authorize('Super Admin'), deleteCategory);

module.exports = router;
