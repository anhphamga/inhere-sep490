import { ArrowRight, TrendingUp } from 'lucide-react';
import { can } from '../../utils/access-control';
import { useTranslate } from '../../hooks/useTranslate';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function DashboardPage({ user }) {
  const { t } = useTranslate();
  const ownerStats = {
    dailyRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    activeRentals: 0,
    topProducts: [],
    inventoryChart: [],
  };
  const staffStats = {
    todayTasks: [],
    quickActions: [],
  };

  if (user?.role === 'owner') {
    const totalInventory = ownerStats.inventoryChart.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-4">
          <StatCard label={t('admin.dashboard.owner.dailyRevenue')} value={formatMoney(ownerStats.dailyRevenue)} hint={t('admin.dashboard.owner.dailyHint')} accent="from-slate-950 via-slate-800 to-slate-700" />
          <StatCard label={t('admin.dashboard.owner.monthlyRevenue')} value={formatMoney(ownerStats.monthlyRevenue)} hint={t('admin.dashboard.owner.monthlyHint')} accent="from-[#1f2937] via-[#374151] to-[#4b5563]" />
          <StatCard label={t('admin.dashboard.owner.orders')} value={ownerStats.totalOrders} hint={t('admin.dashboard.owner.ordersHint')} accent="from-[#1d4ed8] via-[#2563eb] to-[#38bdf8]" />
          <StatCard label={t('admin.dashboard.owner.activeRentals')} value={ownerStats.activeRentals} hint={t('admin.dashboard.owner.rentalsHint')} accent="from-[#0f766e] via-[#10b981] to-[#84cc16]" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard eyebrow={t('admin.dashboard.owner.performance')} title={t('admin.dashboard.owner.topProducts')} action={<button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t('admin.dashboard.owner.viewCatalog')} <ArrowRight className="h-4 w-4" /></button>}>
            <div className="space-y-4">
              {ownerStats.topProducts.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-500 shadow-sm">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.rentals} {t('admin.dashboard.owner.rentalsThisMonth')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-950">{item.utilization}%</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.dashboard.owner.utilization')}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow={t('admin.dashboard.owner.inventoryEyebrow')} title={t('admin.dashboard.owner.inventoryBreakdown')}>
            <div className="space-y-4">
              {ownerStats.inventoryChart.map((item) => {
                const width = `${Math.max((item.value / totalInventory) * 100, 8)}%`;
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-400">{item.value}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className={`h-3 rounded-full ${item.tone}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow={t('admin.dashboard.staff.today')}
        title={t('admin.dashboard.staff.focus')}
        action={
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <TrendingUp className="h-4 w-4" />
            {t('admin.dashboard.staff.shiftOnTrack')}
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-3">
          {staffStats.todayTasks
            .filter((item) => can(user, item.permission))
            .map((task) => (
              <div key={task.id} className={`rounded-[28px] bg-gradient-to-br ${task.accent} p-[1px]`}>
                <div className="rounded-[27px] bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">{task.title}</p>
                  <p className="mt-4 text-4xl font-semibold text-slate-950">{task.count}</p>
                </div>
              </div>
            ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow={t('admin.dashboard.staff.quickActions')} title={t('admin.dashboard.staff.canDoNow')}>
        <div className="grid gap-4 lg:grid-cols-3">
          {staffStats.quickActions
            .filter((item) => can(user, item.permission))
            .map((item) => (
              <button key={item.id} type="button" className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 text-left transition hover:border-slate-300 hover:bg-white">
                <p className="text-base font-semibold text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              </button>
            ))}
        </div>
      </SectionCard>
    </div>
  );
}


