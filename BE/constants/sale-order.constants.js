const SALE_ORDER_STATUS_META = {
  Draft: { label: 'Nháp', badgeClass: 'bg-slate-100 text-slate-700' },
  PendingPayment: { label: 'Chờ thanh toán', badgeClass: 'bg-amber-100 text-amber-700' },
  PendingConfirmation: { label: 'Chờ xác nhận', badgeClass: 'bg-amber-100 text-amber-700' },
  Paid: { label: 'Đã thanh toán', badgeClass: 'bg-emerald-100 text-emerald-700' },
  Confirmed: { label: 'Đã xác nhận', badgeClass: 'bg-sky-100 text-sky-700' },
  Shipping: { label: 'Đang giao', badgeClass: 'bg-violet-100 text-violet-700' },
  Completed: { label: 'Hoàn tất', badgeClass: 'bg-emerald-100 text-emerald-700' },
  Cancelled: { label: 'Đã hủy', badgeClass: 'bg-rose-100 text-rose-700' },
  Returned: { label: 'Trả hàng', badgeClass: 'bg-slate-200 text-slate-700' },
  Unpaid: { label: 'Chưa thanh toán', badgeClass: 'bg-orange-100 text-orange-700' },
  Failed: { label: 'Thất bại', badgeClass: 'bg-rose-100 text-rose-700' },
  Refunded: { label: 'Đã hoàn tiền', badgeClass: 'bg-cyan-100 text-cyan-700' },
};

const SALE_ORDER_ALLOWED_STATUSES = new Set(Object.keys(SALE_ORDER_STATUS_META));

const SALE_ORDER_TRANSITIONS = {
  Draft: ['PendingPayment', 'PendingConfirmation', 'Cancelled'],
  PendingPayment: ['Paid', 'Failed', 'Cancelled'],
  PendingConfirmation: ['Confirmed', 'Cancelled'],
  Paid: ['Confirmed', 'Refunded'],
  Confirmed: ['Shipping', 'Completed', 'Cancelled'],
  Shipping: ['Completed', 'Returned'],
  Completed: [],
  Cancelled: [],
  Returned: ['Refunded'],
  Unpaid: ['PendingPayment', 'Cancelled'],
  Failed: ['PendingPayment', 'Cancelled'],
  Refunded: [],
};

const getSaleStatusMeta = (status) => SALE_ORDER_STATUS_META[status] || {
  label: status || 'N/A',
  badgeClass: 'bg-slate-100 text-slate-700',
};

module.exports = {
  SALE_ORDER_STATUS_META,
  SALE_ORDER_ALLOWED_STATUSES,
  SALE_ORDER_TRANSITIONS,
  getSaleStatusMeta,
};
