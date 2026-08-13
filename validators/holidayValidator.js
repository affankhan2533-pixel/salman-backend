const { z } = require('zod');

const createHolidaySchema = z.object({
  body: z.object({
    date: z.string({ required_error: 'Holiday date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    reason: z.string({ required_error: 'Reason is required' }).min(2, 'Reason must be at least 2 characters'),
    isRecurring: z.boolean().optional(),
  }),
});

module.exports = {
  createHolidaySchema,
};
