const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    clientName: z.string().min(2, 'Name must be at least 2 characters').optional(),
    clientEmail: z.string().email('Invalid email address format').optional(),
    clientPhone: z.string().min(8, 'Phone number is required').optional(),

    // Backwards compatibility legacy field names
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),

    service: z.string({ required_error: 'Service ID or name is required' }),
    stylist: z.string().optional(),
    date: z.string({ required_error: 'Date (YYYY-MM-DD) is required' }),
    startTime: z.string().optional(),
    time: z.string().optional(), // Legacy field name
    notes: z.string().optional(),
  }),
});

const statusEnum = z.enum([
  'Pending',
  'Confirmed',
  'Checked In',
  'In Progress',
  'Completed',
  'Cancelled',
  'No Show',
  'Expired',
  'Accepted', // Legacy status map -> Confirmed
  'Rejected', // Legacy status map -> Cancelled
]);

const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: statusEnum.optional(),
    appointmentStatus: statusEnum.optional(),
    paymentStatus: z.enum(['Unpaid', 'Paid', 'Partially Paid', 'Refunded']).optional(),
  }),
});

const rescheduleAppointmentSchema = z.object({
  body: z.object({
    date: z.string({ required_error: 'New date (YYYY-MM-DD) is required' }).regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string({ required_error: 'New start time (HH:mm) is required' }),
    stylistId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
};
