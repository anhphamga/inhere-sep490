import SectionCard from '../components/SectionCard';
import { mockBookings } from '../mockData';

export default function FittingBookingsPage() {
  return (
    <SectionCard eyebrow="Appointments" title="Fitting bookings">
      <div className="grid gap-4">
        {mockBookings.map((booking) => (
          <div key={booking.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{booking.customer}</p>
                <p className="mt-1 text-sm text-slate-500">{booking.time} with {booking.stylist}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{booking.status}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
