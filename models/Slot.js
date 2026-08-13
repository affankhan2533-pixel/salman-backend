const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    stylist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stylist',
      required: [true, 'Stylist reference is required'],
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Slot date (YYYY-MM-DD) is required'],
      trim: true,
    },
    startTime: {
      type: String, // HH:mm (24h)
      required: [true, 'Start time (HH:mm) is required'],
      trim: true,
    },
    endTime: {
      type: String, // HH:mm (24h)
      required: [true, 'End time (HH:mm) is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'blocked'],
      default: 'available',
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent Duplicate Time Slots per Stylist and Date
slotSchema.index({ date: 1, stylist: 1, startTime: 1 }, { unique: true });
slotSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Slot', slotSchema);
