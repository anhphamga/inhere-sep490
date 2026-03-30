import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';
import StatusBadge from '../components/StatusBadge';

export default function FittingBookingsPage() {
  const { t } = useTranslate();
  const bookings = [];

  return (
    <SectionCard eyebrow={t('admin.fitting.eyebrow')} title={t('admin.fitting.title')}>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{booking.customer}</p>
                <p className="mt-1 text-sm text-slate-500">{booking.time} {t('admin.fitting.with')} {booking.stylist}</p>
              </div>
              <StatusBadge value={booking.status} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

