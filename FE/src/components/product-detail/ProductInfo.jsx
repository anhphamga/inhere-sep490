export default function ProductInfo({
  name,
  rentPriceText,
  salePriceText,
  variantContent,
  actionsContent,
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-6 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Còn hàng
          </span>
        </div>

        <h1 className="text-[28px] font-bold leading-tight text-slate-900 md:text-[32px]">
          {name || "Sản phẩm"}
        </h1>
        <p className="text-sm text-slate-500">Bởi Inhere Collection</p>
      </div>

      {/* Price block */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-4">

          {/* Giá thuê */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Giá thuê / ngày
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {rentPriceText}
            </p>
          </div>

          {/* Giá mua */}
          <div className="border-l border-slate-200 pl-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Giá mua
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {salePriceText}
            </p>
          </div>

        </div>
      </div>

      {variantContent}
      {actionsContent}
    </div>
  );
}
