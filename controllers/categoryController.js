const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

// Helper to generate URL-safe slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * @desc    Get All Categories (Public)
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = asyncWrapper(async (req, res) => {
  const filter = {};
  // If not admin, return only active categories
  if (!req.user || !['Super Admin', 'Manager'].includes(req.user.role)) {
    filter.isActive = true;
  }

  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
  return sendSuccess(res, 'Categories fetched successfully', categories);
});

/**
 * @desc    Get Single Category by ID or Slug
 * @route   GET /api/categories/:idOrSlug
 * @access  Public
 */
exports.getCategory = asyncWrapper(async (req, res) => {
  const { idOrSlug } = req.params;
  const isMongoId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

  const category = isMongoId
    ? await Category.findById(idOrSlug)
    : await Category.findOne({ slug: idOrSlug });

  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  return sendSuccess(res, 'Category details fetched successfully', category);
});

/**
 * @desc    Create New Category
 * @route   POST /api/categories
 * @access  Private (Super Admin, Manager)
 */
exports.createCategory = asyncWrapper(async (req, res) => {
  const { name, description, icon, sortOrder, isActive } = req.body;

  const slug = slugify(name);
  const existing = await Category.findOne({ slug });

  if (existing) {
    return sendError(res, 'Category with this name or slug already exists', 409);
  }

  const category = await Category.create({
    name,
    slug,
    description: description || '',
    icon: icon || '',
    sortOrder: sortOrder || 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  return sendSuccess(res, 'Category created successfully', category, 201);
});

/**
 * @desc    Update Category
 * @route   PUT /api/categories/:id
 * @access  Private (Super Admin, Manager)
 */
exports.updateCategory = asyncWrapper(async (req, res) => {
  const { name, description, icon, sortOrder, isActive } = req.body;

  let category = await Category.findById(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  if (name && name !== category.name) {
    category.name = name;
    category.slug = slugify(name);
  }

  if (description !== undefined) category.description = description;
  if (icon !== undefined) category.icon = icon;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  return sendSuccess(res, 'Category updated successfully', category);
});

/**
 * @desc    Delete Category
 * @route   DELETE /api/categories/:id
 * @access  Private (Super Admin)
 */
exports.deleteCategory = asyncWrapper(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return sendError(res, 'Category not found', 404);
  }

  return sendSuccess(res, 'Category deleted successfully');
});
