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
        <p className="text-sm font-semibold text-neutral-700">Kich thuoc</p>
        <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          Free Size
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-neutral-700">Kich thuoc</p>
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
              className={`min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                active ? "border-amber-500 bg-amber-500 text-white" : "border-neutral-200 bg-white text-neutral-800"
              } ${disabled ? "cursor-not-allowed opacity-40" : "hover:border-neutral-300"}`}
              aria-pressed={active}
              aria-label={`Chon size ${size}`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
