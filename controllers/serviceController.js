const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const resolveCategoryName = async (catField) => {
  if (!catField) return 'Haircuts';
  if (typeof catField === 'object' && catField.name) return catField.name;
  const str = String(catField);
  if (str.match(/^[0-9a-fA-F]{24}$/)) {
    const catDoc = await Category.findById(str);
    if (catDoc && catDoc.name) return catDoc.name;
  }
  return str;
};

/**
 * Format service object to ensure no ObjectIds in category field
 */
const formatServiceOutput = async (s) => {
  const doc = s.toObject ? s.toObject() : { ...s };
  doc.category = await resolveCategoryName(doc.category);
  return doc;
};

/**
 * @desc    Get All Services (Public & Filterable)
 * @route   GET /api/services
 * @access  Public
 */
exports.getServices = asyncWrapper(async (req, res) => {
  const { category, active, featured, search } = req.query;
  const filter = {};

  // If public query or active=true, return only active services
  if (active === 'true' || !req.user || !['Super Admin', 'Manager'].includes(req.user.role)) {
    filter.isActive = true;
  } else if (active === 'false') {
    filter.isActive = false;
  }

  if (category) filter.category = { $regex: category, $options: 'i' };
  if (featured === 'true') filter.isFeatured = true;

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [{ title: searchRegex }, { category: searchRegex }, { description: searchRegex }];
  }

  const rawServices = await Service.find(filter).sort({ title: 1 });
  const services = await Promise.all(rawServices.map((s) => formatServiceOutput(s)));

  return sendSuccess(res, 'Services fetched successfully', services);
});

/**
 * @desc    Get Single Service by ID or Slug
 * @route   GET /api/services/:idOrSlug
 * @access  Public
 */
exports.getService = asyncWrapper(async (req, res) => {
  const { idOrSlug } = req.params;
  const isMongoId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

  const rawService = isMongoId
    ? await Service.findById(idOrSlug)
    : await Service.findOne({ slug: idOrSlug });

  if (!rawService) {
    return sendError(res, 'Service not found', 404);
  }

  const service = await formatServiceOutput(rawService);
  return sendSuccess(res, 'Service details fetched successfully', service);
});

/**
 * @desc    Create New Service (With Duplicate Prevention)
 * @route   POST /api/services
 * @access  Private (Super Admin, Manager)
 */
exports.createService = asyncWrapper(async (req, res) => {
  const { title, category, description, price, duration, isFeatured, features, isActive } = req.body;

  if (!title || !title.trim()) {
    return sendError(res, 'Service name is required', 400);
  }

  const numPrice = Number(price);
  if (price === undefined || isNaN(numPrice) || numPrice < 0) {
    return sendError(res, 'Price must be a valid non-negative number', 400);
  }

  const numDuration = Number(duration);
  if (!duration || isNaN(numDuration) || numDuration <= 0) {
    return sendError(res, 'Duration must be a positive number of minutes', 400);
  }

  const slug = slugify(title);

  // Duplicate Prevention: check if an active service with same slug or title exists
  const existing = await Service.findOne({
    $or: [{ slug }, { title: { $regex: `^${title.trim()}$`, $options: 'i' } }],
  });

  if (existing && existing.isActive) {
    return sendError(res, 'A similar active service already exists.', 409);
  }

  let imageUrl = req.body.image || '';
  if (req.file) {
    imageUrl = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
  }

  const rawService = await Service.create({
    title: title.trim(),
    slug,
    category: category ? category.trim() : 'Haircuts',
    description: description ? description.trim() : '',
    price: numPrice,
    duration: numDuration,
    image: imageUrl,
    isFeatured: Boolean(isFeatured),
    features: Array.isArray(features) ? features : [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  const service = await formatServiceOutput(rawService);
  return sendSuccess(res, 'Service created successfully', service, 201);
});

/**
 * @desc    Update Service
 * @route   PUT /api/services/:id
 * @access  Private (Super Admin, Manager)
 */
exports.updateService = asyncWrapper(async (req, res) => {
  let service = await Service.findById(req.params.id);
  if (!service) {
    return sendError(res, 'Service not found', 404);
  }

  const { title, category, description, price, duration, isFeatured, features, isActive } = req.body;

  if (title && title.trim() !== service.title) {
    const newTitle = title.trim();
    const newSlug = slugify(newTitle);
    const existing = await Service.findOne({ slug: newSlug, _id: { $ne: service._id } });
    if (existing && existing.isActive) {
      return sendError(res, 'A similar active service already exists.', 409);
    }
    service.title = newTitle;
    service.slug = newSlug;
  }

  if (category !== undefined) service.category = category.trim();
  if (description !== undefined) service.description = description.trim();

  if (price !== undefined) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) return sendError(res, 'Price must be a valid non-negative number', 400);
    service.price = numPrice;
  }

  if (duration !== undefined) {
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration <= 0) return sendError(res, 'Duration must be a positive number of minutes', 400);
    service.duration = numDuration;
  }

  if (isFeatured !== undefined) service.isFeatured = Boolean(isFeatured);
  if (isActive !== undefined) service.isActive = Boolean(isActive);
  if (features !== undefined) service.features = Array.isArray(features) ? features : [];

  if (req.file) {
    service.image = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
  } else if (req.body.image !== undefined) {
    service.image = req.body.image;
  }

  await service.save();
  const updatedService = await formatServiceOutput(service);

  return sendSuccess(res, 'Service updated successfully', updatedService);
});

/**
 * @desc    Delete Service (Safety check: verifies appointment reference)
 * @route   DELETE /api/services/:id
 * @access  Private (Super Admin)
 */
exports.deleteService = asyncWrapper(async (req, res) => {
  const serviceId = req.params.id;

  // Safety check: verify if service is referenced by existing appointments
  const isReferenced = await Appointment.exists({ service: serviceId });
  if (isReferenced) {
    return sendError(
      res,
      'This service is linked to existing appointments. Deactivate it instead.',
      400
    );
  }

  const service = await Service.findByIdAndDelete(serviceId);
  if (!service) {
    return sendError(res, 'Service not found', 404);
  }

  return sendSuccess(res, 'Service deleted successfully');
});
