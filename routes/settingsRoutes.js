const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateSettingsSchema } = require('../validators/settingsValidator');

router
  .route('/')
  .get(getSettings)
  .put(protect, authorize('Super Admin', 'Manager'), validate(updateSettingsSchema), updateSettings);

module.exports = router;
