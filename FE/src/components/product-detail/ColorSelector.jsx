export default function ColorSelector({
  colors = [],
  selectedColor = "",
  onSelect,
  getSwatchClass,
  isDisabled,
}) {
  if (!colors.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-neutral-700">Mau sac</p>
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
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-neutral-200 bg-white text-neutral-700"
              } ${disabled ? "cursor-not-allowed opacity-40" : "hover:border-neutral-300"}`}
              aria-pressed={active}
              aria-label={`Chon mau ${color}`}
            >
              <span
                className={`h-4 w-4 rounded-full border border-neutral-300 ${getSwatchClass?.(color) || "bg-neutral-300"}`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap leading-none">{color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
