const Shift = require('../model/Shift.model');
const ShiftAssignment = require('../model/ShiftAssignment.model');
const User = require('../model/User.model');

const toDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateFromWorkDateTime = (workDate, time) => {
  if (!workDate || !time) return null;
  return toDate(`${workDate}T${time}:00`);
};

const normalizeDateString = (value) => {
  if (!value) return null;
  const parsed = toDate(value);
  if (!parsed) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeTimeString = (value) => {
  if (!value) return null;
  const parsed = toDate(`2000-01-01T${String(value).slice(0, 5)}:00`);
  if (!parsed) return null;
  const h = String(parsed.getHours()).padStart(2, '0');
  const m = String(parsed.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const sanitizeShift = (shift) => ({
  id: shift._id,
  code: shift.code || null,
  name: shift.name || shift.title || '',
  title: shift.title || shift.name || '',
  workDate: shift.workDate || normalizeDateString(shift.startAt),
  startTime: shift.startTime || normalizeTimeString(shift.startAt),
  endTime: shift.endTime || normalizeTimeString(shift.endAt),
  maxStaff: Number(shift.maxStaff || 0),
  assignedCount: Number(shift.assignedCount || (Array.isArray(shift.staffIds) ? shift.staffIds.length : 0)),
  status: shift.status || 'OPEN',
  allowRegistration: shift.allowRegistration !== false,
  startAt: shift.startAt,
  endAt: shift.endAt,
  staffIds: Array.isArray(shift.staffIds) ? shift.staffIds : [],
  note: shift.note || '',
  notes: shift.note || '',
  createdAt: shift.createdAt,
  updatedAt: shift.updatedAt,
});

const normalizeShiftPayload = (payload = {}, { partial = false } = {}) => {
  const normalized = {};

  const workDate = payload.workDate != null ? String(payload.workDate).trim() : null;
  const startTime = payload.startTime != null ? String(payload.startTime).trim() : null;
  const endTime = payload.endTime != null ? String(payload.endTime).trim() : null;

  const parsedStartAt = payload.startAt != null ? toDate(payload.startAt) : null;
  const parsedEndAt = payload.endAt != null ? toDate(payload.endAt) : null;
  const startAt = parsedStartAt || buildDateFromWorkDateTime(workDate, startTime);
  const endAt = parsedEndAt || buildDateFromWorkDateTime(workDate, endTime);

  if (!partial || payload.title != null || payload.name != null) {
    const name = String(payload.name != null ? payload.name : (payload.title || '')).trim();
    normalized.name = name;
    normalized.title = name;
  }
  if (!partial || payload.code != null) normalized.code = payload.code ? String(payload.code).trim() : null;
  if (!partial || payload.workDate != null) normalized.workDate = workDate;
  if (!partial || payload.startTime != null) normalized.startTime = startTime;
  if (!partial || payload.endTime != null) normalized.endTime = endTime;
  if (!partial || payload.note != null || payload.notes != null) {
    normalized.note = String(payload.note != null ? payload.note : (payload.notes || '')).trim();
  }
  if (!partial || payload.maxStaff != null) normalized.maxStaff = Math.max(Number(payload.maxStaff || 0), 0);
  if (!partial || payload.assignedCount != null) normalized.assignedCount = Math.max(Number(payload.assignedCount || 0), 0);
  if (!partial || payload.status != null) normalized.status = String(payload.status || 'OPEN').trim().toUpperCase();
  if (!partial || payload.allowRegistration != null) normalized.allowRegistration = payload.allowRegistration !== false;

  if (startAt) normalized.startAt = startAt;
  if (endAt) normalized.endAt = endAt;

  if (payload.staffIds != null || !partial) {
    normalized.staffIds = Array.isArray(payload.staffIds)
      ? [...new Set(payload.staffIds.filter(Boolean))]
      : [];
  }

  return normalized;
};

const validateShiftDates = (startAt, endAt) => {
  if (!startAt || !endAt) return 'startAt and endAt are required';
  if (Number.isNaN(new Date(startAt).getTime()) || Number.isNaN(new Date(endAt).getTime())) {
    return 'startAt or endAt is invalid';
  }
  if (new Date(startAt) >= new Date(endAt)) return 'startAt must be earlier than endAt';
  return null;
};

const validateStaffIds = async (staffIds = []) => {
  if (!Array.isArray(staffIds) || staffIds.length === 0) return null;
  const staffCount = await User.countDocuments({
    _id: { $in: staffIds },
    role: 'staff',
  });
  if (staffCount !== staffIds.length) return 'Some staffIds are invalid';
  return null;
};

const createShift = async (req, res) => {
  try {
    const normalized = normalizeShiftPayload(req.body || {}, { partial: false });
    const dateError = validateShiftDates(normalized.startAt, normalized.endAt);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const staffError = await validateStaffIds(normalized.staffIds);
    if (staffError) return res.status(400).json({ success: false, message: staffError });

    const shift = await Shift.create(normalized);
    return res.status(201).json({
      success: true,
      message: 'Create shift successfully',
      data: sanitizeShift(shift),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error creating shift',
      error: error.message,
    });
  }
};

const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const normalized = normalizeShiftPayload(req.body || {}, { partial: true });

    if (Object.prototype.hasOwnProperty.call(normalized, 'staffIds')) {
      const staffError = await validateStaffIds(normalized.staffIds);
      if (staffError) return res.status(400).json({ success: false, message: staffError });
    }

    const existing = await Shift.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    const nextStart = normalized.startAt || existing.startAt;
    const nextEnd = normalized.endAt || existing.endAt;
    const dateError = validateShiftDates(nextStart, nextEnd);
    if (dateError) return res.status(400).json({ success: false, message: dateError });

    const shift = await Shift.findByIdAndUpdate(id, normalized, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Update shift successfully',
      data: sanitizeShift(shift),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating shift',
      error: error.message,
    });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Shift.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Delete shift successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting shift',
      error: error.message,
    });
  }
};

const listShifts = async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = {};

    if (from || to) {
      const fromDate = from ? toDate(from) : null;
      const toDateValue = to ? toDate(to) : null;
      if ((from && !fromDate) || (to && !toDateValue)) {
        return res.status(400).json({
          success: false,
          message: 'from or to is invalid',
        });
      }
      if (fromDate) query.endAt = { ...(query.endAt || {}), $gt: fromDate };
      if (toDateValue) query.startAt = { ...(query.startAt || {}), $lt: toDateValue };
    }

    const shifts = await Shift.find(query).sort({ startAt: 1 });
    return res.status(200).json({
      success: true,
      message: 'Get shifts successfully',
      data: shifts.map(sanitizeShift),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting shifts',
      error: error.message,
    });
  }
};

const listStaffShiftOptions = async (req, res) => {
  try {
    const { from, to } = req.query;
    const staffId = String(req.user?.id || '');
    const query = {};

    if (from || to) {
      const fromDate = from ? toDate(from) : null;
      const toDateValue = to ? toDate(to) : null;
      if ((from && !fromDate) || (to && !toDateValue)) {
        return res.status(400).json({
          success: false,
          message: 'from or to is invalid',
        });
      }
      if (fromDate) query.endAt = { ...(query.endAt || {}), $gt: fromDate };
      if (toDateValue) query.startAt = { ...(query.startAt || {}), $lt: toDateValue };
    }

    const shifts = await Shift.find(query).sort({ startAt: 1 });
    const data = shifts.map((shift) => {
      const row = sanitizeShift(shift);
      const normalizedStaffIds = (row.staffIds || []).map((item) => String(item?._id || item));
      const isRegistered = normalizedStaffIds.includes(staffId);
      const remainingSlots = Math.max(Number(row.maxStaff || 0) - Number(row.assignedCount || 0), 0);
      return {
        ...row,
        isRegistered,
        remainingSlots,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Get staff shifts successfully',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error getting staff shifts',
      error: error.message,
    });
  }
};

const registerMyShift = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = String(req.user?.id || '');
    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    if (String(shift.status || '').toUpperCase() === 'DONE' || String(shift.status || '').toUpperCase() === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Shift cannot be registered in current status',
      });
    }

    const normalizedStaffIds = Array.isArray(shift.staffIds)
      ? shift.staffIds.map((item) => String(item))
      : [];
    const alreadyRegistered = normalizedStaffIds.includes(staffId);

    if (!alreadyRegistered) {
      if (shift.allowRegistration === false) {
        return res.status(400).json({
          success: false,
          message: 'Shift registration is locked',
        });
      }

      const maxStaff = Math.max(Number(shift.maxStaff || 0), 0);
      const assignedCount = normalizedStaffIds.length;
      if (maxStaff > 0 && assignedCount >= maxStaff) {
        return res.status(400).json({
          success: false,
          message: 'Shift is full',
        });
      }

      shift.staffIds = [...new Set([...normalizedStaffIds, staffId])];
      shift.assignedCount = shift.staffIds.length;
      if (maxStaff > 0 && shift.assignedCount >= maxStaff) {
        shift.status = 'FULL';
      } else if (shift.allowRegistration === false) {
        shift.status = 'LOCKED';
      } else {
        shift.status = 'OPEN';
      }
      await shift.save();
    }

    await ShiftAssignment.updateOne(
      { shiftId: shift._id, staffId },
      {
        $set: {
          shiftCode: shift.code || '',
          status: 'PENDING',
          attendanceStatus: 'NOT_CHECKED_IN',
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Register shift successfully',
      data: {
        ...sanitizeShift(shift),
        isRegistered: true,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error registering shift',
      error: error.message,
    });
  }
};

const unregisterMyShift = async (req, res) => {
  try {
    const { id } = req.params;
    const staffId = String(req.user?.id || '');
    const shift = await Shift.findById(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found',
      });
    }

    const normalizedStaffIds = Array.isArray(shift.staffIds)
      ? shift.staffIds.map((item) => String(item))
      : [];
    const nextStaffIds = normalizedStaffIds.filter((item) => item !== staffId);
    const wasRegistered = nextStaffIds.length !== normalizedStaffIds.length;

    if (wasRegistered) {
      shift.staffIds = nextStaffIds;
      shift.assignedCount = nextStaffIds.length;

      if (String(shift.status || '').toUpperCase() === 'FULL') {
        if (shift.allowRegistration === false) shift.status = 'LOCKED';
        else shift.status = 'OPEN';
      }
      await shift.save();
    }

    await ShiftAssignment.deleteOne({ shiftId: shift._id, staffId });

    return res.status(200).json({
      success: true,
      message: 'Unregister shift successfully',
      data: {
        ...sanitizeShift(shift),
        isRegistered: false,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error unregistering shift',
      error: error.message,
    });
  }
};

module.exports = {
  createShift,
  updateShift,
  deleteShift,
  listShifts,
  listStaffShiftOptions,
  registerMyShift,
  unregisterMyShift,
};
