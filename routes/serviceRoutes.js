const express = require('express');
const router = express.Router();
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createServiceSchema, updateServiceSchema } = require('../validators/serviceValidator');

router
  .route('/')
  .get(getServices)
  .post(
    protect,
    authorize('Super Admin', 'Manager'),
    upload.single('image'),
    validate(createServiceSchema),
    createService
  );

router
  .route('/:idOrSlug')
  .get(getService);

router
  .route('/:id')
  .put(
    protect,
    authorize('Super Admin', 'Manager'),
    upload.single('image'),
    validate(updateServiceSchema),
    updateService
  )
  .delete(protect, authorize('Super Admin'), deleteService);

module.exports = router;
