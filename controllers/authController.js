const User = require('../models/User');
const { generateAccessToken } = require('../utils/generateToken');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');
const logActivity = require('../utils/logActivity');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
};

/**
 * @desc    Admin / User Login (Sets HTTP-Only JWT Cookie)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;

  let user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Auto-seed default Super Admin if first initialization
  if (!user && email.toLowerCase() === 'admin@salmanhairstudio.com') {
    user = await User.create({
      name: 'Salman Master Atelier',
      email: 'admin@salmanhairstudio.com',
      password: password.length >= 6 ? password : 'admin123password',
      role: 'Super Admin',
    });
    user = await User.findOne({ email: 'admin@salmanhairstudio.com' }).select('+password');
  }

  if (!user) {
    return sendError(res, 'Invalid login credentials', 401);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return sendError(res, 'Invalid login credentials', 401);
  }

  // Issue Access Token
  const token = generateAccessToken(user._id);

  // Update Last Login
  user.lastLoginAt = new Date();
  await user.save();

  // Set HTTP-Only Cookie
  res.cookie('token', token, COOKIE_OPTIONS);

  // Log Activity
  logActivity({ req, user, action: 'USER_LOGIN', resource: 'User', resourceId: user._id });

  return sendSuccess(res, 'Authentication successful', {
    token, // Also returned in data for API clients
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

/**
 * @desc    Logout User (Clears HTTP-Only Cookie)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncWrapper(async (req, res) => {
  logActivity({ req, user: req.user, action: 'USER_LOGOUT', resource: 'User', resourceId: req.user?._id });
  res.clearCookie('token', COOKIE_OPTIONS);
  return sendSuccess(res, 'Successfully logged out');
});

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncWrapper(async (req, res) => {
  return sendSuccess(res, 'Current user profile fetched successfully', req.user);
});

/**
 * @desc    Update Profile Details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = asyncWrapper(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return sendError(res, 'User profile not found', 404);
  }

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (avatar) user.avatar = avatar;

  await user.save();

  return sendSuccess(res, 'Profile updated successfully', user);
});
