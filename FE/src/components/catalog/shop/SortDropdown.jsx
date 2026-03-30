const SORT_OPTIONS = [
  { value: 'top_liked', label: 'Nổi bật' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'name_asc', label: 'Tên A-Z' },
];

export default function SortDropdown({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sắp xếp</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
