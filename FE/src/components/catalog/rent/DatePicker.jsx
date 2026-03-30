export default function DatePicker({ startDate, endDate, onChangeStartDate, onChangeEndDate }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-white/90 p-3 backdrop-blur md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ngày nhận</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onChangeStartDate(event.target.value)}
          className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ngày trả</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onChangeEndDate(event.target.value)}
          min={startDate || undefined}
          className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400"
        />
      </label>
    </div>
  );
}
