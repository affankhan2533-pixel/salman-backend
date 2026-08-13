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
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'Client email is required'],
      lowercase: true,
      trim: true,
    },
    clientPhone: {
      type: String,
      required: [true, 'Client phone is required'],
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
      type: String, // HH:mm
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
  }
);

appointmentSchema.index({ date: 1, stylist: 1 });
appointmentSchema.index({ date: 1, appointmentStatus: 1 });
appointmentSchema.index({ clientPhone: 1 });
// bookingRef index is created automatically from the schema field { unique: true, sparse: true }

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.generateBookingRef = generateBookingRef;
