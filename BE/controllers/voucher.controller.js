const User = require('../model/User.model');
const {
  validateVoucher,
  buildInvalidResponse,
  createVoucher,
  updateVoucher,
  listVouchers,
  listMyVouchers,
  getVoucherDetail,
  toggleVoucherStatus,
} = require('../services/voucher.service');

const resolveAuthenticatedUser = async (req) => {
  if (!req.user?.id) return null;
  return User.findById(req.user.id).lean();
};

const handleVoucherAdminError = (res, error) => {
  const status = Number(error?.status || 500);
  return res.status(status).json({
    success: false,
    message: error?.message || 'Khong the xu ly voucher luc nay.',
    errors: error?.details || undefined,
  });
};

exports.createVoucher = async (req, res) => {
  try {
    const voucher = await createVoucher(req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Tao voucher thanh cong',
      data: voucher,
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.listVouchers = async (req, res) => {
  try {
    const result = await listVouchers(req.query || {});
    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List vouchers error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.listMyVouchers = async (req, res) => {
  try {
    const result = await listMyVouchers({
      user: req.user,
      query: req.query || {},
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List my vouchers error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.getVoucherDetail = async (req, res) => {
  try {
    const voucher = await getVoucherDetail(req.params.id);
    return res.json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    console.error('Get voucher detail error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.updateVoucher = async (req, res) => {
  try {
    const voucher = await updateVoucher(req.params.id, req.body || {});
    return res.json({
      success: true,
      message: 'Cap nhat voucher thanh cong',
      data: voucher,
    });
  } catch (error) {
    console.error('Update voucher error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.toggleVoucherStatus = async (req, res) => {
  try {
    const voucher = await toggleVoucherStatus(req.params.id);
    return res.json({
      success: true,
      message: voucher.isActive ? 'Kich hoat voucher thanh cong' : 'Tat voucher thanh cong',
      data: voucher,
    });
  } catch (error) {
    console.error('Toggle voucher status error:', error);
    return handleVoucherAdminError(res, error);
  }
};

exports.validateVoucher = async (req, res) => {
  try {
    const {
      code,
      cartItems = [],
      subtotal = 0,
      orderType,
    } = req.body || {};

    const user = await resolveAuthenticatedUser(req);
    const result = await validateVoucher({
      code,
      user,
      cartItems: Array.isArray(cartItems) ? cartItems : [],
      subtotal,
      orderType,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Validate voucher error:', error);
    return res.status(500).json(buildInvalidResponse('INTERNAL_SERVER_ERROR', {
      code: req.body?.code,
      subtotal: req.body?.subtotal,
    }));
  }
};
