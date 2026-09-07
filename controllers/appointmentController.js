const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Category = require('../models/Category');
const Stylist = require('../models/Stylist');
const Slot = require('../models/Slot');
const Holiday = require('../models/Holiday');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const asyncWrapper = require('../utils/asyncWrapper');
const { triggerAppointmentNotification } = require('../services/notificationService');
const {
  BUSINESS_HOURS,
  DEFAULT_SLOT_DURATION,
  STEP_MINUTES,
  TIMEZONE,
  PENDING_HOLD_MINUTES: CONFIG_PENDING_HOLD,
  BLOCKING_STATUSES: CONFIG_BLOCKING_STATUSES,
} = require('../config/bookingConfig');

// ---------------------------------------------------------------------------
// PENDING HOLD CONFIG — single source of truth
// ---------------------------------------------------------------------------
const PENDING_HOLD_MINUTES = parseInt(process.env.PENDING_HOLD_MINUTES ?? String(CONFIG_PENDING_HOLD ?? 30), 10);

// ---------------------------------------------------------------------------
// Time conversion helpers
// ---------------------------------------------------------------------------
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  let str = timeStr.trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  str = str.replace(/(am|pm)/i, '').trim();
  const parts = str.split(':').map(Number);
  let hours = parts[0] || 0;
  const mins = parts[1] || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + mins;
};

const minutesToHHMM = (totalMins) => {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const minutesTo12h = (totalMins) => {
  let h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${suffix}`;
};

/**
 * Return true if a PENDING appointment should currently still block the slot.
 * A pending appointment is "active" if it was created within the hold window.
 */
const isPendingActive = (appointment) => {
  const status = appointment.appointmentStatus || appointment.status;
  if (status !== 'Pending' && status !== 'pending') return false;
  if (PENDING_HOLD_MINUTES <= 0) return true; // hold disabled → block indefinitely
  if (appointment.pendingExpiresAt) {
    return new Date() < new Date(appointment.pendingExpiresAt);
  }
  // Fallback: check createdAt
  const createdAt = appointment.createdAt ? new Date(appointment.createdAt) : null;
  if (!createdAt) return false;
  const expiresAt = new Date(createdAt.getTime() + PENDING_HOLD_MINUTES * 60 * 1000);
  return new Date() < expiresAt;
};

/**
 * Statuses that ACTIVELY block a slot for availability purposes.
 * Pending is handled separately via isPendingActive to respect expiry.
 */
const BLOCKING_STATUSES = CONFIG_BLOCKING_STATUSES || ['Pending', 'Confirmed', 'Checked In', 'In Progress'];

// ---------------------------------------------------------------------------

/**
 * @desc    Public Real-Time Availability Check
 * @route   GET /api/appointments/availability & GET /api/slots/available
 * @access  Public
 */
exports.getAvailability = asyncWrapper(async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const serviceInput = req.query.serviceId || req.query.service;
  const stylistInput = req.query.stylistId || req.query.stylist;

  // 1. Holiday Check
  const holiday = await Holiday.findOne({ date });
  if (holiday) {
    return sendSuccess(res, `Salon is closed on ${date} (${holiday.reason})`, [], 200, {
      date,
      slots: [],
      isHoliday: true,
      reason: holiday.reason,
    });
  }

  // 2. Resolve Service Duration (Default to 60 mins from config)
  let duration = DEFAULT_SLOT_DURATION || 60;
  let serviceDoc = null;
  if (serviceInput && serviceInput.match(/^[0-9a-fA-F]{24}$/)) {
    serviceDoc = await Service.findById(serviceInput);
  } else if (serviceInput) {
    serviceDoc = await Service.findOne({
      $or: [
        { slug: serviceInput },
        { title: { $regex: serviceInput.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' } },
      ],
    });
  }

  if (serviceDoc && serviceDoc.duration) {
    duration = serviceDoc.duration;
  }

  // 3. Resolve Stylist Filter
  let stylistDoc = null;
  if (stylistInput && stylistInput.match(/^[0-9a-fA-F]{24}$/)) {
    stylistDoc = await Stylist.findById(stylistInput);
  } else if (stylistInput) {
    stylistDoc = await Stylist.findOne({ name: { $regex: stylistInput, $options: 'i' } });
  }

  // 4. Fetch active appointments from Appointment collection (Single Source of Truth)
  const filter = {
    date,
    appointmentStatus: { $in: ['Pending', 'Confirmed', 'Checked In', 'In Progress', 'pending', 'confirmed'] },
  };
  if (stylistDoc) filter.stylist = stylistDoc._id;

  const existingAppts = await Appointment.find(filter)
    .select('startTime endTime duration stylist appointmentStatus createdAt pendingExpiresAt');

  // Build blocked intervals from active bookings
  const blockedIntervals = [];
  for (const app of existingAppts) {
    const isBlocking =
      ['Confirmed', 'Checked In', 'In Progress', 'confirmed'].includes(app.appointmentStatus) ||
      (['Pending', 'pending'].includes(app.appointmentStatus) && isPendingActive(app));
    if (!isBlocking) continue;

    blockedIntervals.push({
      start: timeToMinutes(app.startTime),
      end: timeToMinutes(app.endTime || minutesToHHMM(timeToMinutes(app.startTime) + (app.duration || 60))),
      stylistId: app.stylist ? app.stylist.toString() : null,
      status: app.appointmentStatus,
    });
  }

  // 5. Fetch manual salon administrative blocks from Slot
  const slotFilter = { date, status: 'blocked' };
  if (stylistDoc) slotFilter.stylist = stylistDoc._id;
  const blockedSlots = await Slot.find(slotFilter);

  blockedSlots.forEach((slot) => {
    blockedIntervals.push({
      start: timeToMinutes(slot.startTime),
      end: timeToMinutes(slot.endTime),
      stylistId: slot.stylist ? slot.stylist.toString() : null,
      status: slot.status,
    });
  });

  // 6. Centralized Salon Operating Time Slots (10:00 AM – 11:00 PM)
  const openMins = (BUSINESS_HOURS.openHour || 10) * 60;   // 10:00 AM
  const closeMins = (BUSINESS_HOURS.closeHour || 23) * 60;  // 11:00 PM
  const stepMins = STEP_MINUTES || 60;

  // Local IST check for past slots
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE || 'Asia/Kolkata' });
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE || 'Asia/Kolkata', hour12: false });
  const currentIstMins = timeToMinutes(istTimeStr);

  const slots = [];
  for (let current = openMins; current + duration <= closeMins; current += stepMins) {
    const slotStart = current;
    const slotEnd = current + duration;
    const startTime24 = minutesToHHMM(slotStart);
    const endTime24 = minutesToHHMM(slotEnd);
    const time12 = minutesTo12h(slotStart);

    const isPast = date < todayStr || (date === todayStr && slotStart <= currentIstMins);

    const isOccupied = blockedIntervals.some((b) => {
      const isOverlapping = slotStart < b.end && slotEnd > b.start;
      if (!isOverlapping) return false;
      if (stylistDoc && b.stylistId && b.stylistId !== stylistDoc._id.toString()) return false;
      return true;
    });

    const isAvailable = !isPast && !isOccupied;

    slots.push({
      time: time12,
      available: isAvailable,
      startTime: startTime24,
      endTime: endTime24,
      duration,
      status: isPast ? 'past' : isOccupied ? 'booked' : 'available',
      isAvailable,
      isBooked: isOccupied,
      isPast,
    });
  }

  return sendSuccess(res, `Availability for ${date} calculated successfully`, slots, 200, {
    date,
    slots,
  });
});

// ---------------------------------------------------------------------------

/**
 * @desc    Public Create Appointment Reservation
 * @route   POST /api/appointments & POST /api/bookings
 * @access  Public
 */
exports.createAppointment = asyncWrapper(async (req, res) => {
  const customerName = (req.body.customerName || req.body.clientName || req.body.name || '').trim();
  const phone = (req.body.phone || req.body.clientPhone || '').trim();
  const email = (req.body.email || req.body.clientEmail || '').trim();
  const date = req.body.date;
  const timeInput = req.body.time || req.body.startTime || '10:00 AM';
  const notes = req.body.notes || '';

  if (!customerName || !phone || !date) {
    return sendError(res, 'Please provide all required fields (customerName, phone, date)', 400);
  }

  // 1. Holiday Check
  const holiday = await Holiday.findOne({ date });
  if (holiday) {
    return sendError(res, `Booking unavailable: Salon is closed on ${date} (${holiday.reason})`, 400);
  }

  // 2. Resolve Service from Database (Source of Truth - Never trust client price)
  const serviceInput = req.body.serviceId || req.body.service || req.body.serviceName;
  let serviceDoc = null;

  if (serviceInput && typeof serviceInput === 'string' && serviceInput.match(/^[0-9a-fA-F]{24}$/)) {
    serviceDoc = await Service.findById(serviceInput);
  } else if (serviceInput && typeof serviceInput === 'string' && serviceInput.trim()) {
    const cleanInput = serviceInput.trim();
    const slugStr = cleanInput.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    serviceDoc = await Service.findOne({
      $or: [
        { slug: slugStr },
        { slug: cleanInput },
        { title: { $regex: cleanInput.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' } },
      ],
    });
  }

  // Fallback to first active service if not resolved
  if (!serviceDoc) {
    serviceDoc = await Service.findOne({ isActive: true });
  }
  if (!serviceDoc) {
    serviceDoc = await Service.create({
      title: 'Hair Cut',
      slug: 'male-haircut',
      category: 'Hair',
      price: 500,
      duration: 45,
      isActive: true,
    });
  }

  // 3. Resolve Stylist
  let stylistDoc;
  const stylistInput = req.body.stylistId || req.body.stylist;
  if (stylistInput && typeof stylistInput === 'string' && stylistInput.match(/^[0-9a-fA-F]{24}$/)) {
    stylistDoc = await Stylist.findById(stylistInput);
  } else if (stylistInput) {
    stylistDoc = await Stylist.findOne({ name: { $regex: stylistInput, $options: 'i' } });
  }
  if (!stylistDoc) stylistDoc = await Stylist.findOne({ isActive: true });
  if (!stylistDoc) {
    stylistDoc = await Stylist.create({ name: 'Salman Malik', title: 'Co-Owner & Master Hairstylist' });
  }

  const duration = serviceDoc?.duration || DEFAULT_SLOT_DURATION || 60;
  const startMins = timeToMinutes(timeInput);
  const endMins = startMins + duration;
  const startTime = minutesToHHMM(startMins);
  const endTime = minutesToHHMM(endMins);

  // 4. Operating Hours & Past Slot Validation
  const openMins = (BUSINESS_HOURS.openHour || 10) * 60;   // 10:00 AM
  const closeMins = (BUSINESS_HOURS.closeHour || 23) * 60;  // 11:00 PM
  if (startMins < openMins || endMins > closeMins) {
    return sendError(res, 'Selected appointment time is outside salon operating hours (10:00 AM – 11:00 PM)', 400);
  }

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE || 'Asia/Kolkata' });
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE || 'Asia/Kolkata', hour12: false });
  const currentIstMins = timeToMinutes(istTimeStr);

  if (date < todayStr || (date === todayStr && startMins <= currentIstMins)) {
    return sendError(res, 'Cannot book an appointment slot in the past.', 400);
  }

  // 5. SERVER-SIDE INTERVAL OVERLAP CHECK (read-phase check)
  const existingAppts = await Appointment.find({
    date,
    appointmentStatus: { $in: ['Pending', 'Confirmed', 'Checked In', 'In Progress', 'pending', 'confirmed'] },
  });

  const hasOverlap = existingAppts.some((app) => {
    const isBlocking =
      ['Confirmed', 'Checked In', 'In Progress', 'confirmed'].includes(app.appointmentStatus) ||
      (['Pending', 'pending'].includes(app.appointmentStatus) && isPendingActive(app));
    if (!isBlocking) return false;

    const appStartMins = timeToMinutes(app.startTime);
    const appEndMins = timeToMinutes(app.endTime || minutesToHHMM(appStartMins + (app.duration || 60)));
    return startMins < appEndMins && endMins > appStartMins;
  });

  if (hasOverlap) {
    return res.status(409).json({
      success: false,
      code: 'SLOT_ALREADY_BOOKED',
      error: 'SLOT_ALREADY_BOOKED',
      message: 'Sorry, this time slot has just been booked. Please choose another time.',
      data: null,
      errors: null,
    });
  }

  // Check manual administrative slot block
  const existingBlock = await Slot.findOne({
    date,
    startTime,
    status: 'blocked',
  });
  if (existingBlock) {
    return res.status(409).json({
      success: false,
      code: 'SLOT_ALREADY_BOOKED',
      error: 'SLOT_ALREADY_BOOKED',
      message: 'Sorry, this time slot has just been booked. Please choose another time.',
      data: null,
      errors: null,
    });
  }

  // 6. ATOMIC RESERVATION WITH DATABASE-LEVEL DUPLICATE KEY PROTECTION ON APPOINTMENT
  let createdAppointment;
  const pendingExpiresAt = PENDING_HOLD_MINUTES > 0
    ? new Date(Date.now() + PENDING_HOLD_MINUTES * 60 * 1000)
    : null;

  try {
    createdAppointment = await Appointment.create({
      clientName: customerName,
      clientPhone: phone,
      clientEmail: email,
      client: req.user ? req.user._id : null,
      service: serviceDoc._id,
      serviceId: serviceDoc.slug || serviceDoc._id.toString(),
      serviceName: serviceDoc.title,
      stylist: stylistDoc._id,
      date,
      startTime,
      endTime,
      duration,
      price: serviceDoc.price,
      notes,
      paymentStatus: 'Unpaid',
      appointmentStatus: 'Pending',
      pendingExpiresAt,
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      return res.status(409).json({
        success: false,
        code: 'SLOT_ALREADY_BOOKED',
        error: 'SLOT_ALREADY_BOOKED',
        message: 'Sorry, this time slot has just been booked. Please choose another time.',
        data: null,
        errors: null,
      });
    }
    throw err;
  }

  const populated = await Appointment.findById(createdAppointment._id)
    .populate('service', 'title category price duration slug')
    .populate('stylist', 'name title avatar');

  triggerAppointmentNotification('NEW_APPOINTMENT', populated);

  // Return formatted confirmation data
  return res.status(201).json({
    success: true,
    message: 'Appointment request received. Your selected time has been reserved and is awaiting confirmation.',
    data: {
      id: populated._id,
      bookingRef: populated.bookingRef,
      customerName: populated.clientName,
      clientName: populated.clientName,
      phone: populated.clientPhone,
      clientPhone: populated.clientPhone,
      service: populated.service?.title || populated.serviceName,
      serviceId: populated.serviceId || populated.service?.slug,
      serviceName: populated.serviceName || populated.service?.title,
      stylist: populated.stylist?.name,
      date: populated.date,
      time: minutesTo12h(timeToMinutes(populated.startTime)),
      startTime: populated.startTime,
      endTime: populated.endTime,
      duration: populated.duration,
      price: populated.price,
      status: populated.appointmentStatus,
      appointmentStatus: populated.appointmentStatus,
      pendingExpiresAt: populated.pendingExpiresAt,
    },
  });
});

// ---------------------------------------------------------------------------

/**
 * @desc    Public Customer Appointment Lookup (booking ref + phone verification)
 * @route   GET /api/appointments/lookup?ref=SHS-XXXXX&phone=9870...
 * @access  Public
 */
exports.lookupAppointment = asyncWrapper(async (req, res) => {
  const { ref, phone } = req.query;

  if (!ref || !phone) {
    return sendError(res, 'Both booking reference and phone number are required.', 400);
  }

  const cleanRef = ref.trim().toUpperCase();
  const cleanPhone = phone.trim().replace(/\D/g, ''); // digits only

  if (!/^SHS-[A-Z0-9]{5}$/.test(cleanRef)) {
    return sendError(res, 'Invalid booking reference format. Expected format: SHS-XXXXX', 400);
  }

  const appointment = await Appointment.findOne({ bookingRef: cleanRef })
    .populate('service', 'title duration price')
    .populate('stylist', 'name title');

  if (!appointment) {
    return sendError(res, 'No appointment found with that booking reference.', 404);
  }

  // Verify phone — strip non-digits and compare last 10 digits
  const storedPhone = appointment.clientPhone.replace(/\D/g, '');
  const inputLast10 = cleanPhone.slice(-10);
  const storedLast10 = storedPhone.slice(-10);

  if (inputLast10 !== storedLast10 || inputLast10.length < 8) {
    return sendError(res, 'Phone number does not match the booking record. Access denied.', 403);
  }

  // Determine effective status (handle expired pending inline)
  let effectiveStatus = appointment.appointmentStatus;
  if (
    appointment.appointmentStatus === 'Pending' &&
    !isPendingActive(appointment)
  ) {
    effectiveStatus = 'Expired';
  }

  // Return only safe fields — no email, no internal IDs
  return sendSuccess(res, 'Appointment found.', {
    bookingRef: appointment.bookingRef,
    appointmentStatus: effectiveStatus,
    service: appointment.service?.title,
    stylist: appointment.stylist?.name,
    date: appointment.date,
    startTime: appointment.startTime,
    duration: appointment.duration,
    price: appointment.price,
    pendingExpiresAt: appointment.pendingExpiresAt,
    createdAt: appointment.createdAt,
  });
});

// ---------------------------------------------------------------------------

/**
 * @desc    Get All Appointments (Admin with Filters)
 * @route   GET /api/appointments
 * @access  Private (Admin, Manager, Receptionist)
 */
exports.getAppointments = asyncWrapper(async (req, res) => {
  const { date, dateRange, status, stylist, service, search, page = 1, limit = 25 } = req.query;
  const filter = {};

  const nowIST = new Date();
  const todayStr = nowIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istTimeStr = nowIST.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
  const currentIstMins = timeToMinutes(istTimeStr);

  let sortCriteria = { date: 1, startTime: 1 }; // Default: nearest first

  // Exact date OR date range filter
  if (date) {
    filter.date = date;
    sortCriteria = { startTime: 1 };
  } else if (dateRange) {
    const tomorrow = new Date(nowIST);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    if (dateRange === 'today') {
      filter.date = todayStr;
      sortCriteria = { startTime: 1 };
    } else if (dateRange === 'tomorrow') {
      filter.date = tomorrowStr;
      sortCriteria = { startTime: 1 };
    } else if (dateRange === 'upcoming') {
      filter.date = { $gte: todayStr };
      sortCriteria = { date: 1, startTime: 1 };
    } else if (dateRange === 'all') {
      sortCriteria = { date: -1, startTime: 1 };
    }
  } else if (status === 'Pending') {
    sortCriteria = { date: 1, startTime: 1 };
  } else if (!status && !search) {
    sortCriteria = { date: -1, startTime: 1 };
  }

  if (status) {
    if (status === 'Accepted') filter.appointmentStatus = 'Confirmed';
    else if (status === 'Rejected') filter.appointmentStatus = 'Cancelled';
    else filter.appointmentStatus = status;
  }
  if (stylist) filter.stylist = stylist;
  if (service) filter.service = service;

  if (search) {
    const searchOrConditions = [
      { clientName: { $regex: search, $options: 'i' } },
      { clientPhone: { $regex: search, $options: 'i' } },
      { clientEmail: { $regex: search, $options: 'i' } },
      { bookingRef: { $regex: search.toUpperCase(), $options: 'i' } },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOrConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchOrConditions;
    }
  }

  const appointments = await Appointment.find(filter)
    .populate('service', 'title category price duration')
    .populate('stylist', 'name title avatar')
    .sort(sortCriteria);

  // Annotate effective status for pending expired records
  let annotated = appointments.map((appt) => {
    const obj = appt.toObject();
    if (obj.appointmentStatus === 'Pending' && !isPendingActive(appt)) {
      obj.effectiveStatus = 'Expired';
    } else {
      obj.effectiveStatus = obj.appointmentStatus;
    }
    return obj;
  });

  // Strict UPCOMING check: if date === todayStr, startTime must be > currentIstMins
  if (dateRange === 'upcoming') {
    annotated = annotated.filter((a) => {
      if (a.date > todayStr) return true;
      if (a.date === todayStr) {
        const startMins = timeToMinutes(a.startTime);
        return startMins > currentIstMins;
      }
      return false;
    });
  }

  if (status) {
    const targetStatus = status === 'Accepted' ? 'Confirmed' : status === 'Rejected' ? 'Cancelled' : status;
    annotated = annotated.filter((a) => a.effectiveStatus === targetStatus);
  }

  // Bounded memory pagination
  const total = annotated.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;
  const paginatedResults = annotated.slice(skip, skip + limitNum);

  const pagination = {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum) || 1,
    hasMore: skip + limitNum < total,
  };

  return sendSuccess(res, 'Appointments list fetched successfully', paginatedResults, 200, pagination);
});

// ---------------------------------------------------------------------------

/**
 * @desc    Get Single Appointment (Admin)
 * @route   GET /api/appointments/:id
 * @access  Private
 */
exports.getAppointment = asyncWrapper(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('service', 'title category price duration')
    .populate('stylist', 'name title avatar');

  if (!appointment) return sendError(res, 'Appointment not found', 404);

  const obj = appointment.toObject();
  if (obj.appointmentStatus === 'Pending' && !isPendingActive(appointment)) {
    obj.effectiveStatus = 'Expired';
  } else {
    obj.effectiveStatus = obj.appointmentStatus;
  }

  return sendSuccess(res, 'Appointment details fetched successfully', obj);
});

// ---------------------------------------------------------------------------

/**
 * @desc    Update Appointment Status
 * @route   PATCH /api/appointments/:id/status
 * @access  Private (Admin, Manager, Receptionist)
 */
exports.updateAppointmentStatus = asyncWrapper(async (req, res) => {
  let { status, appointmentStatus, paymentStatus } = req.body;
  let newStatus = appointmentStatus || status;

  // Map Legacy Statuses
  if (newStatus === 'Accepted') newStatus = 'Confirmed';
  if (newStatus === 'Rejected') newStatus = 'Cancelled';

  let appointment = await Appointment.findById(req.params.id);
  if (!appointment) return sendError(res, 'Appointment not found', 404);

  const currentStatus = appointment.appointmentStatus;

  // Guard: do not allow completing an expired/cancelled appointment without re-confirming
  if (newStatus === 'Completed' && ['Cancelled', 'No Show', 'Expired'].includes(currentStatus)) {
    return sendError(
      res,
      `Cannot mark a ${currentStatus} appointment as Completed. Please re-confirm first.`,
      400
    );
  }

  if (newStatus) {
    appointment.appointmentStatus = newStatus;
    // When admin confirms, clear the pending expiry and release slot lock upgrade
    if (newStatus === 'Confirmed') {
      appointment.pendingExpiresAt = null;
    }
  }
  if (paymentStatus) appointment.paymentStatus = paymentStatus;
  await appointment.save();

  // Release slot on terminal non-active statuses
  if (['Cancelled', 'No Show', 'Expired'].includes(newStatus)) {
    await Slot.deleteMany({
      $or: [
        { appointment: appointment._id },
        { stylist: appointment.stylist, date: appointment.date, startTime: appointment.startTime },
      ],
    });
  }

  // On Completed: release the physical slot lock so future rebooks are possible
  // (Historical record stays in DB but the time slot is free again)
  if (newStatus === 'Completed') {
    await Slot.deleteMany({
      $or: [
        { appointment: appointment._id },
        { stylist: appointment.stylist, date: appointment.date, startTime: appointment.startTime },
      ],
    });
  }

  const updated = await Appointment.findById(appointment._id)
    .populate('service', 'title price')
    .populate('stylist', 'name');

  if (newStatus === 'Confirmed') triggerAppointmentNotification('APPOINTMENT_CONFIRMED', updated);
  else if (newStatus === 'Cancelled') triggerAppointmentNotification('APPOINTMENT_CANCELLED', updated);
  else if (newStatus === 'Completed') triggerAppointmentNotification('APPOINTMENT_COMPLETED', updated);

  return sendSuccess(res, `Appointment status updated to ${newStatus}`, updated);
});

// ---------------------------------------------------------------------------

/**
 * @desc    Reschedule Appointment
 * @route   PATCH /api/appointments/:id/reschedule
 * @access  Private
 */
exports.rescheduleAppointment = asyncWrapper(async (req, res) => {
  const { date, startTime, stylistId } = req.body;

  let appointment = await Appointment.findById(req.params.id);
  if (!appointment) return sendError(res, 'Appointment not found', 404);

  const holiday = await Holiday.findOne({ date });
  if (holiday) {
    return sendError(res, `Reschedule unavailable: Salon is closed on ${date} (${holiday.reason})`, 400);
  }

  const targetStylistId = stylistId || appointment.stylist;
  const existingSlot = await Slot.findOne({
    stylist: targetStylistId,
    date,
    startTime,
    status: { $in: ['booked', 'blocked'] },
  });

  if (existingSlot && existingSlot.appointment?.toString() !== appointment._id.toString()) {
    return sendError(res, 'Requested new slot is not available', 409);
  }

  // Release old slot
  await Slot.deleteMany({
    $or: [
      { appointment: appointment._id },
      { stylist: appointment.stylist, date: appointment.date, startTime: appointment.startTime },
    ],
  });

  const endTime = minutesToHHMM(timeToMinutes(startTime) + (appointment.duration || 60));

  appointment.date = date;
  appointment.startTime = startTime;
  appointment.endTime = endTime;
  if (stylistId) appointment.stylist = stylistId;
  appointment.appointmentStatus = 'Confirmed';
  appointment.pendingExpiresAt = null;
  await appointment.save();

  await Slot.create({ stylist: targetStylistId, date, startTime, endTime, status: 'booked', appointment: appointment._id });

  const updated = await Appointment.findById(appointment._id)
    .populate('service', 'title price')
    .populate('stylist', 'name');

  triggerAppointmentNotification('APPOINTMENT_RESCHEDULED', updated);
  return sendSuccess(res, 'Appointment rescheduled successfully', updated);
});

// ---------------------------------------------------------------------------

/**
 * @desc    Cancel Appointment & Release Slot
 * @route   DELETE /api/appointments/:id
 * @access  Private
 */
exports.cancelAppointment = asyncWrapper(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return sendError(res, 'Appointment not found', 404);

  appointment.appointmentStatus = 'Cancelled';
  await appointment.save();

  await Slot.deleteMany({
    $or: [
      { appointment: appointment._id },
      { stylist: appointment.stylist, date: appointment.date, startTime: appointment.startTime },
    ],
  });

  triggerAppointmentNotification('APPOINTMENT_CANCELLED', appointment);
  return sendSuccess(res, 'Appointment cancelled and slot released successfully');
});

// ---------------------------------------------------------------------------

/**
 * @desc    Dashboard Metrics Statistics
 * @route   GET /api/appointments/stats
 * @access  Private
 */
exports.getDashboardStats = asyncWrapper(async (req, res) => {
  const nowIST = new Date();
  const todayStr = nowIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const totalBookings = await Appointment.countDocuments();
  const todayBookings = await Appointment.countDocuments({ date: todayStr });
  const upcomingBookings = await Appointment.countDocuments({
    date: { $gte: todayStr },
    appointmentStatus: { $in: ['Confirmed', 'Pending'] },
  });
  const completedBookings = await Appointment.countDocuments({ appointmentStatus: 'Completed' });
  const cancelledBookings = await Appointment.countDocuments({ appointmentStatus: 'Cancelled' });
  const pendingBookings = await Appointment.countDocuments({ appointmentStatus: 'Pending' });
  const confirmedBookings = await Appointment.countDocuments({ appointmentStatus: 'Confirmed' });

  const completedDocs = await Appointment.find({ appointmentStatus: 'Completed' }).select('price');
  const totalRevenue = completedDocs.reduce((sum, item) => sum + (item.price || 0), 0);

  // Today's appointments sorted by time for dashboard snapshot
  const todayAppointments = await Appointment.find({ date: todayStr })
    .populate('service', 'title')
    .populate('stylist', 'name')
    .sort({ startTime: 1 });

  return sendSuccess(res, 'Dashboard statistics fetched successfully', {
    totalBookings,
    todayBookings,
    upcomingBookings,
    completedBookings,
    cancelledBookings,
    pendingBookings,
    confirmedBookings,
    totalRevenue,
    todayAppointments,
    pendingHoldMinutes: PENDING_HOLD_MINUTES,
  });
});
