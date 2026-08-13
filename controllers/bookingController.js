const Booking = require('../models/Booking');

/**
 * @desc    Create new Atelier Booking Reservation
 * @route   POST /api/bookings
 * @access  Public
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { name, phone, email, service, date, time, stylist, notes } = req.body;

    // 1. Validation
    if (!name || !phone || !email || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, phone, email, service, date, time)',
      });
    }

    // Phone validation (simple 10+ digit check)
    const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number',
      });
    }

    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // 2. Check for duplicate booking slot collision (same date, time & service)
    const existingSlot = await Booking.findOne({ date, time, service, status: { $ne: 'Rejected' } });
    if (existingSlot) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already reserved for the selected service. Please choose another time.',
      });
    }

    // 3. Create Booking Record
    const booking = await Booking.create({
      name,
      phone,
      email,
      service,
      date,
      time,
      stylist: stylist || 'Senior Master Stylist',
      notes: notes || '',
      status: 'Pending',
    });

    res.status(201).json({
      success: true,
      message: 'Atelier booking reservation submitted successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get All Bookings (Admin Dashboard)
 * @route   GET /api/bookings
 * @access  Public (Admin)
 */
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Booking Status (Accept / Reject / Complete)
 * @route   PATCH /api/bookings/:id
 * @access  Public (Admin)
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Accepted', 'Rejected', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete Booking Record
 * @route   DELETE /api/bookings/:id
 * @access  Public (Admin)
 */
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking record deleted',
    });
  } catch (error) {
    next(error);
  }
};
