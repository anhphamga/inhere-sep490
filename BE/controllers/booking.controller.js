const Booking = require('../model/Booking.model');
const mongoose = require('mongoose');
const { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } = require('../utils/guestVerification');
const { sendBookingEmail } = require('../services/bookingMail.service');

const toDateOnlyRange = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { $gte: start, $lte: end };
};

const createBooking = async (req, res) => {
  try {
    const {
      name = '',
      phone = '',
      email = '',
      date = '',
      time = '',
      category = '',
      productId = '',
      productName = '',
      productImage = '',
      note = '',
    } = req.body || {};

    const normalizedName = String(name).trim();
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedDate = new Date(date);

    if (!normalizedName || !normalizedPhone || !normalizedEmail || !date || !time || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const normalizedProductId = String(productId || '').trim();
    const validProductId = mongoose.Types.ObjectId.isValid(normalizedProductId)
      ? new mongoose.Types.ObjectId(normalizedProductId)
      : null;

    const created = await Booking.create({
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      date: normalizedDate,
      time: String(time).trim(),
      category: String(category).trim(),
      productId: validProductId,
      productName: String(productName || '').trim(),
      productImage: String(productImage || '').trim(),
      note: String(note || '').trim(),
      status: 'pending',
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating booking', error: error.message });
  }
};

const listBookings = async (req, res) => {
  try {
    const { status = '', date = '', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && ['pending', 'confirmed', 'rejected'].includes(String(status).toLowerCase())) {
      query.status = String(status).toLowerCase();
    }
    if (date) {
      const range = toDateOnlyRange(date);
      if (range) query.date = range;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Booking.find(query).sort({ date: 1, time: 1, createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
      Booking.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error listing bookings', error: error.message });
  }
};

const respondBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = '', staffNote = '' } = req.body || {};
    const normalizedStatus = String(status).trim().toLowerCase();

    if (!['confirmed', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      {
        status: normalizedStatus,
        staffNote: String(staffNote || '').trim(),
        respondedBy: req.user?.id || null,
        respondedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    try {
      await sendBookingEmail(updated);
    } catch (mailError) {
      console.error('sendBookingEmail error:', mailError);
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error responding booking', error: error.message });
  }
};

module.exports = {
  createBooking,
  listBookings,
  respondBooking,
};
