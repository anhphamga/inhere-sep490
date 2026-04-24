const Shift = require('../model/Shift.model');
const ShiftRegistration = require('../model/ShiftRegistration.model');

const { SHIFT_STATUS } = Shift;
const { SHIFT_REGISTRATION_STATUS } = ShiftRegistration;

const recomputeShiftStatus = (shift) => {
  const current = String(shift?.status || '').trim();
  if (current === SHIFT_STATUS.CLOSED) {
    return SHIFT_STATUS.CLOSED;
  }

  const requiredStaff = Number(shift?.requiredStaff || 0);
  const assignedCount = Array.isArray(shift?.assignedStaffIds)
    ? shift.assignedStaffIds.length
    : 0;

  if (requiredStaff > 0 && assignedCount >= requiredStaff) {
    return SHIFT_STATUS.FULL;
  }

  return SHIFT_STATUS.OPEN;
};

const sanitizeShiftForStaff = (shift) => {
  if (!shift) return shift;
  const plain = typeof shift.toObject === 'function' ? shift.toObject() : { ...shift };
  const assignedStaffCount = Array.isArray(plain.assignedStaffIds) ? plain.assignedStaffIds.length : 0;
  delete plain.assignedStaffIds;
  plain.assignedStaffCount = assignedStaffCount;
  return plain;
};

const buildShiftDateTime = (shiftDate, timeText) => {
  if (!shiftDate || !timeText) return null;
  const date = new Date(shiftDate);
  if (Number.isNaN(date.getTime())) return null;
  const parts = String(timeText).trim().split(':');
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (![hours, minutes].every((v) => Number.isInteger(v))) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return Number.isNaN(value.getTime()) ? null : value;
};

// Active shift for staff = APPROVED + checked-in + not checked-out + shift not CLOSED.
const getActiveShiftForStaff = async (staffId, options = {}) => {
  const id = String(staffId || '').trim();
  if (!id) return null;

  const query = ShiftRegistration.findOne({
    staffId: id,
    status: SHIFT_REGISTRATION_STATUS.APPROVED,
    checkInAt: { $ne: null },
    checkOutAt: null,
  })
    .sort({ checkInAt: -1, createdAt: -1 })
    .populate('shiftId');

  if (options.session) {
    query.session(options.session);
  }

  const registration = await query;
  if (!registration) return null;

  const shift = registration.shiftId;
  if (!shift) return null;
  if (String(shift.status) === SHIFT_STATUS.CLOSED) return null;

  const shiftEndAt = buildShiftDateTime(shift.date, shift.endTime);
  const isExpired = Boolean(shiftEndAt && Date.now() > shiftEndAt.getTime());
  if (isExpired && options.includeExpired !== true) {
    return null;
  }

  return { shift, registration, expired: isExpired, shiftEndAt };
};

module.exports = {
  recomputeShiftStatus,
  sanitizeShiftForStaff,
  getActiveShiftForStaff,
};
