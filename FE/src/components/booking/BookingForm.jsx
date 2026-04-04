import { useEffect, useMemo, useState } from 'react';
import { createBookingRequest, getRentCategoriesRequest } from '../../api/booking.api';
import { useAuth } from '../../hooks/useAuth';
import TimeSelector from './TimeSelector';

const getToday = () => {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
};

const phoneRegex = /^(0|\+84)\d{9,10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_CATEGORY = 'Đặt lịch thử đồ';
const BOOKING_MIN_TIME = '08:00';
const BOOKING_MAX_TIME = '22:00';

const toTimeMinutes = (value = '') => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export default function BookingForm({ onCancel, onSuccess, selectedProduct = null }) {
  const today = useMemo(() => getToday(), []);
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: '14:00',
    category: '',
    note: '',
  });
  const [showNote, setShowNote] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const userName = String(user?.name || '').trim();
    const userPhone = String(user?.phone || user?.phoneNumber || '').trim();
    const userEmail = String(user?.email || '').trim();

    setForm((prev) => ({
      ...prev,
      name: prev.name || userName,
      phone: prev.phone || userPhone,
      email: prev.email || userEmail,
    }));
  }, [isAuthenticated, user]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const response = await getRentCategoriesRequest();
        const categories = Array.isArray(response?.data?.categories) ? response.data.categories : [];
        const flat = [];

        const visit = (items = []) => {
          items.forEach((item) => {
            const value = String(item?.displayName || item?.name || item?.value || '').trim();
            if (value) flat.push(value);
            if (Array.isArray(item?.children)) visit(item.children);
          });
        };

        visit(categories);
        const unique = [...new Set(flat)].filter(Boolean);
        if (!mounted) return;
        setForm((prev) => {
          const nextCategory = prev.category || selectedProduct?.category || unique[0] || FALLBACK_CATEGORY;
          return { ...prev, category: nextCategory };
        });
      } catch {
        if (mounted) {
          setForm((prev) => ({
            ...prev,
            category: prev.category || selectedProduct?.category || FALLBACK_CATEGORY,
          }));
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [selectedProduct?.category]);

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((prev) => {
      const selectedLine = `Trang phục muốn thử: ${String(selectedProduct?.name || '').trim()}`;
      const cleanedNote = String(prev.note || '')
        .split('\n')
        .filter((line) => !line.trim().toLowerCase().startsWith('trang phục muốn thử:'))
        .join('\n')
        .trim();
      return {
        ...prev,
        category: prev.category || String(selectedProduct?.category || '').trim() || FALLBACK_CATEGORY,
        note: cleanedNote ? `${selectedLine}\n${cleanedNote}` : selectedLine,
      };
    });
    setShowNote(true);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((prev) => ({
      ...prev,
      category: prev.category || String(selectedProduct?.category || '').trim() || FALLBACK_CATEGORY,
    }));
  }, [selectedProduct]);

  const errors = useMemo(() => {
    const next = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập họ và tên';
    if (!form.phone.trim()) next.phone = 'Số điện thoại là bắt buộc';
    else if (!phoneRegex.test(form.phone.trim())) next.phone = 'Số điện thoại không hợp lệ';
    if (!form.email.trim()) next.email = 'Email là bắt buộc';
    else if (!emailRegex.test(form.email.trim())) next.email = 'Email không hợp lệ';
    if (!form.date) next.date = 'Vui lòng chọn ngày đến';
    else if (form.date < today) next.date = 'Ngày đến không được nhỏ hơn hôm nay';
    if (!form.time) next.time = 'Vui lòng chọn giờ đến';
    else {
      const timeInMinutes = toTimeMinutes(form.time);
      const minTime = toTimeMinutes(BOOKING_MIN_TIME);
      const maxTime = toTimeMinutes(BOOKING_MAX_TIME);
      if (timeInMinutes === null || minTime === null || maxTime === null) {
        next.time = 'Giờ đến không hợp lệ';
      } else if (timeInMinutes < minTime || timeInMinutes > maxTime) {
        next.time = `Giờ đến chỉ từ ${BOOKING_MIN_TIME} đến ${BOOKING_MAX_TIME}`;
      }
    }
    return next;
  }, [form, today]);

  const isValid = Object.keys(errors).length === 0;
  const shouldShowError = (field) => submitAttempted || touched[field];
  const isSubmitDisabled = !isValid || submitting;

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100';

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setError('');
  };

  const handleTimeChange = (value) => {
    setForm((prev) => ({ ...prev, time: value }));
    setTouched((prev) => ({ ...prev, time: true }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setError('');
    if (!isValid) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      date: form.date,
      time: form.time,
      category: form.category,
      productId: String(selectedProduct?._id || '').trim() || undefined,
      productName: String(selectedProduct?.name || '').trim() || undefined,
      productImage: String(selectedProduct?.imageUrl || '').trim() || undefined,
      note: form.note.trim(),
    };

    try {
      setSubmitting(true);
      const response = await createBookingRequest(payload);
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Không thể đặt lịch, vui lòng thử lại.');
      }

      setToast('🎉 Đặt lịch thành công! Chúng tôi sẽ liên hệ bạn sớm');
      onSuccess?.(payload);
      setTimeout(() => {
        onCancel?.();
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Không thể đặt lịch thử đồ lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {toast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {toast}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
        <h3 className="mb-2 text-sm font-bold text-slate-900">Thông tin sản phẩm</h3>
        {selectedProduct?.name ? (
          <div className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-amber-100">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full object-cover" loading="lazy" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-700">Trang phục đã chọn</p>
              <p className="truncate text-sm font-semibold text-slate-900">{selectedProduct.name}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-2.5 text-sm text-slate-600">Chưa chọn mẫu cụ thể, bạn có thể tiếp tục đặt lịch thử đồ.</div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Thông tin khách hàng</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Họ và tên</label>
            <input
              type="text"
              value={form.name}
              onChange={handleFieldChange('name')}
              className={fieldClass}
              placeholder="Nguyễn Văn A"
            />
            {shouldShowError('name') && errors.name ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.name}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Số điện thoại</label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleFieldChange('phone')}
              className={fieldClass}
              placeholder="0901234567"
            />
            {shouldShowError('phone') && errors.phone ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.phone}</p> : null}
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={handleFieldChange('email')}
            className={fieldClass}
            placeholder="you@example.com"
          />
          {shouldShowError('email') && errors.email ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-900">Lịch hẹn</h3>

        <div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Ngày đến</label>
            <input
              type="date"
              min={today}
              value={form.date}
              onChange={handleFieldChange('date')}
              className={fieldClass}
            />
            {shouldShowError('date') && errors.date ? <p className="mt-1 text-xs font-medium text-rose-600">{errors.date}</p> : null}
          </div>
        </div>

        <div className="mt-3">
          <TimeSelector value={form.time} onChange={handleTimeChange} error={shouldShowError('time') ? errors.time : ''} />
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowNote((prev) => !prev)}
            className="text-sm font-semibold text-amber-700 transition hover:text-amber-800"
          >
            {showNote ? 'Ẩn ghi chú' : '+ Thêm ghi chú'}
          </button>
        </div>

        {showNote ? (
          <div className="mt-2">
            <textarea
              value={form.note}
              onChange={handleFieldChange('note')}
              rows={3}
              className={fieldClass}
              placeholder="Thông tin thêm cho stylist (tuỳ chọn)"
            />
          </div>
        ) : null}
      </section>

      <div className="space-y-2 rounded-2xl border border-amber-100 bg-white p-3">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Đang xử lý...' : 'Đặt lịch thử miễn phí'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
