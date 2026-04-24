const { getActiveShiftForStaff } = require('../services/shift.service');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

// Enforce: STAFF must have an active shift (đã check-in và chưa check-out) to access protected order flows.
const requireActiveShiftForStaff = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (role !== 'staff') {
      return next();
    }

    const staffId = req.user?.id;
    const active = await getActiveShiftForStaff(staffId, { includeExpired: true });
    if (active?.expired) {
      return res.status(403).json({
        success: false,
        message: 'Ca làm đã hết giờ. Vui lòng check-out để kết thúc ca trước khi thực hiện thao tác này.',
      });
    }
    if (!active?.shift || !active?.registration) {
      return res.status(403).json({
        success: false,
        message: 'Bạn phải đang trong ca làm (đã check-in và chưa check-out) để thực hiện thao tác này.',
      });
    }

    req.activeShift = active;
    return next();
  } catch (error) {
    console.error('Require active shift middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể kiểm tra ca làm hiện tại. Vui lòng thử lại.',
    });
  }
};

module.exports = {
  requireActiveShiftForStaff,
};
