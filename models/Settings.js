const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      default: 'Salman Hair Studio',
    },
    hindiName: {
      type: String,
      default: 'सलमान हेयर स्टुдио',
    },
    tagline: {
      type: String,
      default: 'Premier Hair Styling, Couture Color & Facial Care in Mumbai',
    },
    workingHours: {
      type: Object,
      default: {
        monday: { open: '10:00', close: '23:00', isClosed: false },
        tuesday: { open: '10:00', close: '23:00', isClosed: false },
        wednesday: { open: '10:00', close: '23:00', isClosed: false },
        thursday: { open: '10:00', close: '23:00', isClosed: false },
        friday: { open: '10:00', close: '23:00', isClosed: false },
        saturday: { open: '10:00', close: '23:00', isClosed: false },
        sunday: { open: '10:00', close: '23:00', isClosed: false },
      },
    },
    contactDetails: {
      type: Object,
      default: {
        phone: '+91 98708 10734',
        whatsapp: '+91 98708 10734',
        email: 'info@salmanhairstudio.com',
        address: 'Shop No. 5, Manav Drishti Apartments, Lal Bahadur Shastri Marg, Opposite Kurla Court, Kurla West, Mumbai, Maharashtra 400070',
        plusCode: '3V7F+HP Mumbai, Maharashtra',
        googleMapsUrl: 'https://maps.app.goo.gl/WWVvviNqthgHYNjw7',
      },
    },
    socialLinks: {
      type: Object,
      default: {
        instagram: 'https://www.instagram.com/salmanhairstudio1/',
        facebook: 'https://facebook.com',
        youtube: 'https://youtube.com',
      },
    },
    salonSettings: {
      type: Object,
      default: {
        bufferTimeMinutes: 15,
        maxAdvanceBookingDays: 30,
        currency: 'INR',
        currencySymbol: '₹',
        taxPercentage: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
