const express = require('express');
const router = express.Router();
const { getHolidays, createHoliday, deleteHoliday } = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createHolidaySchema } = require('../validators/holidayValidator');

router
  .route('/')
  .get(getHolidays)
  .post(protect, authorize('Super Admin', 'Manager'), validate(createHolidaySchema), createHoliday);

router
  .route('/:id')
  .delete(protect, authorize('Super Admin', 'Manager'), deleteHoliday);

module.exports = router;
