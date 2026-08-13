const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Holiday date (YYYY-MM-DD) is required'],
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Holiday reason is required'],
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false, // E.g., every year on same MM-DD
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
