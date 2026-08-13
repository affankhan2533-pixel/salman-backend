const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Stylist = require('../models/Stylist');
const User = require('../models/User');
const { sendSuccess } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');

/**
 * @desc    Get Admin Dashboard Key Performance Metrics & Stats
 * @route   GET /api/dashboard/stats
 * @access  Private (Super Admin, Manager, Receptionist)
 */
exports.getDashboardStats = asyncWrapper(async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalAppointments = await Appointment.countDocuments();
  const todayAppointments = await Appointment.countDocuments({ date: todayStr });
  const upcomingAppointments = await Appointment.countDocuments({
    date: { $gte: todayStr },
    appointmentStatus: { $in: ['Confirmed', 'Pending'] },
  });
  const completedAppointments = await Appointment.countDocuments({ appointmentStatus: 'Completed' });
  const cancelledAppointments = await Appointment.countDocuments({ appointmentStatus: 'Cancelled' });

  // Revenue Summary from Completed Appointments
  const completedDocs = await Appointment.find({ appointmentStatus: 'Completed' })
    .select('price')
    .lean();
  const totalRevenue = completedDocs.reduce((sum, item) => sum + (item.price || 0), 0);

  // Most Popular Services (Top 5)
  const popularServices = await Appointment.aggregate([
    { $match: { appointmentStatus: { $ne: 'Cancelled' } } },
    { $group: { _id: '$service', bookingCount: { $sum: 1 }, totalRevenue: { $sum: '$price' } } },
    { $sort: { bookingCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: '_id',
        as: 'serviceDetails',
      },
    },
    { $unwind: { path: '$serviceDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        bookingCount: 1,
        totalRevenue: 1,
        title: '$serviceDetails.title',
        category: '$serviceDetails.category',
        price: '$serviceDetails.price',
      },
    },
  ]);

  // Most Booked Stylists (Top 5)
  const popularStylists = await Appointment.aggregate([
    { $match: { appointmentStatus: { $ne: 'Cancelled' } } },
    { $group: { _id: '$stylist', bookingCount: { $sum: 1 } } },
    { $sort: { bookingCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'stylists',
        localField: '_id',
        foreignField: '_id',
        as: 'stylistDetails',
      },
    },
    { $unwind: { path: '$stylistDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        bookingCount: 1,
        name: '$stylistDetails.name',
        title: '$stylistDetails.title',
        avatar: '$stylistDetails.avatar',
      },
    },
  ]);

  // Recent Customers (Last 5 Bookings)
  const recentCustomers = await Appointment.find()
    .select('clientName clientEmail clientPhone date startTime appointmentStatus price')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return sendSuccess(res, 'Dashboard metrics fetched successfully', {
    metrics: {
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
    },
    popularServices,
    popularStylists,
    recentCustomers,
  });
});

/**
 * @desc    Get Business Analytics Trends (Daily, Weekly, Monthly, Stylist Performance)
 * @route   GET /api/dashboard/analytics
 * @access  Private (Super Admin, Manager)
 */
exports.getAnalytics = asyncWrapper(async (req, res) => {
  // 1. Daily Bookings (Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const dailyTrend = await Appointment.aggregate([
    { $match: { date: { $gte: thirtyDaysAgoStr } } },
    { $group: { _id: '$date', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
    { $sort: { _id: 1 } },
  ]);

  // 2. Monthly Bookings & Revenue
  const monthlyTrend = await Appointment.aggregate([
    {
      $group: {
        _id: { $substr: ['$createdAt', 0, 7] }, // YYYY-MM
        count: { $sum: 1 },
        revenue: { $sum: '$price' },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 12 },
  ]);

  // 3. Service Popularity Share
  const serviceShare = await Appointment.aggregate([
    { $group: { _id: '$service', totalBookings: { $sum: 1 } } },
    {
      $lookup: {
        from: 'services',
        localField: '_id',
        foreignField: '_id',
        as: 'serviceInfo',
      },
    },
    { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title: '$serviceInfo.title',
        totalBookings: 1,
      },
    },
    { $sort: { totalBookings: -1 } },
  ]);

  // 4. Stylist Performance Breakdown
  const stylistPerformance = await Appointment.aggregate([
    {
      $group: {
        _id: '$stylist',
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Completed'] }, 1, 0] },
        },
        revenue: {
          $sum: { $cond: [{ $eq: ['$appointmentStatus', 'Completed'] }, '$price', 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'stylists',
        localField: '_id',
        foreignField: '_id',
        as: 'stylistInfo',
      },
    },
    { $unwind: { path: '$stylistInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: '$stylistInfo.name',
        title: '$stylistInfo.title',
        totalBookings: 1,
        completedBookings: 1,
        revenue: 1,
      },
    },
    { $sort: { totalBookings: -1 } },
  ]);

  return sendSuccess(res, 'Business analytics trends fetched successfully', {
    dailyTrend,
    monthlyTrend,
    serviceShare,
    stylistPerformance,
  });
});
