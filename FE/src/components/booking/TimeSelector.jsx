const TIME_OPTIONS = [
  { value: '10:00', label: '10:00' },
  { value: '11:00', label: '11:00', disabled: true, badge: 'Đã full' },
  { value: '14:00', label: '14:00', badge: 'Khung giờ đẹp' },
  { value: '16:00', label: '16:00' },
];

export default function TimeSelector({ value, onChange, error }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">Giờ đến</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIME_OPTIONS.map((option) => {
          const active = value === option.value;
          const disabled = Boolean(option.disabled);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`group rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : active
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="block">{option.label}</span>
              {option.badge ? (
                <span
                  className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    disabled
                      ? 'bg-slate-200 text-slate-500'
                      : active
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {option.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
