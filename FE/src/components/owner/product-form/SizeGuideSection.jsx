import { SIZE_GUIDE_GENDERS, SIZE_PRESETS, toText } from './formUtils'

const GENDER_LABELS = {
    male: 'Nam',
    female: 'Nữ',
}

const toCellValue = (value) => {
    if (value === undefined || value === null) return ''
    return String(value)
}

const HEADERS = [
    { key: 'sizeLabel', label: 'Size' },
    { key: 'height', label: 'Chiều cao (cm)' },
    { key: 'weight', label: 'Cân nặng (kg)' },
    { key: 'itemLength', label: 'Dài áo (cm)' },
    { key: 'itemWidth', label: 'Rộng (cm)' },
]

export default function SizeGuideSection({
    mode = 'global',
    rows = [],
    onModeChange,
    onUpdateCell,
    errors = {},
}) {
    const isProductMode = mode === 'product'

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">Bảng tư vấn size</h4>
                <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            name="size-guide-mode"
                            checked={!isProductMode}
                            onChange={() => onModeChange?.('global')}
                        />
                        Dùng bảng size mặc định (global)
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="radio"
                            name="size-guide-mode"
                            checked={isProductMode}
                            onChange={() => onModeChange?.('product')}
                        />
                        Dùng bảng size riêng cho sản phẩm này
                    </label>
                </div>
            </div>

            {isProductMode ? (
                <div className="space-y-4">
                    {SIZE_GUIDE_GENDERS.map((gender) => {
                        const genderRows = SIZE_PRESETS
                            .map((sizeLabel) => rows.find((row) => row.gender === gender && row.sizeLabel === sizeLabel))
                            .filter(Boolean)

                        return (
                            <div key={gender} className="space-y-2">
                                <p className="text-sm font-semibold text-slate-800">{GENDER_LABELS[gender]}</p>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-left border-collapse min-w-[760px]">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {HEADERS.map((header) => (
                                                    <th key={header.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        {header.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {genderRows.map((row, index) => (
                                                <tr key={`${row.gender}-${row.sizeLabel}`} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                                                        {row.sizeLabel}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <RangeInput
                                                            minValue={toCellValue(row.heightMin)}
                                                            maxValue={toCellValue(row.heightMax)}
                                                            onChangeMin={(value) => onUpdateCell?.(gender, index, 'heightMin', value)}
                                                            onChangeMax={(value) => onUpdateCell?.(gender, index, 'heightMax', value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <RangeInput
                                                            minValue={toCellValue(row.weightMin)}
                                                            maxValue={toCellValue(row.weightMax)}
                                                            onChangeMin={(value) => onUpdateCell?.(gender, index, 'weightMin', value)}
                                                            onChangeMax={(value) => onUpdateCell?.(gender, index, 'weightMax', value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                                                            value={toCellValue(row.itemLength)}
                                                            onChange={(event) => onUpdateCell?.(gender, index, 'itemLength', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                                                            value={toCellValue(row.itemWidth)}
                                                            onChange={(event) => onUpdateCell?.(gender, index, 'itemWidth', event.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    })}
                    {errors.sizeGuideRows ? <p className="text-xs text-rose-600">{errors.sizeGuideRows}</p> : null}
                </div>
            ) : (
                <p className="text-sm text-slate-500">Sản phẩm sẽ dùng bảng size mặc định của hệ thống.</p>
            )}
        </section>
    )
}

function RangeInput({ minValue, maxValue, onChangeMin, onChangeMax }) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                min="0"
                className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                value={toText(minValue)}
                onChange={(event) => onChangeMin?.(event.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input
                type="number"
                min="0"
                className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                value={toText(maxValue)}
                onChange={(event) => onChangeMax?.(event.target.value)}
            />
        </div>
    )
}
