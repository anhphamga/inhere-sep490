const statusTone = {
  PendingDeposit: 'border-amber-200 bg-amber-50 text-amber-700',
  Deposited: 'border-sky-200 bg-sky-50 text-sky-700',
  Confirmed: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Renting: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Returned: 'border-slate-200 bg-slate-100 text-slate-700',
  Late: 'border-rose-200 bg-rose-50 text-rose-700',
  NoShow: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Washing: 'border-amber-200 bg-amber-50 text-amber-700',
  Repair: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[value] || 'border-slate-200 bg-slate-100 text-slate-700'}`}>
      {value}
    </span>
  );
}
