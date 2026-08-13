const { sendError } = require('../utils/responseHandler');

/**
 * Zod Schema Validation Middleware Wrapper
 * @param {import('zod').ZodSchema} schema 
 */
const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Replace with parsed data
    req.body = parsed.body || req.body;
    req.query = parsed.query || req.query;
    req.params = parsed.params || req.params;
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    if (error.name === 'ZodError' || issues.length > 0) {
      const formattedErrors = issues.map((err) => ({
        field: err.path ? err.path.join('.').replace(/^(body|query|params)\./, '') : '',
        message: err.message,
      }));
      const firstMsg = formattedErrors.length > 0 ? formattedErrors[0].message : 'Validation error';
      return sendError(res, firstMsg, 400, formattedErrors);
    }
    next(error);
  }
};

module.exports = validate;
