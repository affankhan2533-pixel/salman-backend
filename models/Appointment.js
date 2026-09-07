const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generate a short human-friendly booking reference: SHS-XXXXX
 * Uses 5 uppercase alphanumeric characters (base-36 from random bytes).
 */
const generateBookingRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous O/0/I/1
  let ref = 'SHS-';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    ref += chars[bytes[i] % chars.length];
  }
  return ref;
};

const appointmentSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      sparse: true,
      default: generateBookingRef,
    },
    clientName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    clientPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
    },
    serviceId: {
      type: String,
      default: '',
      trim: true,
    },
    serviceName: {
      type: String,
      default: '',
      trim: true,
    },
    stylist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stylist',
      required: [true, 'Stylist reference is required'],
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Appointment date is required'],
    },
    startTime: {
      type: String, // HH:mm or 12h representation
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // HH:mm
      required: [true, 'End time is required'],
    },
    duration: {
      type: Number,
      default: 60,
    },
    price: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Partially Paid', 'Refunded'],
      default: 'Unpaid',
    },
    appointmentStatus: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Checked In',
        'In Progress',
        'Completed',
        'Cancelled',
        'No Show',
        'Expired',
        'pending',
        'confirmed',
        'cancelled',
        'completed',
      ],
      default: 'Pending',
    },
    // ISO timestamp when the pending hold expires. Set at creation for Pending
    // bookings. Null for Confirmed / Completed / Cancelled records.
    pendingExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for clean multi-convention consumption
appointmentSchema.virtual('customerName')
  .get(function () { return this.clientName; })
  .set(function (val) { this.clientName = val; });

appointmentSchema.virtual('phone')
  .get(function () { return this.clientPhone; })
  .set(function (val) { this.clientPhone = val; });

appointmentSchema.virtual('time')
  .get(function () { return this.startTime; })
  .set(function (val) { this.startTime = val; });

appointmentSchema.virtual('status')
  .get(function () { return this.appointmentStatus; })
  .set(function (val) { this.appointmentStatus = val; });

// DATABASE-LEVEL DOUBLE-BOOKING PROTECTION:
// Partial unique compound index on date + startTime strictly for active statuses.
// Cancelled and Completed appointments are excluded, freeing the slot automatically.
appointmentSchema.index(
  { date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      appointmentStatus: { $in: ['Pending', 'Confirmed', 'Checked In', 'In Progress', 'pending', 'confirmed'] },
    },
  }
);

appointmentSchema.index({ date: 1, stylist: 1 });
appointmentSchema.index({ date: 1, appointmentStatus: 1 });
appointmentSchema.index({ clientPhone: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.generateBookingRef = generateBookingRef;
