const { z } = require('zod');

const generateSlotsSchema = z.object({
  body: z.object({
    stylistId: z.string({ required_error: 'Stylist ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid Stylist ObjectId'),
    date: z.string({ required_error: 'Date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    slotDurationMinutes: z.preprocess((val) => Number(val), z.number().min(15).max(180)).optional(),
    startHour: z.number().min(0).max(23).optional(),
    endHour: z.number().min(1).max(24).optional(),
  }),
});

const blockSlotSchema = z.object({
  body: z.object({
    status: z.enum(['available', 'blocked']),
  }),
});

module.exports = {
  generateSlotsSchema,
  blockSlotSchema,
};
