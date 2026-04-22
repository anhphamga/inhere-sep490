const {
  createAlert,
  getAlerts,
  updateAlertStatus,
  markAllAlertsAsSeen,
  deleteAlert,
} = require('../services/alert.service');
const { ALERT_STATUS } = require('../constants/alert.constants');

const listAlerts = async (req, res) => {
  try {
    const result = await getAlerts(req.query || {});
    return res.status(200).json({
      success: true,
      data: result.data,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the tai danh sach thong bao.',
      error: error.message,
    });
  }
};

const createAlertController = async (req, res) => {
  try {
    const created = await createAlert(req.body || {}, {
      actorId: req.user?.id || null,
      actorRole: req.user?.role || '',
    });
    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    const isValidationError = ['INVALID_ALERT_TARGET'].includes(String(error?.message || ''));
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? 'Thieu targetType/targetId hop le.' : 'Khong the tao thong bao.',
      error: error.message,
    });
  }
};

const markAlertAsRead = async (req, res) => {
  try {
    const updated = await updateAlertStatus({
      alertId: req.params.id,
      status: ALERT_STATUS.SEEN,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || '',
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay thong bao.',
      });
    }
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the cap nhat thong bao.',
      error: error.message,
    });
  }
};

const updateAlertStatusController = async (req, res) => {
  try {
    const status = String(req.body?.status || '');
    const updated = await updateAlertStatus({
      alertId: req.params.id,
      status,
      actorId: req.user?.id || null,
      actorRole: req.user?.role || '',
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay thong bao.',
      });
    }
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const isStatusError = String(error?.message || '') === 'INVALID_ALERT_STATUS';
    return res.status(isStatusError ? 400 : 500).json({
      success: false,
      message: isStatusError ? 'Trang thai phai la New, Seen hoac Done.' : 'Khong the cap nhat thong bao.',
      error: error.message,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const modifiedCount = await markAllAlertsAsSeen({
      actorId: req.user?.id || null,
      actorRole: req.user?.role || '',
    });
    return res.status(200).json({
      success: true,
      modifiedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the danh dau da xem tat ca thong bao.',
      error: error.message,
    });
  }
};

const removeAlert = async (req, res) => {
  try {
    const deleted = await deleteAlert(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay thong bao.',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Xoa thong bao thanh cong.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Khong the xoa thong bao.',
      error: error.message,
    });
  }
};

module.exports = {
  listAlerts,
  createAlert: createAlertController,
  markAlertAsRead,
  updateAlertStatus: updateAlertStatusController,
  markAllAsRead,
  removeAlert,
};
