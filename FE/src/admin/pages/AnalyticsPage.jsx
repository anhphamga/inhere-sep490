import SectionCard from '../components/SectionCard';
import { dashboardStats } from '../mockData';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <SectionCard eyebrow="Revenue" title="Performance snapshot">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] bg-slate-900 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">Daily</p>
            <p className="mt-4 text-3xl font-semibold">{dashboardStats.owner.dailyRevenue.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Monthly</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{dashboardStats.owner.monthlyRevenue.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top line orders</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{dashboardStats.owner.totalOrders}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
