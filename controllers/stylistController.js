const Stylist = require('../models/Stylist');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get All Stylists
 * @route   GET /api/stylists
 * @access  Public
 */
exports.getStylists = asyncWrapper(async (req, res) => {
  const filter = {};
  if (!req.user || !['Super Admin', 'Manager'].includes(req.user.role)) {
    filter.isActive = true;
  }

  const stylists = await Stylist.find(filter)
    .populate('specialties', 'title category price duration')
    .sort({ createdAt: -1 });

  return sendSuccess(res, 'Stylists fetched successfully', stylists);
});

/**
 * @desc    Get Single Stylist by ID
 * @route   GET /api/stylists/:id
 * @access  Public
 */
exports.getStylist = asyncWrapper(async (req, res) => {
  const stylist = await Stylist.findById(req.params.id).populate(
    'specialties',
    'title category price duration'
  );

  if (!stylist) {
    return sendError(res, 'Stylist profile not found', 404);
  }

  return sendSuccess(res, 'Stylist details fetched successfully', stylist);
});

/**
 * @desc    Create Stylist Profile
 * @route   POST /api/stylists
 * @access  Private (Super Admin, Manager)
 */
exports.createStylist = asyncWrapper(async (req, res) => {
  const {
    name,
    user,
    title,
    bio,
    specialties,
    experienceYears,
    rating,
    workingDays,
    instagram,
    isActive,
  } = req.body;

  let avatarUrl = req.body.avatar || '';
  if (req.file) {
    avatarUrl = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
  }

  const stylist = await Stylist.create({
    name,
    user: user || null,
    title: title || 'Senior Master Stylist',
    bio: bio || '',
    avatar: avatarUrl,
    specialties: Array.isArray(specialties) ? specialties : [],
    experienceYears: Number(experienceYears) || 5,
    rating: Number(rating) || 4.9,
    workingDays: Array.isArray(workingDays) ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    instagram: instagram || '',
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  const populated = await Stylist.findById(stylist._id).populate('specialties', 'title category price');
  return sendSuccess(res, 'Stylist profile created successfully', populated, 201);
});

/**
 * @desc    Update Stylist Profile
 * @route   PUT /api/stylists/:id
 * @access  Private (Super Admin, Manager)
 */
exports.updateStylist = asyncWrapper(async (req, res) => {
  let stylist = await Stylist.findById(req.params.id);
  if (!stylist) {
    return sendError(res, 'Stylist profile not found', 404);
  }

  const {
    name,
    user,
    title,
    bio,
    specialties,
    experienceYears,
    rating,
    workingDays,
    instagram,
    isActive,
  } = req.body;

  if (name !== undefined) stylist.name = name;
  if (user !== undefined) stylist.user = user;
  if (title !== undefined) stylist.title = title;
  if (bio !== undefined) stylist.bio = bio;
  if (experienceYears !== undefined) stylist.experienceYears = Number(experienceYears);
  if (rating !== undefined) stylist.rating = Number(rating);
  if (instagram !== undefined) stylist.instagram = instagram;
  if (isActive !== undefined) stylist.isActive = Boolean(isActive);
  if (specialties !== undefined) stylist.specialties = Array.isArray(specialties) ? specialties : [];
  if (workingDays !== undefined) stylist.workingDays = Array.isArray(workingDays) ? workingDays : [];

  if (req.file) {
    stylist.avatar = req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`;
  } else if (req.body.avatar) {
    stylist.avatar = req.body.avatar;
  }

  await stylist.save();
  const updated = await Stylist.findById(stylist._id).populate('specialties', 'title category price');

  return sendSuccess(res, 'Stylist profile updated successfully', updated);
});

/**
 * @desc    Delete Stylist Profile
 * @route   DELETE /api/stylists/:id
 * @access  Private (Super Admin)
 */
exports.deleteStylist = asyncWrapper(async (req, res) => {
  const stylist = await Stylist.findByIdAndDelete(req.params.id);
  if (!stylist) {
    return sendError(res, 'Stylist profile not found', 404);
  }

  return sendSuccess(res, 'Stylist profile deleted successfully');
});
