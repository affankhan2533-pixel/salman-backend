const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get Aggregated Customers List (Profiles, History, Total Spent)
 * @route   GET /api/customers
 * @access  Private (Super Admin, Manager, Receptionist)
 */
exports.getCustomers = asyncWrapper(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;

  const matchStage = {};
  if (search) {
    matchStage.$or = [
      { clientName: { $regex: search, $options: 'i' } },
      { clientPhone: { $regex: search, $options: 'i' } },
      { clientEmail: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const aggregatePipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$clientPhone',
        name: { $last: '$clientName' },
        email: { $last: '$clientEmail' },
        phone: { $first: '$clientPhone' },
        totalAppointments: { $sum: 1 },
        completedAppointments: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Completed'] }, 1, 0] },
        },
        cancelledAppointments: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Cancelled'] }, 1, 0] },
        },
        totalSpent: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Completed'] }, '$price', 0] },
        },
        lastAppointmentDate: { $max: '$date' },
        firstAppointmentDate: { $min: '$date' },
      },
    },
    {
      $addFields: {
        customerTier: {
          $cond: [
            { $gte: ['$totalSpent', 10000] },
            'VIP',
            { $cond: [{ $gt: ['$totalAppointments', 1] }, 'Returning', 'New'] },
          ],
        },
      },
    },
    { $sort: { lastAppointmentDate: -1 } },
    { $skip: skip },
    { $limit: Number(limit) },
  ];

  const customers = await Appointment.aggregate(aggregatePipeline);

  // Total count of distinct customers
  const countResult = await Appointment.aggregate([
    { $match: matchStage },
    { $group: { _id: '$clientPhone' } },
    { $count: 'total' },
  ]);

  const total = countResult[0] ? countResult[0].total : 0;

  const pagination = {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit)),
  };

  return sendSuccess(res, 'Customers list retrieved successfully', customers, 200, pagination);
});

/**
 * @desc    Get Customer Detailed Profile & Appointment History
 * @route   GET /api/customers/:phone
 * @access  Private (Admin)
 */
exports.getCustomerByPhone = asyncWrapper(async (req, res) => {
  const { phone } = req.params;

  const appointments = await Appointment.find({ clientPhone: phone })
    .populate('service', 'title category price duration')
    .populate('stylist', 'name title avatar')
    .sort({ date: -1, startTime: 1 });

  if (!appointments || appointments.length === 0) {
    return sendError(res, 'Customer profile not found', 404);
  }

  const first = appointments[0];
  const totalSpent = appointments
    .filter((a) => a.appointmentStatus === 'Completed')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  const profile = {
    name: first.clientName,
    email: first.clientEmail,
    phone: first.clientPhone,
    totalAppointments: appointments.length,
    totalSpent,
    tier: totalSpent >= 10000 ? 'VIP' : appointments.length > 1 ? 'Returning' : 'New',
    history: appointments,
  };

  return sendSuccess(res, 'Customer profile retrieved successfully', profile);
});
