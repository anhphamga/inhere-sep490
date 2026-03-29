import { useEffect, useState } from 'react';
import { CalendarCheck2, Sparkles, X } from 'lucide-react';
import BookingForm from './BookingForm';

export default function BookingModal({ open, onClose, onSuccess, selectedProduct = null }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 transition-all duration-200 sm:p-4 ${
        visible ? 'bg-slate-900/45 backdrop-blur-[2px]' : 'bg-slate-900/0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-100 bg-[#fffdf9] shadow-2xl transition-all duration-200 ${
          visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-amber-100 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
              <Sparkles size={12} />
              INHERE Booking
            </div>
            <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
              <CalendarCheck2 size={20} className="text-amber-600" />
              Đặt lịch thử đồ
            </h2>
            <p className="mt-1 text-sm text-slate-500">Hoàn tất nhanh trong 1 phút, xác nhận sớm qua email.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-5">
          <BookingForm onCancel={onClose} onSuccess={onSuccess} selectedProduct={selectedProduct} />
        </div>
      </div>
    </div>
  );
}
