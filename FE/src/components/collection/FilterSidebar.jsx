const toArray = (value) => (Array.isArray(value) ? value : []);

function ToggleGroup({ title, options = [], selected = [], onToggle }) {
  if (!options.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const value = String(option?.value ?? option).trim();
          const label = String(option?.label ?? option).trim();
          if (!value) return null;
          const active = selected.includes(value);
          return (
            <button
              key={`${title}-${value}`}
              type="button"
              onClick={() => onToggle(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterSidebar({
  filters = {},
  selectedFilters,
  onToggleFilter,
  onPriceChange,
  onReset,
}) {
  const categories = toArray(filters?.categories);
  const colors = toArray(filters?.colors);
  const sizes = toArray(filters?.sizes);
  const min = Number(filters?.priceRange?.min || 0);
  const max = Number(filters?.priceRange?.max || 0);
  const selectedMin = Number(selectedFilters?.price?.min ?? min);
  const selectedMax = Number(selectedFilters?.price?.max ?? max);

  return (
    <aside className="space-y-4 rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
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

      <ToggleGroup
        title="Danh mục"
        options={categories}
        selected={selectedFilters?.category || []}
        onToggle={(value) => onToggleFilter('category', value)}
      />

      <ToggleGroup
        title="Màu sắc"
        options={colors}
        selected={selectedFilters?.color || []}
        onToggle={(value) => onToggleFilter('color', value)}
      />

      <ToggleGroup
        title="Kích thước"
        options={sizes}
        selected={selectedFilters?.size || []}
        onToggle={(value) => onToggleFilter('size', value)}
      />

      {max > min ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Khoảng giá</p>
          <div className="space-y-3">
            <input
              type="range"
              min={min}
              max={max}
              value={selectedMin}
              onChange={(event) => onPriceChange('min', Number(event.target.value))}
              className="w-full accent-amber-500"
            />
            <input
              type="range"
              min={min}
              max={max}
              value={selectedMax}
              onChange={(event) => onPriceChange('max', Number(event.target.value))}
              className="w-full accent-amber-500"
            />
            <p className="text-xs text-slate-500">
              {selectedMin.toLocaleString('vi-VN')}đ - {selectedMax.toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

