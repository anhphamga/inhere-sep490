import SizeSelector from './SizeSelector'

export default function VariantSelector({
  sizes,
  selectedSize,
  conditionOptions = [],
  selectedConditionKey = '',
  onConditionChange,
  onSizeChange,
  isSizeDisabled,
  isFreeSize,
  hasSizes = false,
}) {
  return (
    <div className="space-y-4">
      {hasSizes ? (
        <>
          <SizeSelector
            sizes={sizes}
            selectedSize={selectedSize}
            onSelect={onSizeChange}
            isDisabled={isSizeDisabled}
            isFreeSize={isFreeSize}
          />
          <button
            type="button"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 mt-2"
            onClick={() => window.dispatchEvent(new Event('open-size-guide'))}
          >
            Bảng tư vấn size
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Sản phẩm không phân size
          </div>
          <button
            type="button"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => window.dispatchEvent(new Event('open-size-guide'))}
          >
            Bảng tư vấn size
          </button>
        </div>
      )}

      {conditionOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
              Tình trạng sản phẩm
            </p>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
              Chỉ áp dụng khi Mua
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Khi thuê, hệ thống tự động chọn sản phẩm phù hợp.
          </p>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((option) => {
              const active = selectedConditionKey === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onConditionChange?.(option.key)}
                  className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                  aria-pressed={active}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

