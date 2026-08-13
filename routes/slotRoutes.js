const express = require('express');
const router = express.Router();
const { getAvailability } = require('../controllers/appointmentController');
const {
  generateSlots,
  toggleBlockSlot,
} = require('../controllers/slotController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateSlotsSchema, blockSlotSchema } = require('../validators/slotValidator');

router.get('/available', getAvailability);

router.post(
  '/generate',
  protect,
  authorize('Super Admin', 'Manager'),
  validate(generateSlotsSchema),
  generateSlots
);

router.patch(
  '/:id/block',
  protect,
  authorize('Super Admin', 'Manager'),
  validate(blockSlotSchema),
  toggleBlockSlot
);

module.exports = router;
