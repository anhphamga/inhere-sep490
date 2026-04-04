const HOUR_OPTIONS = Array.from({ length: 15 }, (_, index) => String(8 + index).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

export default function TimeSelector({ value, onChange, error }) {
  const [selectedHour = '14', selectedMinute = '00'] = String(value || '14:00').split(':');

  const setHour = (hour) => {
    onChange(`${String(hour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`);
  };

  const setMinute = (minute) => {
    onChange(`${String(selectedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">Giờ đến</label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Giờ</label>
          <select
            value={String(selectedHour).padStart(2, '0')}
            onChange={(event) => setHour(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Phút</label>
          <select
            value={String(selectedMinute).padStart(2, '0')}
            onChange={(event) => setMinute(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          >
            {MINUTE_OPTIONS.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">Khung giờ phục vụ từ 08:00 đến 22:00.</p>
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
