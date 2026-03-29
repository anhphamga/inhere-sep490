import BookingStatusBadge from './BookingStatusBadge';

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'rejected', label: 'Từ chối' },
];

export default function BookingActionModal({
  open,
  booking,
  mode = 'confirm',
  status,
  note,
  onChangeStatus,
  onChangeNote,
  onClose,
  onSubmit,
  submitting = false,
}) {
  if (!open || !booking) return null;

  const isViewMode = mode === 'view';
  const title =
    mode === 'confirm'
      ? 'Xác nhận booking'
      : mode === 'reject'
        ? 'Từ chối booking'
        : 'Chi tiết booking';

  const submitLabel =
    mode === 'confirm'
      ? 'Xác nhận và gửi email'
      : mode === 'reject'
        ? 'Từ chối và gửi email'
        : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {booking.name} • {booking.phone}
            </p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        <div className="mt-4 space-y-3">
          {!isViewMode ? (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
              <select
                value={status}
                onChange={(event) => onChangeStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {isViewMode ? 'Ghi chú phản hồi' : 'Nội dung phản hồi'}
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(event) => onChangeNote(event.target.value)}
              readOnly={isViewMode}
              className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ${
                isViewMode
                  ? 'bg-slate-50 text-slate-600'
                  : 'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'
              }`}
              placeholder="Nhập ghi chú cho khách hàng"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Đóng
          </button>

          {!isViewMode ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                mode === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? 'Đang gửi...' : submitLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
