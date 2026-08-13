/**
  * Standardized HTTP Success Response Envelope
  */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200, pagination = null) => {
  const response = {
    success: true,
    message,
    data,
    errors: null,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized HTTP Error Response Envelope
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
