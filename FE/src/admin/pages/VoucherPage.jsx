import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';
import StatusBadge from '../components/StatusBadge';

export default function VoucherPage() {
  const { t } = useTranslate();
  const vouchers = [];

  return (
    <SectionCard eyebrow={t('admin.vouchers.eyebrow')} title={t('admin.vouchers.title')}>
      <div className="mb-5 flex justify-end">
        <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{t('admin.vouchers.createVoucher')}</button>
      </div>
      <div className="grid gap-4">
        {vouchers.map((voucher) => (
          <div key={voucher.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{voucher.code}</p>
                <p className="mt-1 text-sm text-slate-500">{voucher.value} • {t('admin.vouchers.expiresAt')} {voucher.expiresAt}</p>
              </div>
              <StatusBadge value={voucher.status} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('admin.vouchers.usage')}</p><p className="mt-2 text-xl font-semibold text-slate-950">{voucher.used}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('admin.vouchers.limit')}</p><p className="mt-2 text-xl font-semibold text-slate-950">{voucher.limit}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('admin.vouchers.status')}</p><p className="mt-2"><StatusBadge value={voucher.status} /></p></div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

