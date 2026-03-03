export default function ProductInfo({
  name,
  category,
  badges = [],
  rentPriceText,
  salePriceText,
  variantContent,
  actionsContent,
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{category || "Danh muc"}</p>
        <h1 className="text-2xl font-bold leading-tight text-neutral-900 md:text-4xl">{name || "San pham"}</h1>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex min-h-8 items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Gia thue</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{rentPriceText}</p>
          <p className="text-xs text-neutral-500">/ngay</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Gia ban</p>
          <p className="mt-1 text-xl font-semibold text-neutral-800">{salePriceText}</p>
        </div>
      </div>

      {variantContent}
      {actionsContent}
    </section>
  );
}
