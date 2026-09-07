/**
 * Salman Hair Studio — Centralized Booking & Slot Configuration
 * Single source of truth for business hours, slot durations, and timezone.
 */

module.exports = {
  // Salon Operating Hours: 10:00 AM – 11:00 PM (10:00 – 23:00 IST)
  BUSINESS_HOURS: {
    openHour: 10,     // 10:00 AM
    closeHour: 23,    // 11:00 PM
    openTime: '10:00',
    closeTime: '23:00',
    days: 'Monday – Sunday',
  },

  // Slot duration in minutes (configurable)
  DEFAULT_SLOT_DURATION: 60,

  // Interval step in minutes between available slots
  STEP_MINUTES: 60,

  // Canonical Indian Standard Time timezone
  TIMEZONE: 'Asia/Kolkata',

  // Pending Hold duration in minutes
  PENDING_HOLD_MINUTES: parseInt(process.env.PENDING_HOLD_MINUTES ?? '30', 10),

  // Booking statuses
  STATUSES: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
    EXPIRED: 'Expired',
  },

  // Statuses that actively block a slot
  BLOCKING_STATUSES: ['Pending', 'Confirmed', 'Checked In', 'In Progress'],
};
