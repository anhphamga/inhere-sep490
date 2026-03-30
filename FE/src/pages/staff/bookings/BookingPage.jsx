import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookingActionModal from './BookingActionModal';
import BookingCard from './BookingCard';
import { getStaffBookingsRequest, respondBookingRequest } from '../../../api/booking.api';

const FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'rejected', label: 'Từ chối' },
];
const PAGE_SIZE = 10;

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
};

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getGroupLabel = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Khác';

  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const sameDay =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();
  if (sameDay) return 'Hôm nay';

  const sameTomorrow =
    date.getDate() === tomorrow.getDate()
    && date.getMonth() === tomorrow.getMonth()
    && date.getFullYear() === tomorrow.getFullYear();
  if (sameTomorrow) return 'Ngày mai';

  return formatDate(dateValue);
};

const isNearTime = (booking) => {
  if (!booking?.date || !booking?.time) return false;
  const [hour, minute] = String(booking.time)
    .split(':')
    .map((item) => Number(item));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

  const target = new Date(booking.date);
  if (Number.isNaN(target.getTime())) return false;
  target.setHours(hour, minute, 0, 0);

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000;
};

export default function BookingPage({ readOnly = false }) {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [activeBooking, setActiveBooking] = useState(null);
  const [modalMode, setModalMode] = useState('view');
  const [respondStatus, setRespondStatus] = useState('confirmed');
  const [staffNote, setStaffNote] = useState('');
  const [responding, setResponding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const openModal = (booking, mode) => {
    setActiveBooking(booking);
    setModalMode(mode);
    setRespondStatus(mode === 'reject' ? 'rejected' : 'confirmed');
    setStaffNote(String(booking?.staffNote || ''));
  };

  const closeModal = () => {
    setActiveBooking(null);
    setModalMode('view');
    setRespondStatus('confirmed');
    setStaffNote('');
  };

  const handleSubmitAction = async () => {
    if (readOnly) return;
    if (!activeBooking?._id) return;
    try {
      setResponding(true);
      await respondBookingRequest(activeBooking._id, {
        status: respondStatus,
        staffNote: String(staffNote || '').trim(),
      });
      setToast('Đã gửi phản hồi cho khách');
      setTimeout(() => setToast(''), 2600);
      closeModal();
      await fetchBookings();
    } catch (apiError) {
      setError(apiError?.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setResponding(false);
    }
  };

  const totalItems = bookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItemIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE;
  const endItemIndex = Math.min(startItemIndex + PAGE_SIZE, totalItems);
  const paginatedBookings = useMemo(() => bookings.slice(startItemIndex, endItemIndex), [bookings, startItemIndex, endItemIndex]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const groupedBookings = useMemo(() => {
    const enriched = paginatedBookings
      .map((booking) => ({
        ...booking,
        displayDate: formatDate(booking?.date),
        dateKey: toDateKey(booking?.date),
      }))
      .sort((a, b) => {
        const aTime = new Date(`${a.dateKey}T${a.time || '00:00'}`).getTime();
        const bTime = new Date(`${b.dateKey}T${b.time || '00:00'}`).getTime();
        return aTime - bTime;
      });

    const map = new Map();
    enriched.forEach((booking) => {
      const key = booking.dateKey;
      if (!map.has(key)) {
        map.set(key, { key, label: getGroupLabel(booking.date), items: [] });
      }
      map.get(key).items.push(booking);
    });
    return Array.from(map.values());
  }, [paginatedBookings]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Quản lý booking thử đồ</h2>
          <p className="text-sm text-slate-600">
            {readOnly ? 'Theo dõi danh sách booking thử đồ (chỉ xem)' : 'Xử lý và phản hồi booking của khách'}
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
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

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải dữ liệu booking...</div>
      ) : null}

      {!loading && groupedBookings.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Không có booking.</div>
      ) : null}

      {!loading
        && groupedBookings.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="sticky top-0 z-10 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
              --- {group.label} ---
            </div>
            {group.items.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                nearTime={isNearTime(booking)}
                canRespond={!readOnly}
                onDetail={(item) => openModal(item, 'view')}
                onConfirm={readOnly ? undefined : (item) => openModal(item, 'confirm')}
                onReject={readOnly ? undefined : (item) => openModal(item, 'reject')}
              />
            ))}
          </section>
        ))}

      {!loading && bookings.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Hiển thị {startItemIndex + 1}-{endItemIndex} trên tổng {totalItems} booking
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm font-medium text-slate-700">
                Trang {safeCurrentPage}/{totalPages}
              </span>
              <button
                type="button"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BookingActionModal
        open={Boolean(activeBooking)}
        booking={activeBooking}
        mode={readOnly ? 'view' : modalMode}
        status={respondStatus}
        note={staffNote}
        onChangeStatus={setRespondStatus}
        onChangeNote={setStaffNote}
        onClose={closeModal}
        onSubmit={handleSubmitAction}
        submitting={responding}
      />
    </div>
  );
}
