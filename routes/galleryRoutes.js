const express = require('express');
const router = express.Router();
const {
  getGalleryItems,
  getGalleryItem,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createGallerySchema, updateGallerySchema } = require('../validators/galleryValidator');

const galleryUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imageUrl', maxCount: 1 },
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

router
  .route('/')
  .get(getGalleryItems)
  .post(
    protect,
    authorize('Super Admin', 'Manager'),
    galleryUploadFields,
    validate(createGallerySchema),
    createGalleryItem
  );

router
  .route('/:id')
  .get(getGalleryItem)
  .put(
    protect,
    authorize('Super Admin', 'Manager'),
    galleryUploadFields,
    validate(updateGallerySchema),
    updateGalleryItem
  )
  .delete(protect, authorize('Super Admin'), deleteGalleryItem);

module.exports = router;
