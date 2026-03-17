const SALE_ORDER_STATUS_META = {
  Draft: { label: 'Nhap', badgeClass: 'bg-slate-100 text-slate-700' },
  PendingPayment: { label: 'Cho thanh toan', badgeClass: 'bg-amber-100 text-amber-700' },
  PendingConfirmation: { label: 'Cho xac nhan', badgeClass: 'bg-amber-100 text-amber-700' },
  Paid: { label: 'Da thanh toan', badgeClass: 'bg-emerald-100 text-emerald-700' },
  Confirmed: { label: 'Da xac nhan', badgeClass: 'bg-sky-100 text-sky-700' },
  Shipping: { label: 'Dang giao', badgeClass: 'bg-violet-100 text-violet-700' },
  Completed: { label: 'Hoan tat', badgeClass: 'bg-emerald-100 text-emerald-700' },
  Cancelled: { label: 'Da huy', badgeClass: 'bg-rose-100 text-rose-700' },
  Returned: { label: 'Tra hang', badgeClass: 'bg-slate-200 text-slate-700' },
  Unpaid: { label: 'Chua thanh toan', badgeClass: 'bg-orange-100 text-orange-700' },
  Failed: { label: 'That bai', badgeClass: 'bg-rose-100 text-rose-700' },
  Refunded: { label: 'Da hoan tien', badgeClass: 'bg-cyan-100 text-cyan-700' },
};

const SALE_ORDER_ALLOWED_STATUSES = new Set(Object.keys(SALE_ORDER_STATUS_META));

const SALE_ORDER_TRANSITIONS = {
  Draft: ['PendingPayment', 'PendingConfirmation', 'Cancelled'],
  PendingPayment: ['Paid', 'Failed', 'Cancelled'],
  PendingConfirmation: ['Confirmed', 'Cancelled'],
  Paid: ['Confirmed', 'Refunded'],
  Confirmed: ['Shipping', 'Completed', 'Cancelled'],
  Shipping: ['Completed', 'Returned'],
  Completed: ['Refunded'],
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
