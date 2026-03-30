export default function SizeSelector({
  sizes = [],
  selectedSize = "",
  onSelect,
  isDisabled,
  isFreeSize = false,
}) {
  if (!sizes.length) return null;

  if (isFreeSize) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Kích thước</p>
          <button type="button" className="text-xs font-medium text-slate-500 underline hover:text-slate-700">Hướng dẫn chọn size</button>
        </div>
        <span className="inline-flex h-10 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
          Free Size
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Kích thước</p>
        <button type="button" className="text-xs font-medium text-slate-500 underline hover:text-slate-700">Hướng dẫn chọn size</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const active = selectedSize === size;
          const disabled = Boolean(isDisabled?.(size));
          return (
            <button
              key={size}
              type="button"
              onClick={() => !disabled && onSelect?.(size)}
              disabled={disabled}
              className={`inline-flex h-10 min-w-[56px] items-center justify-center rounded-lg border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
              aria-pressed={active}
              aria-label={`Chọn size ${size}`}
            >
              <span className="break-words">{size}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
