const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    clientName: z.string().min(2, 'Name must be at least 2 characters').optional(),
    customerName: z.string().min(2, 'Name must be at least 2 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),

    clientPhone: z.string().min(8, 'Phone number must be at least 8 digits').optional(),
    phone: z.string().min(8, 'Phone number must be at least 8 digits').optional(),

    clientEmail: z.string().email('Invalid email address format').optional().or(z.literal('')),
    email: z.string().email('Invalid email address format').optional().or(z.literal('')),

    service: z.string().optional(),
    serviceId: z.string().optional(),
    serviceName: z.string().optional(),

    stylist: z.string().optional(),
    date: z.string({ required_error: 'Date (YYYY-MM-DD) is required' }),
    startTime: z.string().optional(),
    time: z.string().optional(),
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
  'pending',
  'confirmed',
  'cancelled',
  'completed',
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
