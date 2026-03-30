import BookingStatusBadge from './BookingStatusBadge';

export default function BookingCard({
  booking,
  nearTime = false,
  canRespond = true,
  onDetail,
  onConfirm,
  onReject,
}) {
  const name = booking?.name || 'Khách hàng';
  const initial = name.charAt(0).toUpperCase() || 'K';
  const status = String(booking?.status || 'pending').toLowerCase();

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm transition duration-200 hover:scale-[1.005] hover:shadow-md ${
        nearTime ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-[240px] items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {initial}
          </div>
          <div className="space-y-1 text-sm text-slate-700">
            <p className="text-base font-bold text-slate-900">{name}</p>
            <p>SĐT: {booking?.phone || 'N/A'}</p>
            <p>Email: {booking?.email || 'N/A'}</p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            📅 Ngày: <span className="font-semibold">{booking.displayDate}</span>
          </p>
          <p>
            ⏰ Giờ: <span className="font-semibold">{booking?.time || 'N/A'}</span>
          </p>
          <p>
            👗 Loại trang phục: <span className="font-semibold">{booking?.category || 'N/A'}</span>
          </p>
          <div className="sm:col-span-2">
            <p className="mb-1">🧥 Mẫu đã chọn</p>
            {booking?.productName?.trim() ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                <div className="h-11 w-11 overflow-hidden rounded-md bg-slate-100">
                  {booking?.productImage ? (
                    <img
                      src={booking.productImage}
                      alt={booking.productName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <span className="font-semibold">{booking.productName}</span>
              </div>
            ) : (
              <span className="font-semibold">Không chọn cụ thể</span>
            )}
          </div>
          <p>
            📝 Ghi chú: <span className="font-semibold">{booking?.note?.trim() || 'Không có'}</span>
          </p>
        </div>

        <div className="flex min-w-[210px] flex-col items-start gap-2 xl:items-end">
          <BookingStatusBadge status={status} />

          {status === 'pending' && canRespond ? (
            <div className="flex w-full flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => onConfirm?.(booking)}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => onReject?.(booking)}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => onDetail?.(booking)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Chi tiết
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDetail?.(booking)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Xem chi tiết
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
