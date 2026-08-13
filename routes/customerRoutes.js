const express = require('express');
const router = express.Router();
const { getCustomers, getCustomerByPhone } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('Super Admin', 'Manager', 'Receptionist'), getCustomers);
router.get('/:phone', protect, authorize('Super Admin', 'Manager', 'Receptionist'), getCustomerByPhone);

module.exports = router;
