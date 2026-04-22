export default function ColorSelector({
  colors = [],
  selectedColor = "",
  onSelect,
  getSwatchClass,
  isDisabled,
}) {
  if (!colors.length) return null;

  if (colors.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Màu sắc</p>
        <span
          className={`inline-block h-5 w-5 rounded-full border border-slate-300 ${getSwatchClass?.(colors[0]) || "bg-neutral-300"}`}
          aria-hidden="true"
        />
        <span className="text-sm text-slate-600">{colors[0]}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Màu sắc</p>
        <span className="text-sm text-slate-400">{selectedColor || "-"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const active = selectedColor === color;
          const disabled = Boolean(isDisabled?.(color));
          return (
            <button
              key={color}
              type="button"
              onClick={() => !disabled && onSelect?.(color)}
              disabled={disabled}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
              aria-pressed={active}
              aria-label={`Chọn màu ${color}`}
            >
              <span
                className={`h-5 w-5 rounded-full border border-slate-300 ${getSwatchClass?.(color) || "bg-neutral-300"}`}
                aria-hidden="true"
              />
              <span>{color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
