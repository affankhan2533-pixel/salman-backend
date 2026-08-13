const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('Super Admin', 'Manager', 'Receptionist'), getNotifications);
router.patch('/read-all', protect, authorize('Super Admin', 'Manager'), markAllAsRead);
router.patch('/:id/read', protect, authorize('Super Admin', 'Manager'), markAsRead);

module.exports = router;
