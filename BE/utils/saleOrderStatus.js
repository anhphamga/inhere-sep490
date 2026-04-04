const SALE_ORDER_STATUS_ALIASES = {
  DRAFT: 'Draft',
  PENDINGPAYMENT: 'PendingPayment',
  PENDINGCONFIRMATION: 'PendingConfirmation',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  UNPAID: 'Unpaid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const USER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  RETURNED: 'RETURNED',
};

const USER_STATUS_LABELS = {
  [USER_STATUS.PENDING]: 'Chờ xác nhận',
  [USER_STATUS.CONFIRMED]: 'Đã xác nhận',
  [USER_STATUS.SHIPPING]: 'Đang giao',
  [USER_STATUS.COMPLETED]: 'Hoàn tất',
  [USER_STATUS.RETURNED]: 'Đã trả hàng',
};

const STATUS_TO_USER_STATUS = {
  Draft: USER_STATUS.PENDING,
  PendingPayment: USER_STATUS.PENDING,
  PendingConfirmation: USER_STATUS.PENDING,
  Paid: USER_STATUS.CONFIRMED,
  Confirmed: USER_STATUS.CONFIRMED,
  Shipping: USER_STATUS.SHIPPING,
  Completed: USER_STATUS.COMPLETED,
  Cancelled: USER_STATUS.PENDING,
  Returned: USER_STATUS.RETURNED,
  Unpaid: USER_STATUS.PENDING,
  Failed: USER_STATUS.PENDING,
  Refunded: USER_STATUS.RETURNED,
};

const normalizeSaleOrderStatusInput = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const compactKey = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (SALE_ORDER_STATUS_ALIASES[compactKey]) {
    return SALE_ORDER_STATUS_ALIASES[compactKey];
  }

  return raw;
};

const isRefundedSaleStatus = (value = '') => normalizeSaleOrderStatusInput(value) === 'Refunded';

const resolveSaleOrderUserStatus = (status, currentUserStatus = '') => {
  const normalizedStatus = normalizeSaleOrderStatusInput(status);
  if (STATUS_TO_USER_STATUS[normalizedStatus]) {
    return STATUS_TO_USER_STATUS[normalizedStatus];
  }

  const normalizedCurrent = String(currentUserStatus || '').trim().toUpperCase();
  if (Object.values(USER_STATUS).includes(normalizedCurrent)) {
    return normalizedCurrent;
  }

  return USER_STATUS.PENDING;
};

const getSaleOrderUserStatusLabel = (userStatus = '') =>
  USER_STATUS_LABELS[String(userStatus || '').trim().toUpperCase()] || USER_STATUS_LABELS[USER_STATUS.PENDING];

module.exports = {
  USER_STATUS,
  normalizeSaleOrderStatusInput,
  isRefundedSaleStatus,
  resolveSaleOrderUserStatus,
  getSaleOrderUserStatusLabel,
};
