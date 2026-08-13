const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'salman_atelier_jwt_secret_key_2026_production';

/**
 * Generate Access Token (7 Days)
 */
const generateAccessToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '7d',
  });
};

module.exports = {
  generateAccessToken,
  JWT_SECRET,
};
