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
    <section className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="space-y-4">
        <p className="break-words text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">{category || "Danh muc"}</p>
        <h1 className="max-w-full break-words text-3xl font-bold leading-[1.12] text-neutral-900 md:text-4xl xl:text-[42px]">
          {name || "San pham"}
        </h1>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex min-h-9 max-w-full items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600"
            >
              <span className="break-words">{badge}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fff7e6_0%,#fff4d6_100%)] p-4 sm:grid-cols-2 lg:p-5">
        <div className="min-w-0 rounded-2xl bg-white/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Gia thue</p>
          <p className="mt-2 break-words text-3xl font-bold text-amber-700">{rentPriceText}</p>
          <p className="mt-1 text-xs text-neutral-500">/ngay</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Gia ban</p>
          <p className="mt-2 break-words text-2xl font-semibold text-neutral-800">{salePriceText}</p>
        </div>
      </div>

      {variantContent}
      {actionsContent}
    </section>
  );
}
