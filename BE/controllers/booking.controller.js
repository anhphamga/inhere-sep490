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

const toTimeMinutes = (value = '') => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const BOOKING_MIN_TIME = '08:00';
const BOOKING_MAX_TIME = '22:00';

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
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }
    if (!isValidPhone(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    }
    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Ngày hẹn không hợp lệ' });
    }

    const normalizedTime = String(time || '').trim();
    const timeInMinutes = toTimeMinutes(normalizedTime);
    const minTime = toTimeMinutes(BOOKING_MIN_TIME);
    const maxTime = toTimeMinutes(BOOKING_MAX_TIME);
    if (timeInMinutes === null || minTime === null || maxTime === null) {
      return res.status(400).json({ success: false, message: 'Giờ hẹn không hợp lệ' });
    }
    if (timeInMinutes < minTime || timeInMinutes > maxTime) {
      return res.status(400).json({ success: false, message: `Giờ hẹn chỉ được chọn từ ${BOOKING_MIN_TIME} đến ${BOOKING_MAX_TIME}` });
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
      time: normalizedTime,
      category: String(category).trim(),
      productId: validProductId,
      productName: String(productName || '').trim(),
      productImage: String(productImage || '').trim(),
      note: String(note || '').trim(),
      status: 'pending',
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể tạo lịch hẹn lúc này', error: error.message });
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
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách lịch hẹn', error: error.message });
  }
};

const respondBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = '', staffNote = '' } = req.body || {};
    const normalizedStatus = String(status).trim().toLowerCase();

    if (!['confirmed', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái phản hồi không hợp lệ' });
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
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    try {
      await sendBookingEmail(updated);
    } catch (mailError) {
      console.error('sendBookingEmail error:', mailError);
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Không thể phản hồi lịch hẹn lúc này', error: error.message });
  }
};

module.exports = {
  createBooking,
  listBookings,
  respondBooking,
};
