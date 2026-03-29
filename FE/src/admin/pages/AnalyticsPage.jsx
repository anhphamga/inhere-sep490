import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';

export default function AnalyticsPage() {
  const { t } = useTranslate();
  const metrics = {
    dailyRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
  };

  return (
    <div className="space-y-6">
      <SectionCard eyebrow={t('admin.analytics.eyebrow')} title={t('admin.analytics.title')}>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] bg-slate-900 p-6 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">{t('admin.analytics.daily')}</p>
            <p className="mt-4 text-3xl font-semibold">{metrics.dailyRevenue.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.analytics.monthly')}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{metrics.monthlyRevenue.toLocaleString('vi-VN')}đ</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.analytics.topOrders')}</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{metrics.totalOrders}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

