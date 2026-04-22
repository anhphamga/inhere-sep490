import { useEffect, useMemo, useState } from 'react'
import {
    deleteOwnerGlobalSizeGuideApi,
    getOwnerGlobalSizeGuideApi,
    upsertOwnerGlobalSizeGuideApi,
} from '../../services/owner.service'
import {
    createDefaultSizeGuideRows,
    normalizeSizeGuideRows,
    SIZE_GUIDE_GENDERS,
    SIZE_PRESETS,
} from './product-form/formUtils'

const GENDER_LABELS = {
    male: 'Nam',
    female: 'Nữ',
}

const emptySummary = {
    success: '',
    error: '',
}

export default function OwnerGlobalSizeGuideModal({ open = false, onClose, onSaved }) {
    const [rows, setRows] = useState(createDefaultSizeGuideRows())
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [message, setMessage] = useState(emptySummary)

    useEffect(() => {
        if (!open) return

        let mounted = true
        const loadData = async () => {
            try {
                setLoading(true)
                setMessage(emptySummary)
                const response = await getOwnerGlobalSizeGuideApi()
                if (!mounted) return
                setRows(createDefaultSizeGuideRows(response?.data?.rows))
            } catch (apiError) {
                if (!mounted) return
                setRows(createDefaultSizeGuideRows())
                setMessage({
                    success: '',
                    error: apiError?.response?.data?.message || apiError?.message || 'Không thể tải bảng size mặc định.',
                })
            } finally {
                if (mounted) setLoading(false)
            }
        }

        loadData()
        return () => {
            mounted = false
        }
    }, [open])

    const validationError = useMemo(() => {
        const normalized = normalizeSizeGuideRows(rows)
        if (normalized.length !== SIZE_PRESETS.length * SIZE_GUIDE_GENDERS.length) {
            return 'Bảng size mặc định phải có đủ male/female cho S, M, L, XL.'
        }

        const invalid = normalized.some((row) => (
            Number.isNaN(row.heightMin)
            || Number.isNaN(row.heightMax)
            || Number.isNaN(row.weightMin)
            || Number.isNaN(row.weightMax)
            || row.heightMin === null
            || row.heightMax === null
            || row.weightMin === null
            || row.weightMax === null
            || row.heightMin > row.heightMax
            || row.weightMin > row.weightMax
            || Number.isNaN(row.itemLength)
            || Number.isNaN(row.itemWidth)
        ))

        return invalid
            ? 'Vui lòng nhập đủ chiều cao/cân nặng hợp lệ (min <= max), và số đo optional phải >= 0 nếu có nhập.'
            : ''
    }, [rows])

    const updateCell = (gender, sizeLabel, field, value) => {
        setRows((prev) => prev.map((row) => {
            if (row.gender !== gender || row.sizeLabel !== sizeLabel) return row
            return { ...row, [field]: value }
        }))
        setMessage(emptySummary)
    }

    const handleSave = async () => {
        if (validationError) {
            setMessage({ success: '', error: validationError })
            return
        }

        try {
            setSaving(true)
            setMessage(emptySummary)
            const normalizedRows = normalizeSizeGuideRows(rows)
            await upsertOwnerGlobalSizeGuideApi({ rows: normalizedRows })
            setMessage({ success: 'Đã lưu bảng size mặc định.', error: '' })
            onSaved?.()
        } catch (apiError) {
            setMessage({
                success: '',
                error: apiError?.response?.data?.message || apiError?.message || 'Không thể lưu bảng size mặc định.',
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        const confirmed = window.confirm('Bạn muốn xóa toàn bộ bảng size mặc định?')
        if (!confirmed) return

        try {
            setRemoving(true)
            setMessage(emptySummary)
            await deleteOwnerGlobalSizeGuideApi()
            setRows(createDefaultSizeGuideRows())
            setMessage({ success: 'Đã xóa bảng size mặc định.', error: '' })
            onSaved?.()
        } catch (apiError) {
            setMessage({
                success: '',
                error: apiError?.response?.data?.message || apiError?.message || 'Không thể xóa bảng size mặc định.',
            })
        } finally {
            setRemoving(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center" onClick={onClose}>
            <div className="w-full max-w-6xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
                <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">Cấu hình bảng size mặc định</h3>
                    <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" onClick={onClose}>Đóng</button>
                </div>

                <div className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto space-y-4">
                    {loading ? <p className="text-sm text-slate-500">Đang tải dữ liệu...</p> : null}

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
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Size</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chiều cao (cm)</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cân nặng (kg)</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dài áo (cm)</th>
                                                <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Rộng (cm)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {genderRows.map((row) => (
                                                <tr key={`${row.gender}-${row.sizeLabel}`} className="border-t border-slate-100">
                                                    <td className="px-3 py-2 text-sm font-semibold text-slate-700">{row.sizeLabel}</td>
                                                    <td className="px-3 py-2">
                                                        <RangeInput
                                                            minValue={row.heightMin}
                                                            maxValue={row.heightMax}
                                                            onChangeMin={(value) => updateCell(gender, row.sizeLabel, 'heightMin', value)}
                                                            onChangeMax={(value) => updateCell(gender, row.sizeLabel, 'heightMax', value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <RangeInput
                                                            minValue={row.weightMin}
                                                            maxValue={row.weightMax}
                                                            onChangeMin={(value) => updateCell(gender, row.sizeLabel, 'weightMin', value)}
                                                            onChangeMax={(value) => updateCell(gender, row.sizeLabel, 'weightMax', value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                                                            value={row.itemLength}
                                                            onChange={(event) => updateCell(gender, row.sizeLabel, 'itemLength', event.target.value)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                                                            value={row.itemWidth}
                                                            onChange={(event) => updateCell(gender, row.sizeLabel, 'itemWidth', event.target.value)}
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

                    {message.error ? <p className="text-sm text-rose-600">{message.error}</p> : null}
                    {message.success ? <p className="text-sm text-emerald-600">{message.success}</p> : null}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm font-medium disabled:opacity-60"
                            onClick={handleDelete}
                            disabled={saving || removing || loading}
                        >
                            {removing ? 'Đang xóa...' : 'Xóa bảng global'}
                        </button>
                        <button
                            type="button"
                            className="h-10 px-3 rounded-lg bg-[#1975d2] text-white text-sm font-semibold disabled:opacity-60"
                            onClick={handleSave}
                            disabled={saving || removing || loading}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu bảng global'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function RangeInput({ minValue, maxValue, onChangeMin, onChangeMax }) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                min="0"
                className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                value={String(minValue ?? '')}
                onChange={(event) => onChangeMin?.(event.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input
                type="number"
                min="0"
                className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm"
                value={String(maxValue ?? '')}
                onChange={(event) => onChangeMax?.(event.target.value)}
            />
        </div>
    )
}
