/**
 * Async handler wrapper to catch unhandled promise rejections in controller functions
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
