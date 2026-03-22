import SectionCard from '../components/SectionCard';
import { mockVouchers } from '../mockData';

export default function VoucherPage() {
  return (
    <SectionCard eyebrow="Growth" title="Vouchers">
      <div className="mb-5 flex justify-end">
        <button type="button" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Create voucher</button>
      </div>
      <div className="grid gap-4">
        {mockVouchers.map((voucher) => (
          <div key={voucher.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{voucher.code}</p>
                <p className="mt-1 text-sm text-slate-500">{voucher.value} • expires {voucher.expiresAt}</p>
              </div>
              <button type="button" className={`rounded-2xl px-4 py-2 text-sm font-semibold ${voucher.status === 'Enabled' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {voucher.status}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Usage</p><p className="mt-2 text-xl font-semibold text-slate-950">{voucher.used}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Limit</p><p className="mt-2 text-xl font-semibold text-slate-950">{voucher.limit}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p><p className="mt-2 text-xl font-semibold text-slate-950">{voucher.status}</p></div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
