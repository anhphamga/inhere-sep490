const STATUS_META = {
  pending: {
    label: 'Chờ xử lý',
    className: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  confirmed: {
    label: 'Đã xác nhận',
    className: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
  rejected: {
    label: 'Từ chối',
    className: 'border-rose-200 bg-rose-100 text-rose-800',
  },
};

export default function BookingStatusBadge({ status = 'pending' }) {
  const key = String(status || 'pending').toLowerCase();
  const meta = STATUS_META[key] || STATUS_META.pending;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}
