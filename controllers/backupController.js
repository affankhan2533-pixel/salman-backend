const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Stylist = require('../models/Stylist');
const User = require('../models/User');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Gallery = require('../models/Gallery');
const Holiday = require('../models/Holiday');
const Settings = require('../models/Settings');
const { sendSuccess } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');
const logActivity = require('../utils/logActivity');

/**
 * Helper to escape CSV cell values
 */
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * @desc    Export Appointments to CSV File
 * @route   GET /api/backup/export/appointments
 * @access  Private (Super Admin, Manager)
 */
exports.exportAppointmentsCSV = asyncWrapper(async (req, res) => {
  const appointments = await Appointment.find()
    .populate('service', 'title price')
    .populate('stylist', 'name')
    .sort({ date: -1 });

  const headers = [
    'ID',
    'Client Name',
    'Client Email',
    'Client Phone',
    'Service',
    'Stylist',
    'Date',
    'Start Time',
    'End Time',
    'Duration (mins)',
    'Price (INR)',
    'Payment Status',
    'Appointment Status',
    'Notes',
    'Created At',
  ];

  const rows = appointments.map((a) => [
    escapeCSV(a._id),
    escapeCSV(a.clientName),
    escapeCSV(a.clientEmail),
    escapeCSV(a.clientPhone),
    escapeCSV(a.service?.title || 'Hair Cut & Style'),
    escapeCSV(a.stylist?.name || 'Salman Malik'),
    escapeCSV(a.date),
    escapeCSV(a.startTime),
    escapeCSV(a.endTime),
    escapeCSV(a.duration),
    escapeCSV(a.price),
    escapeCSV(a.paymentStatus),
    escapeCSV(a.appointmentStatus),
    escapeCSV(a.notes || ''),
    escapeCSV(a.createdAt ? new Date(a.createdAt).toISOString() : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  logActivity({ req, user: req.user, action: 'EXPORT_APPOINTMENTS_CSV', resource: 'Appointment' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=salman_appointments_${Date.now()}.csv`);
  return res.status(200).send(csvContent);
});

/**
 * @desc    Export Aggregated Customer Database to CSV
 * @route   GET /api/backup/export/customers
 * @access  Private (Super Admin, Manager)
 */
exports.exportCustomersCSV = asyncWrapper(async (req, res) => {
  const aggregatePipeline = [
    {
      $group: {
        _id: '$clientPhone',
        name: { $last: '$clientName' },
        email: { $last: '$clientEmail' },
        phone: { $first: '$clientPhone' },
        totalAppointments: { $sum: 1 },
        totalSpent: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Completed'] }, '$price', 0] },
        },
        lastVisit: { $max: '$date' },
      },
    },
    { $sort: { lastVisit: -1 } },
  ];

  const customers = await Appointment.aggregate(aggregatePipeline);

  const headers = ['Client Name', 'Email', 'Phone', 'Total Bookings', 'Total Spent (INR)', 'Tier', 'Last Visit'];
  const rows = customers.map((c) => [
    escapeCSV(c.name),
    escapeCSV(c.email),
    escapeCSV(c.phone),
    escapeCSV(c.totalAppointments),
    escapeCSV(c.totalSpent),
    escapeCSV(c.totalSpent >= 10000 ? 'VIP' : c.totalAppointments > 1 ? 'Returning' : 'New'),
    escapeCSV(c.lastVisit),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  logActivity({ req, user: req.user, action: 'EXPORT_CUSTOMERS_CSV', resource: 'User' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=salman_customers_${Date.now()}.csv`);
  return res.status(200).send(csvContent);
});

/**
 * @desc    Export Complete Database JSON Snapshot Backup
 * @route   GET /api/backup/db
 * @access  Private (Super Admin)
 */
exports.exportDatabaseDump = asyncWrapper(async (req, res) => {
  const backup = {
    timestamp: new Date().toISOString(),
    salon: 'Salman Hair Studio (Kurla West, Mumbai)',
    collections: {
      users: await User.find().select('-password').lean(),
      categories: await Category.find().lean(),
      services: await Service.find().lean(),
      stylists: await Stylist.find().lean(),
      appointments: await Appointment.find().lean(),
      reviews: await Review.find().lean(),
      gallery: await Gallery.find().lean(),
      holidays: await Holiday.find().lean(),
      settings: await Settings.find().lean(),
    },
  };

  logActivity({ req, user: req.user, action: 'CREATE_DATABASE_BACKUP', resource: 'System' });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=salman_db_backup_${Date.now()}.json`);
  return res.status(200).send(JSON.stringify(backup, null, 2));
});
