const Shift = require('../model/Shift.model');
const ShiftRegistration = require('../model/ShiftRegistration.model');
const SaleOrder = require('../model/SaleOrder.model');
const RentOrder = require('../model/RentOrder.model');
const User = require('../model/User.model');
const { buildSaleRevenueMatch, buildRentRevenueMatch } = require('../utils/revenueFilters');

const normalizeDateInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const resolveDateRange = ({ startDate, endDate }) => {
  const start = normalizeDateInput(startDate);
  const end = normalizeDateInput(endDate);
  if (!start || !end) {
    const error = new Error('INVALID_DATE_RANGE');
    error.statusCode = 400;
    error.message = 'startDate/endDate không hợp lệ (ví dụ: 2026-04-23).';
    throw error;
  }
  if (start.getTime() > end.getTime()) {
    const error = new Error('INVALID_DATE_RANGE');
    error.statusCode = 400;
    error.message = 'startDate phải nhỏ hơn hoặc bằng endDate.';
    throw error;
  }

  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
};

const formatDateKey = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getShiftsInRange = async ({ start, endExclusive }) => {
  return Shift.find({ date: { $gte: start, $lt: endExclusive } })
    .select('_id date startTime endTime status requiredStaff assignedStaffIds')
    .sort({ date: 1, startTime: 1 })
    .lean();
};

const aggregateRevenueOrdersByShift = async (shiftIds = []) => {
  if (!shiftIds.length) {
    return {
      saleByShift: new Map(),
      rentByShift: new Map(),
    };
  }

  const [saleRows, rentRows] = await Promise.all([
    SaleOrder.aggregate([
      { $match: buildSaleRevenueMatch({ shiftId: { $in: shiftIds } }) },
      {
        $group: {
          _id: '$shiftId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    RentOrder.aggregate([
      { $match: buildRentRevenueMatch({ shiftId: { $in: shiftIds } }) },
      {
        $group: {
          _id: '$shiftId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const saleByShift = new Map(saleRows.map((row) => [String(row._id), row]));
  const rentByShift = new Map(rentRows.map((row) => [String(row._id), row]));
  return { saleByShift, rentByShift };
};

const aggregateOrdersByStaff = async (shiftIds = []) => {
  if (!shiftIds.length) {
    return { saleByStaff: new Map(), rentByStaff: new Map() };
  }

  const [saleRows, rentRows] = await Promise.all([
    SaleOrder.aggregate([
      { $match: buildSaleRevenueMatch({ shiftId: { $in: shiftIds }, staffId: { $ne: null } }) },
      {
        $group: {
          _id: '$staffId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
    RentOrder.aggregate([
      { $match: buildRentRevenueMatch({ shiftId: { $in: shiftIds }, staffId: { $ne: null } }) },
      {
        $group: {
          _id: '$staffId',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const saleByStaff = new Map(saleRows.map((row) => [String(row._id), row]));
  const rentByStaff = new Map(rentRows.map((row) => [String(row._id), row]));
  return { saleByStaff, rentByStaff };
};

const aggregateWorkedRegistrations = async (shiftIds = []) => {
  if (!shiftIds.length) return [];
  return ShiftRegistration.aggregate([
    {
      $match: {
        shiftId: { $in: shiftIds },
        status: 'APPROVED',
        checkInAt: { $ne: null },
      },
    },
    {
      $project: {
        staffId: 1,
        shiftId: 1,
        hoursWorked: {
          $cond: [
            { $and: [{ $ne: ['$checkOutAt', null] }, { $ne: ['$checkInAt', null] }] },
            { $divide: [{ $subtract: ['$checkOutAt', '$checkInAt'] }, 1000 * 60 * 60] },
            0,
          ],
        },
      },
    },
  ]);
};

const getShiftAnalyticsOverview = async ({ startDate, endDate }) => {
  const { start, endExclusive } = resolveDateRange({ startDate, endDate });
  const shifts = await getShiftsInRange({ start, endExclusive });
  const shiftIds = shifts.map((s) => s._id);
  const shiftIdStrings = shiftIds.map((id) => String(id));

  const [workedRegs, revenueAgg] = await Promise.all([
    aggregateWorkedRegistrations(shiftIds),
    aggregateRevenueOrdersByShift(shiftIds),
  ]);

  const { saleByShift, rentByShift } = revenueAgg;

  const totalShifts = shifts.length;
  const totalClosedShifts = shifts.reduce((sum, s) => sum + (String(s.status) === 'CLOSED' ? 1 : 0), 0);

  let totalSaleRevenue = 0;
  let totalRentRevenue = 0;
  let totalSaleOrders = 0;
  let totalRentOrders = 0;

  for (const sid of shiftIdStrings) {
    const sale = saleByShift.get(sid);
    const rent = rentByShift.get(sid);
    if (sale) {
      totalSaleRevenue += Number(sale.totalRevenue || 0);
      totalSaleOrders += Number(sale.totalOrders || 0);
    }
    if (rent) {
      totalRentRevenue += Number(rent.totalRevenue || 0);
      totalRentOrders += Number(rent.totalOrders || 0);
    }
  }

  const totalRevenue = totalSaleRevenue + totalRentRevenue;
  const totalOrders = totalSaleOrders + totalRentOrders;

  const workedStaffSet = new Set(workedRegs.map((r) => String(r.staffId || '')).filter(Boolean));
  const totalStaffWorked = workedStaffSet.size;

  const averageRevenuePerShift = totalShifts > 0 ? totalRevenue / totalShifts : 0;

  return {
    totalShifts,
    totalClosedShifts,
    totalRevenue,
    totalOrders,
    totalRentOrders,
    totalSaleOrders,
    totalStaffWorked,
    averageRevenuePerShift,
  };
};

const getRevenueByShift = async ({ startDate, endDate, groupBy = 'shift' }) => {
  const { start, endExclusive } = resolveDateRange({ startDate, endDate });
  const shifts = await getShiftsInRange({ start, endExclusive });
  const shiftIds = shifts.map((s) => s._id);
  const { saleByShift, rentByShift } = await aggregateRevenueOrdersByShift(shiftIds);

  const rows = shifts.map((shift) => {
    const sid = String(shift._id);
    const sale = saleByShift.get(sid);
    const rent = rentByShift.get(sid);

    const saleRevenue = Number(sale?.totalRevenue || 0);
    const rentRevenue = Number(rent?.totalRevenue || 0);
    const saleOrders = Number(sale?.totalOrders || 0);
    const rentOrders = Number(rent?.totalOrders || 0);
    const staffCount = Array.isArray(shift.assignedStaffIds) ? shift.assignedStaffIds.length : 0;

    return {
      shiftId: sid,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      totalRevenue: saleRevenue + rentRevenue,
      totalOrders: saleOrders + rentOrders,
      rentOrders,
      saleOrders,
      staffCount,
      status: shift.status,
    };
  });

  if (String(groupBy || '').toLowerCase() !== 'day') {
    return rows;
  }

  const byDay = new Map();
  for (const item of rows) {
    const key = formatDateKey(item.date);
    if (!key) continue;
    if (!byDay.has(key)) {
      byDay.set(key, {
        date: key,
        totalRevenue: 0,
        totalOrders: 0,
        rentOrders: 0,
        saleOrders: 0,
        totalShifts: 0,
        totalClosedShifts: 0,
        totalStaffPlanned: 0,
      });
    }
    const agg = byDay.get(key);
    agg.totalRevenue += Number(item.totalRevenue || 0);
    agg.totalOrders += Number(item.totalOrders || 0);
    agg.rentOrders += Number(item.rentOrders || 0);
    agg.saleOrders += Number(item.saleOrders || 0);
    agg.totalShifts += 1;
    if (String(item.status) === 'CLOSED') agg.totalClosedShifts += 1;
    agg.totalStaffPlanned += Number(item.staffCount || 0);
  }

  return Array.from(byDay.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
};

const getStaffPerformance = async ({ startDate, endDate }) => {
  const { start, endExclusive } = resolveDateRange({ startDate, endDate });
  const shifts = await getShiftsInRange({ start, endExclusive });
  const shiftIds = shifts.map((s) => s._id);

  const [workedRegs, orderAgg] = await Promise.all([
    aggregateWorkedRegistrations(shiftIds),
    aggregateOrdersByStaff(shiftIds),
  ]);

  const { saleByStaff, rentByStaff } = orderAgg;

  const perStaff = new Map();
  for (const reg of workedRegs) {
    const staffId = String(reg.staffId || '');
    if (!staffId) continue;
    if (!perStaff.has(staffId)) {
      perStaff.set(staffId, {
        staffId,
        shiftSet: new Set(),
        totalHoursWorked: 0,
      });
    }
    const item = perStaff.get(staffId);
    item.shiftSet.add(String(reg.shiftId || ''));
    item.totalHoursWorked += Number(reg.hoursWorked || 0);
  }

  const staffIds = Array.from(perStaff.keys());
  const users = staffIds.length
    ? await User.find({ _id: { $in: staffIds } }).select('name').lean()
    : [];
  const userNameMap = new Map(users.map((u) => [String(u._id), u?.name || '']));

  const rows = staffIds.map((id) => {
    const sale = saleByStaff.get(id);
    const rent = rentByStaff.get(id);
    const totalRevenue = Number(sale?.totalRevenue || 0) + Number(rent?.totalRevenue || 0);
    const totalOrders = Number(sale?.totalOrders || 0) + Number(rent?.totalOrders || 0);
    const entry = perStaff.get(id);
    const totalShifts = entry?.shiftSet?.size || 0;
    const totalHours = Number(entry?.totalHoursWorked || 0);
    const avgRevenuePerShift = totalShifts > 0 ? totalRevenue / totalShifts : 0;
    const avgRevenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;
    return {
      staffId: id,
      staffName: userNameMap.get(id) || 'N/A',
      totalShifts,
      totalHours,
      totalOrders,
      totalRevenue,
      avgRevenuePerShift,
      avgRevenuePerHour,
    };
  });

  return rows.sort((a, b) => b.totalRevenue - a.totalRevenue);
};

const getPeakShifts = async ({ startDate, endDate, metric = 'revenue', limit = 10 }) => {
  const items = await getRevenueByShift({ startDate, endDate, groupBy: 'shift' });
  const normalizedMetric = String(metric || 'revenue').toLowerCase();
  const nextLimit = Math.min(Math.max(Number(limit || 10), 1), 50);
  const sorted = [...items].sort((a, b) => {
    if (normalizedMetric === 'orders') return Number(b.totalOrders || 0) - Number(a.totalOrders || 0);
    return Number(b.totalRevenue || 0) - Number(a.totalRevenue || 0);
  });
  return sorted.slice(0, nextLimit);
};

const getDailySummary = async ({ startDate, endDate }) => {
  const { start, endExclusive } = resolveDateRange({ startDate, endDate });
  const shifts = await getShiftsInRange({ start, endExclusive });
  const shiftIds = shifts.map((s) => s._id);
  const { saleByShift, rentByShift } = await aggregateRevenueOrdersByShift(shiftIds);

  const dayAgg = new Map();

  for (const shift of shifts) {
    const dayKey = formatDateKey(shift.date);
    if (!dayKey) continue;
    if (!dayAgg.has(dayKey)) {
      dayAgg.set(dayKey, {
        date: dayKey,
        totalRevenue: 0,
        totalOrders: 0,
        totalShifts: 0,
        totalStaffWorked: 0,
      });
    }
    const item = dayAgg.get(dayKey);
    item.totalShifts += 1;

    const sid = String(shift._id);
    const sale = saleByShift.get(sid);
    const rent = rentByShift.get(sid);
    item.totalRevenue += Number(sale?.totalRevenue || 0) + Number(rent?.totalRevenue || 0);
    item.totalOrders += Number(sale?.totalOrders || 0) + Number(rent?.totalOrders || 0);
  }

  const workedRegs = await aggregateWorkedRegistrations(shiftIds);
  const shiftDateMap = new Map(shifts.map((s) => [String(s._id), formatDateKey(s.date)]));
  const staffSetByDay = new Map();
  for (const reg of workedRegs) {
    const dayKey = shiftDateMap.get(String(reg.shiftId || ''));
    if (!dayKey) continue;
    if (!staffSetByDay.has(dayKey)) staffSetByDay.set(dayKey, new Set());
    const set = staffSetByDay.get(dayKey);
    const staffId = String(reg.staffId || '');
    if (staffId) set.add(staffId);
  }

  for (const [dayKey, set] of staffSetByDay.entries()) {
    const item = dayAgg.get(dayKey);
    if (item) item.totalStaffWorked = set.size;
  }

  return Array.from(dayAgg.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
};

module.exports = {
  getShiftAnalyticsOverview,
  getRevenueByShift,
  getStaffPerformance,
  getPeakShifts,
  getDailySummary,
};
