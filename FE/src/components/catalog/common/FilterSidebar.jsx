const OCCASION_OPTIONS = [
  { value: 'wedding', label: 'Lễ cưới' },
  { value: 'festival', label: 'Lễ hội' },
  { value: 'photoshoot', label: 'Chụp ảnh' },
  { value: 'travel', label: 'Du lịch Hội An' },
];

const PRICE_OPTIONS = [
  { value: '', label: 'Tất cả mức giá' },
  { value: 'low', label: 'Dưới 300.000đ' },
  { value: 'mid', label: '300.000đ - 700.000đ' },
  { value: 'high', label: 'Trên 700.000đ' },
];

export default function FilterSidebar({
  mode = 'shop',
  categories = [],
  filters,
  onChange,
  onReset,
  sizeOptions = [],
  colorOptions = [],
  className = '',
}) {
  const isRent = mode === 'rent';

  return (
    <aside className={`space-y-4 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Bộ lọc</h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-amber-600 transition hover:text-amber-700"
        >
          Đặt lại
        </button>
      </div>

      {isRent && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Dịp sử dụng</label>
          <select
            value={filters.occasion}
            onChange={(event) => onChange('occasion', event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          >
            <option value="">Tất cả dịp</option>
            {OCCASION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Danh mục</label>
        <select
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.displayName} ({category.count || 0})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Màu sắc</label>
        <select
          value={filters.color}
          onChange={(event) => onChange('color', event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="">Tất cả màu</option>
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Kích thước</label>
        <select
          value={filters.size}
          onChange={(event) => onChange('size', event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        >
          <option value="">Tất cả size</option>
          {sizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Khoảng giá</label>
        <select
          value={filters.price}
          onChange={(event) => onChange('price', event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        >
          {PRICE_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
