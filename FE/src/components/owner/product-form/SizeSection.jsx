import { SIZE_PRESETS, toText } from './formUtils'

export default function SizeSection({
    hasSizes = false,
    quantity = '',
    sizes = [],
    sizeDraft = '',
    onToggleHasSizes,
    onQuantityChange,
    onSizeDraftChange,
    onAddSize,
    onUpdateSize,
    onRemoveSize,
    errors = {},
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Kích cỡ & Số lượng</h4>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <input type="checkbox" checked={hasSizes} onChange={(event) => onToggleHasSizes(event.target.checked)} />
                    Có kích cỡ
                </label>
            </div>

            {hasSizes ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {SIZE_PRESETS.map((size) => (
                            <button
                                key={size}
                                type="button"
                                className="h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-medium hover:bg-slate-50"
                                onClick={() => onAddSize(size)}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm"
                            placeholder="Kích cỡ tùy chỉnh"
                            value={sizeDraft}
                            onChange={(event) => onSizeDraftChange(event.target.value)}
                        />
                        <button
                            type="button"
                            className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
                            onClick={() => onAddSize()}
                        >
                            Thêm kích cỡ
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kích cỡ</th>
                                    <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng</th>
                                    <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizes.map((item, index) => (
                                    <tr key={`${toText(item.size)}-${index}`} className="border-b border-slate-100 last:border-b-0">
                                        <td className="py-2 pr-2">
                                            <input
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm"
                                                value={item.size}
                                                onChange={(event) => onUpdateSize(index, 'size', event.target.value.toUpperCase())}
                                            />
                                        </td>
                                        <td className="py-2 pr-2">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm"
                                                value={item.quantity}
                                                onChange={(event) => onUpdateSize(index, 'quantity', event.target.value)}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <button
                                                type="button"
                                                className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50"
                                                onClick={() => onRemoveSize(index)}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {errors.sizes ? <p className="text-xs text-rose-600">{errors.sizes}</p> : null}
                </div>
            ) : (
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Số lượng</label>
                    <input
                        type="number"
                        min="0"
                        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm"
                        value={quantity}
                        onChange={(event) => onQuantityChange(event.target.value)}
                    />
                    {errors.quantity ? <p className="text-xs text-rose-600">{errors.quantity}</p> : null}
                </div>
            )}
        </section>
    )
}
