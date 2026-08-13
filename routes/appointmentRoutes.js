const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAvailability,
  getAppointments,
  getAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  getDashboardStats,
  lookupAppointment,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} = require('../validators/appointmentValidator');

// Public Real-time Availability Route
router.get('/availability', getAvailability);

// Public Customer Lookup (booking ref + phone — no auth, privacy enforced in controller)
router.get('/lookup', lookupAppointment);

// Public Booking Creation
router.post('/', validate(createAppointmentSchema), createAppointment);

// Admin Dashboard Stats
router.get(
  '/stats',
  protect,
  authorize('Super Admin', 'Manager', 'Receptionist'),
  getDashboardStats
);

// Admin List & Search (supports ?date, ?dateRange=today|tomorrow|upcoming, ?status, ?search)
router.get(
  '/',
  protect,
  authorize('Super Admin', 'Manager', 'Receptionist'),
  getAppointments
);

router
  .route('/:id')
  .get(protect, getAppointment)
  .delete(protect, cancelAppointment);

router.patch(
  '/:id/status',
  protect,
  authorize('Super Admin', 'Manager', 'Receptionist'),
  validate(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

router.patch(
  '/:id/reschedule',
  protect,
  validate(rescheduleAppointmentSchema),
  rescheduleAppointment
);

module.exports = router;
