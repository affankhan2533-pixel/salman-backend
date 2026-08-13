const Gallery = require('../models/Gallery');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * Format output to guarantee human-readable category strings
 */
const formatGalleryOutput = (item) => {
  const doc = item.toObject ? item.toObject() : { ...item };
  let cat = doc.category || 'Haircuts';
  if (typeof cat === 'object' && cat.name) cat = cat.name;
  if (typeof cat === 'string' && cat.match(/^[0-9a-fA-F]{24}$/)) cat = 'Haircuts';
  doc.category = cat;
  doc.imageUrl = doc.imageUrl || doc.afterImage || doc.thumbnail || doc.beforeImage || '';
  doc.order = doc.order !== undefined ? doc.order : (doc.sortOrder !== undefined ? doc.sortOrder : 0);
  doc.isVisible = doc.isVisible !== undefined ? doc.isVisible : true;
  return doc;
};

/**
 * @desc    Get All Gallery Items (Public & Admin Filterable)
 * @route   GET /api/gallery
 * @access  Public
 */
exports.getGalleryItems = asyncWrapper(async (req, res) => {
  const { category, visible, featured } = req.query;
  const filter = {};

  // Public users or visible=true get only visible gallery items
  if (visible === 'true' || !req.user || !['Super Admin', 'Manager'].includes(req.user.role)) {
    filter.isVisible = true;
  } else if (visible === 'false') {
    filter.isVisible = false;
  }

  if (category) filter.category = { $regex: category, $options: 'i' };
  if (featured === 'true') filter.featured = true;

  const rawItems = await Gallery.find(filter).sort({ order: 1, sortOrder: 1, createdAt: -1 });
  const items = rawItems.map(formatGalleryOutput);

  return sendSuccess(res, 'Gallery items fetched successfully', items);
});

/**
 * @desc    Get Single Gallery Item by ID
 * @route   GET /api/gallery/:id
 * @access  Public
 */
exports.getGalleryItem = asyncWrapper(async (req, res) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) {
    return sendError(res, 'Gallery item not found', 404);
  }

  return sendSuccess(res, 'Gallery item details fetched successfully', formatGalleryOutput(item));
});

/**
 * @desc    Create Gallery Item (Supports file upload or URL)
 * @route   POST /api/gallery
 * @access  Private (Super Admin, Manager)
 */
exports.createGalleryItem = asyncWrapper(async (req, res) => {
  const { title, description, category, isVisible, order, sortOrder, featured } = req.body;

  let imgUrl = req.body.imageUrl || req.body.afterImage || req.body.thumbnail || '';

  // Process uploaded image file
  if (req.file) {
    imgUrl = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
  } else if (req.files) {
    const file =
      (req.files.image && req.files.image[0]) ||
      (req.files.imageUrl && req.files.imageUrl[0]) ||
      (req.files.afterImage && req.files.afterImage[0]) ||
      (req.files.thumbnail && req.files.thumbnail[0]);
    if (file) {
      imgUrl = file.path || file.secure_url || `/uploads/${file.filename}`;
    }
  }

  if (!imgUrl) {
    return sendError(res, 'Please provide or upload a valid image file', 400);
  }

  const numOrder = Number(order !== undefined ? order : (sortOrder !== undefined ? sortOrder : 0));

  const rawItem = await Gallery.create({
    title: title ? title.trim() : '',
    description: description ? description.trim() : '',
    imageUrl: imgUrl,
    afterImage: imgUrl,
    thumbnail: imgUrl,
    category: category ? category.trim() : 'Haircuts',
    isVisible: isVisible !== undefined ? (String(isVisible) === 'true' || isVisible === true) : true,
    order: isNaN(numOrder) ? 0 : numOrder,
    sortOrder: isNaN(numOrder) ? 0 : numOrder,
    featured: Boolean(featured),
  });

  return sendSuccess(res, 'Gallery image added successfully', formatGalleryOutput(rawItem), 201);
});

/**
 * @desc    Update Gallery Item
 * @route   PUT /api/gallery/:id
 * @access  Private (Super Admin, Manager)
 */
exports.updateGalleryItem = asyncWrapper(async (req, res) => {
  let item = await Gallery.findById(req.params.id);
  if (!item) {
    return sendError(res, 'Gallery item not found', 404);
  }

  const { title, description, category, isVisible, order, sortOrder, featured } = req.body;

  if (title !== undefined) item.title = title.trim();
  if (description !== undefined) item.description = description.trim();
  if (category !== undefined) item.category = category.trim();

  if (isVisible !== undefined) {
    item.isVisible = String(isVisible) === 'true' || isVisible === true;
  }

  if (order !== undefined || sortOrder !== undefined) {
    const numOrder = Number(order !== undefined ? order : sortOrder);
    if (!isNaN(numOrder)) {
      item.order = numOrder;
      item.sortOrder = numOrder;
    }
  }

  if (featured !== undefined) item.featured = Boolean(featured);

  if (req.file) {
    const img = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
    item.imageUrl = img;
    item.afterImage = img;
    item.thumbnail = img;
  } else if (req.files) {
    const file =
      (req.files.image && req.files.image[0]) ||
      (req.files.imageUrl && req.files.imageUrl[0]) ||
      (req.files.afterImage && req.files.afterImage[0]) ||
      (req.files.thumbnail && req.files.thumbnail[0]);
    if (file) {
      const img = file.path || file.secure_url || `/uploads/${file.filename}`;
      item.imageUrl = img;
      item.afterImage = img;
      item.thumbnail = img;
    }
  } else if (req.body.imageUrl) {
    item.imageUrl = req.body.imageUrl;
    item.afterImage = req.body.imageUrl;
    item.thumbnail = req.body.imageUrl;
  }

  await item.save();
  return sendSuccess(res, 'Gallery image updated successfully', formatGalleryOutput(item));
});

/**
 * @desc    Delete Gallery Item
 * @route   DELETE /api/gallery/:id
 * @access  Private (Super Admin)
 */
exports.deleteGalleryItem = asyncWrapper(async (req, res) => {
  const item = await Gallery.findByIdAndDelete(req.params.id);
  if (!item) {
    return sendError(res, 'Gallery item not found', 404);
  }

  return sendSuccess(res, 'Gallery image deleted successfully');
});
