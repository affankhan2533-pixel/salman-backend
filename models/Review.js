const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientAvatar: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      required: [true, 'Rating (1-5) is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    stylist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stylist',
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reply: {
      text: { type: String, default: '' },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      repliedAt: { type: Date, default: null },
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ status: 1, isFeatured: 1 });
reviewSchema.index({ service: 1, stylist: 1 });

module.exports = mongoose.model('Review', reviewSchema);
