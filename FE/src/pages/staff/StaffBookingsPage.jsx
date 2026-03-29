import { useEffect, useMemo, useState } from 'react';
import { getStaffBookingsRequest, respondBookingRequest } from '../../api/booking.api';

const STATUS_META = {
  pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Từ chối', className: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
};

const isToday = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()
  );
};

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [respondStatus, setRespondStatus] = useState('confirmed');
  const [staffNote, setStaffNote] = useState('');
  const [responding, setResponding] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getStaffBookingsRequest({
        status: filterStatus || undefined,
        page: 1,
        limit: 100,
      });
      setBookings(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể tải danh sách booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const openRespondModal = (booking, presetStatus) => {
    setSelectedBooking(booking);
    setRespondStatus(presetStatus || booking?.status || 'confirmed');
    setStaffNote(booking?.staffNote || '');
  };

  const closeRespondModal = () => {
    setSelectedBooking(null);
    setStaffNote('');
    setRespondStatus('confirmed');
  };

  const handleRespond = async () => {
    if (!selectedBooking?._id) return;
    try {
      setResponding(true);
      await respondBookingRequest(selectedBooking._id, {
        status: respondStatus,
        staffNote: String(staffNote || '').trim(),
      });
      setToast('Đã gửi phản hồi cho khách');
      setTimeout(() => setToast(''), 2600);
      closeRespondModal();
      await fetchBookings();
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setResponding(false);
    }
  };

  const list = useMemo(() => bookings, [bookings]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Booking thử đồ</h2>
          <p className="text-sm text-slate-600">Quản lý phản hồi booking và gửi email cho khách hàng.</p>
        </div>
        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xử lý</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      {toast ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải booking...</div>
        ) : null}

        {!loading && list.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Không có booking.</div>
        ) : null}

        {!loading && list.map((booking) => {
          const statusKey = String(booking?.status || 'pending').toLowerCase();
          const statusMeta = STATUS_META[statusKey] || STATUS_META.pending;
          const today = isToday(booking?.date);

          return (
            <div
              key={booking._id}
              className={`rounded-xl border bg-white p-5 shadow-sm ${today ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-sm text-slate-700">
                  <p className="text-base font-bold text-slate-900">{booking?.name || 'Khách hàng'}</p>
                  <p>SĐT: {booking?.phone || 'N/A'}</p>
                  <p>Email: {booking?.email || 'N/A'}</p>
                  <p>Ngày: {formatDate(booking?.date)}</p>
                  <p>Giờ: {booking?.time || 'N/A'}</p>
                  <p>Loại trang phục: {booking?.category || 'N/A'}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                  {today ? (
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">Hôm nay</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openRespondModal(booking, statusKey === 'pending' ? 'confirmed' : statusKey)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => openRespondModal(booking, 'confirmed')}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => openRespondModal(booking, 'rejected')}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Từ chối
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Phản hồi booking</h3>
            <p className="mt-1 text-sm text-slate-600">{selectedBooking.name} • {selectedBooking.phone}</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái</label>
                <select
                  value={respondStatus}
                  onChange={(event) => setRespondStatus(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú phản hồi</label>
                <textarea
                  rows={4}
                  value={staffNote}
                  onChange={(event) => setStaffNote(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nhập ghi chú gửi khách hàng"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRespondModal}
                disabled={responding}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleRespond}
                disabled={responding}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {responding ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
