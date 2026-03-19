import { useEffect, useMemo, useState } from 'react'
import { Calendar, Pencil, Plus, Power, Search, TicketPercent } from 'lucide-react'
import {
    createVoucherApi,
    getVoucherDetailApi,
    getVouchersApi,
    toggleVoucherStatusApi,
    updateVoucherApi,
} from '../../services/voucher.service'

const initialFilters = {
    search: '',
    isActive: '',
    voucherType: '',
    appliesTo: '',
    statusFilter: '',
}

const initialForm = {
    code: '',
    name: '',
    description: '',
    isActive: true,
    startDate: '',
    endDate: '',
    voucherType: 'percent',
    value: '10',
    maxDiscount: '',
    appliesTo: 'both',
    minOrderValue: '0',
    usageLimitTotal: '',
    usageLimitPerUser: '',
    firstOrderOnly: false,
    eligibleCategories: '',
    excludedProducts: '',
    userSegments: '',
}

const toInputDateTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''

    const pad = (num) => String(num).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const parseCommaSeparatedValues = (value = '') =>
    String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

const stringifyList = (value) => (Array.isArray(value) ? value.join(', ') : '')

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const formatVoucherValue = (voucher) => {
    if (voucher.voucherType === 'percent') {
        const maxDiscount = voucher.maxDiscount ? `, tối đa ${formatMoney(voucher.maxDiscount)}` : ''
        return `Giảm ${voucher.value}%${maxDiscount}`
    }

    return `Giảm ${formatMoney(voucher.value)}`
}

const getVoucherStatus = (voucher) => {
    const now = Date.now()
    const startTime = voucher.startDate ? new Date(voucher.startDate).getTime() : null
    const endTime = voucher.endDate ? new Date(voucher.endDate).getTime() : null

    if (!voucher.isActive) return { label: 'Tắt', tone: 'bg-slate-100 text-slate-600' }
    if (startTime && startTime > now) return { label: 'Sắp diễn ra', tone: 'bg-sky-100 text-sky-700' }
    if (endTime && endTime < now) return { label: 'Hết hạn', tone: 'bg-amber-100 text-amber-700' }

    return { label: 'Đang áp dụng', tone: 'bg-emerald-100 text-emerald-700' }
}

const buildVoucherPayload = (form) => ({
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    isActive: Boolean(form.isActive),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    voucherType: form.voucherType,
    value: Number(form.value || 0),
    maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
    appliesTo: form.appliesTo,
    appliesOn: 'subtotal',
    minOrderValue: Number(form.minOrderValue || 0),
    usageLimitTotal: form.usageLimitTotal === '' ? null : Number(form.usageLimitTotal),
    usageLimitPerUser: form.usageLimitPerUser === '' ? null : Number(form.usageLimitPerUser),
    firstOrderOnly: Boolean(form.firstOrderOnly),
    eligibleCategories: parseCommaSeparatedValues(form.eligibleCategories),
    excludedProducts: parseCommaSeparatedValues(form.excludedProducts),
    userSegments: parseCommaSeparatedValues(form.userSegments),
})

const mapVoucherToForm = (voucher) => ({
    code: voucher.code || '',
    name: voucher.name || '',
    description: voucher.description || '',
    isActive: voucher.isActive !== false,
    startDate: toInputDateTime(voucher.startDate),
    endDate: toInputDateTime(voucher.endDate),
    voucherType: voucher.voucherType || 'percent',
    value: String(voucher.value ?? 0),
    maxDiscount: voucher.maxDiscount ?? '',
    appliesTo: voucher.appliesTo || 'both',
    minOrderValue: String(voucher.minOrderValue ?? 0),
    usageLimitTotal: voucher.usageLimitTotal ?? '',
    usageLimitPerUser: voucher.usageLimitPerUser ?? '',
    firstOrderOnly: Boolean(voucher.firstOrderOnly),
    eligibleCategories: stringifyList(voucher.eligibleCategories),
    excludedProducts: stringifyList(voucher.excludedProducts),
    userSegments: stringifyList(voucher.userSegments),
})

const getErrorMessage = (error, fallback) => {
    const details = error?.response?.data?.errors
    if (Array.isArray(details) && details.length > 0) {
        return details.map((item) => item?.message).filter(Boolean).join(' ')
    }

    return error?.response?.data?.message || error?.message || fallback
}

export default function PromotionsList() {
    const [vouchers, setVouchers] = useState([])
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [filters, setFilters] = useState(initialFilters)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [editingId, setEditingId] = useState('')
    const [form, setForm] = useState(initialForm)

    const queryParams = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: filters.search || undefined,
        isActive: filters.isActive || undefined,
        voucherType: filters.voucherType || undefined,
        appliesTo: filters.appliesTo || undefined,
        statusFilter: filters.statusFilter || undefined,
    }), [filters, pagination.page, pagination.limit])

    const loadVouchers = async () => {
        try {
            setLoading(true)
            setError('')
            const response = await getVouchersApi(queryParams)
            setVouchers(Array.isArray(response?.data) ? response.data : [])
            setPagination((prev) => ({
                ...prev,
                ...(response?.pagination || {}),
            }))
        } catch (apiError) {
            setError(getErrorMessage(apiError, 'Không tải được danh sách voucher.'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadVouchers()
    }, [queryParams])

    const resetForm = () => {
        setEditingId('')
        setForm(initialForm)
    }

    const startEdit = async (voucherId) => {
        try {
            setError('')
            const response = await getVoucherDetailApi(voucherId)
            if (response?.data) {
                setEditingId(response.data._id)
                setForm(mapVoucherToForm(response.data))
            }
        } catch (apiError) {
            setError(getErrorMessage(apiError, 'Không tải được chi tiết voucher.'))
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        try {
            setSaving(true)
            setError('')
            setSuccessMessage('')

            const payload = buildVoucherPayload(form)

            if (editingId) {
                const response = await updateVoucherApi(editingId, payload)
                setSuccessMessage(response?.message || 'Cập nhật voucher thành công.')
            } else {
                const response = await createVoucherApi(payload)
                setSuccessMessage(response?.message || 'Tạo voucher thành công.')
            }

            resetForm()
            await loadVouchers()
        } catch (apiError) {
            setError(getErrorMessage(apiError, 'Không lưu được voucher.'))
        } finally {
            setSaving(false)
        }
    }

    const handleToggleStatus = async (voucher) => {
        try {
            setError('')
            setSuccessMessage('')
            const response = await toggleVoucherStatusApi(voucher._id)
            setSuccessMessage(response?.message || 'Cập nhật trạng thái voucher thành công.')
            await loadVouchers()
        } catch (apiError) {
            setError(getErrorMessage(apiError, 'Không cập nhật được trạng thái voucher.'))
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingId ? 'Cập nhật voucher' : 'Tạo voucher mới'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Quản lý mã giảm giá cho đơn mua và đơn thuê theo flow backend hiện tại.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                            onClick={resetForm}
                        >
                            <Plus className="h-4 w-4" />
                            Form mới
                        </button>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Mã voucher" value={form.code} onChange={(value) => setForm((prev) => ({ ...prev, code: value.toUpperCase() }))} />
                            <Select
                                label="Loại giảm"
                                value={form.voucherType}
                                onChange={(value) => setForm((prev) => ({ ...prev, voucherType: value }))}
                                options={[
                                    { value: 'percent', label: 'Phần trăm' },
                                    { value: 'fixed', label: 'Tiền cố định' },
                                ]}
                            />
                        </div>

                        <Field label="Tên voucher" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
                        <TextArea label="Mô tả" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Giá trị" type="number" value={form.value} onChange={(value) => setForm((prev) => ({ ...prev, value }))} />
                            <Field label="Giảm tối đa" type="number" value={form.maxDiscount} onChange={(value) => setForm((prev) => ({ ...prev, maxDiscount: value }))} placeholder="Để trống nếu không giới hạn" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Áp dụng cho"
                                value={form.appliesTo}
                                onChange={(value) => setForm((prev) => ({ ...prev, appliesTo: value }))}
                                options={[
                                    { value: 'both', label: 'Thuê và mua' },
                                    { value: 'sale', label: 'Chỉ đơn mua' },
                                    { value: 'rental', label: 'Chỉ đơn thuê' },
                                ]}
                            />
                            <Field label="Đơn tối thiểu" type="number" value={form.minOrderValue} onChange={(value) => setForm((prev) => ({ ...prev, minOrderValue: value }))} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Bắt đầu" type="datetime-local" value={form.startDate} onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))} />
                            <Field label="Kết thúc" type="datetime-local" value={form.endDate} onChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Giới hạn tổng" type="number" value={form.usageLimitTotal} onChange={(value) => setForm((prev) => ({ ...prev, usageLimitTotal: value }))} placeholder="Để trống nếu không giới hạn" />
                            <Field label="Giới hạn mỗi khách" type="number" value={form.usageLimitPerUser} onChange={(value) => setForm((prev) => ({ ...prev, usageLimitPerUser: value }))} placeholder="Để trống nếu không giới hạn" />
                        </div>

                        <Field label="Segment khách hàng" value={form.userSegments} onChange={(value) => setForm((prev) => ({ ...prev, userSegments: value }))} placeholder="Ví dụ: MEMBER, VIP" />
                        <Field label="Danh mục áp dụng" value={form.eligibleCategories} onChange={(value) => setForm((prev) => ({ ...prev, eligibleCategories: value }))} placeholder="Nhập ObjectId hoặc slug, phân tách bằng dấu phẩy" />
                        <Field label="Sản phẩm loại trừ" value={form.excludedProducts} onChange={(value) => setForm((prev) => ({ ...prev, excludedProducts: value }))} placeholder="Nhập productId, phân tách bằng dấu phẩy" />

                        <div className="flex flex-wrap items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                                Đang hoạt động
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={form.firstOrderOnly} onChange={(event) => setForm((prev) => ({ ...prev, firstOrderOnly: event.target.checked }))} />
                                Chỉ áp dụng cho đơn đầu tiên
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1975d2] px-5 text-sm font-semibold text-white disabled:opacity-60"
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : editingId ? 'Cập nhật voucher' : 'Tạo voucher'}
                        </button>
                    </form>
                </section>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Danh sách voucher</h2>
                            <p className="text-sm text-slate-500">Tìm kiếm, lọc và bật tắt trạng thái voucher đang có.</p>
                        </div>
                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                            Tổng voucher: <strong className="text-slate-900">{pagination.total || 0}</strong>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(event) => {
                                    setPagination((prev) => ({ ...prev, page: 1 }))
                                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                                }}
                                placeholder="Tìm theo mã hoặc tên voucher"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#1975d2]"
                            />
                        </div>

                        <SelectCompact
                            value={filters.isActive}
                            onChange={(value) => {
                                setPagination((prev) => ({ ...prev, page: 1 }))
                                setFilters((prev) => ({ ...prev, isActive: value }))
                            }}
                            options={[
                                { value: '', label: 'Mọi trạng thái bật/tắt' },
                                { value: 'true', label: 'Đang bật' },
                                { value: 'false', label: 'Đang tắt' },
                            ]}
                        />
                        <SelectCompact
                            value={filters.voucherType}
                            onChange={(value) => {
                                setPagination((prev) => ({ ...prev, page: 1 }))
                                setFilters((prev) => ({ ...prev, voucherType: value }))
                            }}
                            options={[
                                { value: '', label: 'Mọi loại giảm' },
                                { value: 'percent', label: 'Phần trăm' },
                                { value: 'fixed', label: 'Cố định' },
                            ]}
                        />
                        <SelectCompact
                            value={filters.appliesTo}
                            onChange={(value) => {
                                setPagination((prev) => ({ ...prev, page: 1 }))
                                setFilters((prev) => ({ ...prev, appliesTo: value }))
                            }}
                            options={[
                                { value: '', label: 'Mọi phạm vi' },
                                { value: 'both', label: 'Thuê và mua' },
                                { value: 'sale', label: 'Đơn mua' },
                                { value: 'rental', label: 'Đơn thuê' },
                            ]}
                        />
                    </div>

                    <div className="grid gap-3 md:grid-cols-[220px_auto]">
                        <SelectCompact
                            value={filters.statusFilter}
                            onChange={(value) => {
                                setPagination((prev) => ({ ...prev, page: 1 }))
                                setFilters((prev) => ({ ...prev, statusFilter: value }))
                            }}
                            options={[
                                { value: '', label: 'Mọi tình trạng thời gian' },
                                { value: 'active', label: 'Đang áp dụng' },
                                { value: 'upcoming', label: 'Sắp diễn ra' },
                                { value: 'expired', label: 'Hết hạn' },
                            ]}
                        />

                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                                onClick={() => {
                                    setPagination((prev) => ({ ...prev, page: 1 }))
                                    setFilters(initialFilters)
                                }}
                            >
                                Làm mới bộ lọc
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {error}
                        </div>
                    ) : null}

                    {successMessage ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {successMessage}
                        </div>
                    ) : null}

                    {loading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                            Đang tải danh sách voucher...
                        </div>
                    ) : null}

                    {!loading && vouchers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                            <TicketPercent className="mx-auto h-10 w-10 text-slate-400" />
                            <h3 className="mt-3 text-lg font-semibold text-slate-900">Chưa có voucher phù hợp</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Hãy tạo voucher mới hoặc đổi bộ lọc để xem dữ liệu khác.
                            </p>
                        </div>
                    ) : null}

                    {!loading && vouchers.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            {vouchers.map((voucher) => {
                                const status = getVoucherStatus(voucher)

                                return (
                                    <article key={voucher._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.18em] text-[#1975d2]">Mã voucher</p>
                                                <h3 className="mt-2 text-xl font-bold text-slate-900">{voucher.code}</h3>
                                                <p className="mt-1 text-sm text-slate-500">{voucher.name || 'Voucher không tên'}</p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
                                                {status.label}
                                            </span>
                                        </div>

                                        <p className="mt-4 text-lg font-bold text-[#7b1f39]">{formatVoucherValue(voucher)}</p>
                                        <p className="mt-2 min-h-[40px] text-sm text-slate-600">
                                            {voucher.description || 'Không có mô tả thêm cho voucher này.'}
                                        </p>

                                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                                            <p>Áp dụng cho: <strong>{voucher.appliesTo === 'both' ? 'Thuê và mua' : voucher.appliesTo === 'sale' ? 'Đơn mua' : 'Đơn thuê'}</strong></p>
                                            <p>Đơn tối thiểu: <strong>{formatMoney(voucher.minOrderValue)}</strong></p>
                                            <p>Dùng: <strong>{voucher.effectiveUsageCount || 0}</strong>{voucher.usageLimitTotal ? ` / ${voucher.usageLimitTotal}` : ''}</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>
                                                    {voucher.startDate ? new Date(voucher.startDate).toLocaleString('vi-VN') : 'Ngay'}
                                                    {' - '}
                                                    {voucher.endDate ? new Date(voucher.endDate).toLocaleString('vi-VN') : 'Không giới hạn'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                                                onClick={() => startEdit(voucher._id)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Sửa
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                                                onClick={() => handleToggleStatus(voucher)}
                                            >
                                                <Power className="h-4 w-4" />
                                                {voucher.isActive ? 'Tắt voucher' : 'Bật voucher'}
                                            </button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                            Trang {pagination.page} / {Math.max(pagination.pages || 1, 1)}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                            >
                                Trang trước
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                disabled={pagination.page >= (pagination.pages || 1) || loading}
                                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Trang sau
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1975d2]"
            />
        </div>
    )
}

function TextArea({ label, value, onChange, placeholder = '' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1975d2]"
            />
        </div>
    )
}

function Select({ label, value, onChange, options = [] }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1975d2]"
            >
                {options.map((item) => (
                    <option key={item.value} value={item.value}>
                        {item.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

function SelectCompact({ value, onChange, options = [] }) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1975d2]"
        >
            {options.map((item) => (
                <option key={item.value} value={item.value}>
                    {item.label}
                </option>
            ))}
        </select>
    )
}
