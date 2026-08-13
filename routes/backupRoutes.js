const express = require('express');
const router = express.Router();
const {
  exportAppointmentsCSV,
  exportCustomersCSV,
  exportDatabaseDump,
} = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/auth');

router.get('/export/appointments', protect, authorize('Super Admin', 'Manager'), exportAppointmentsCSV);
router.get('/export/customers', protect, authorize('Super Admin', 'Manager'), exportCustomersCSV);
router.get('/db', protect, authorize('Super Admin'), exportDatabaseDump);

module.exports = router;
