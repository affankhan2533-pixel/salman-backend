const express = require('express');
const router = express.Router();
const { getDashboardStats, getAnalytics } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, authorize('Super Admin', 'Manager', 'Receptionist'), getDashboardStats);
router.get('/analytics', protect, authorize('Super Admin', 'Manager'), getAnalytics);

module.exports = router;
