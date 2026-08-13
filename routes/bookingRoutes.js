const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/appointmentValidator');

// Legacy Booking Route Aliases
router
  .route('/')
  .post(validate(createAppointmentSchema), createAppointment)
  .get(protect, authorize('Super Admin', 'Manager', 'Receptionist'), getAppointments);

router
  .route('/:id')
  .patch(
    protect,
    authorize('Super Admin', 'Manager', 'Receptionist'),
    validate(updateAppointmentStatusSchema),
    updateAppointmentStatus
  )
  .delete(protect, authorize('Super Admin', 'Manager'), cancelAppointment);

module.exports = router;
