const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/responseHandler');
const { JWT_SECRET } = require('../utils/generateToken');

/**
 * Protect routes: Authenticate JWT from HTTP-Only cookie or Authorization Bearer header
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Read token from HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization Header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorized, no session token provided', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return sendError(res, 'User account no longer active or exists', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Not authorized, session expired or invalid token', 401);
  }
};

/**
 * Authorize RBAC roles middleware
 * @param  {...string} roles 
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        `Role '${req.user ? req.user.role : 'Guest'}' is not authorized to perform this action`,
        403
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
