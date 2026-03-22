import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
    CalendarRange,
    CircleDollarSign,
    Eye,
    Filter,
    Info,
    Loader2,
    Pencil,
    Power,
    Search,
    ShieldCheck,
    Sparkles,
    TicketPercent,
    Users,
} from 'lucide-react'
import {
    createVoucherApi,
    getVoucherDetailApi,
    getVouchersApi,
    toggleVoucherStatusApi,
    updateVoucherApi,
} from '../../services/voucher.service'

const voucherFormSchema = z.object({
    code: z.string().trim().min(1, 'Ma voucher la bat buoc.'),
    name: z.string().trim().min(1, 'Ten voucher la bat buoc.'),
    description: z.string().trim().optional(),
    voucherType: z.enum(['percent', 'fixed']),
    value: z.string().trim().min(1, 'Gia tri giam la bat buoc.'),
    maxDiscount: z.string().trim().optional(),
    minOrderValue: z.string().trim().optional(),
    appliesTo: z.enum(['both', 'sale', 'rental']),
    firstOrderOnly: z.boolean(),
    usageLimitTotal: z.string().trim().optional(),
    usageLimitPerUser: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    isActive: z.boolean(),
}).superRefine((values, ctx) => {
    const discountValue = Number(values.value || 0)
    const maxDiscount = values.maxDiscount === '' ? null : Number(values.maxDiscount)
    const minOrderValue = values.minOrderValue === '' ? null : Number(values.minOrderValue)
    const usageLimitTotal = values.usageLimitTotal === '' ? null : Number(values.usageLimitTotal)
    const usageLimitPerUser = values.usageLimitPerUser === '' ? null : Number(values.usageLimitPerUser)
    const hasStart = Boolean(values.startDate)
    const hasEnd = Boolean(values.endDate)

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Gia tri giam phai lon hon 0.' })
    }
    if (values.voucherType === 'percent' && Number.isFinite(discountValue) && discountValue > 100) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Voucher phan tram khong duoc vuot qua 100.' })
    }
    if (values.voucherType === 'percent' && values.maxDiscount !== '') {
        if (!Number.isFinite(maxDiscount) || maxDiscount <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxDiscount'], message: 'Giam toi da phai lon hon 0.' })
        }
    }
    if (values.voucherType === 'fixed' && values.maxDiscount) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxDiscount'], message: 'Voucher tien co dinh khong can giam toi da.' })
    }
    if (values.minOrderValue !== '' && (!Number.isFinite(minOrderValue) || minOrderValue < 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minOrderValue'], message: 'Gia tri toi thieu phai lon hon hoac bang 0.' })
    }
    if (values.usageLimitTotal !== '' && (!Number.isFinite(usageLimitTotal) || !Number.isInteger(usageLimitTotal) || usageLimitTotal < 1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usageLimitTotal'], message: 'Tổng số lượt sử dụng phải là số nguyên từ 1 trở lên, hoặc để trống nếu không giới hạn.' })
    }
    if (values.usageLimitPerUser !== '' && (!Number.isFinite(usageLimitPerUser) || !Number.isInteger(usageLimitPerUser) || usageLimitPerUser < 1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usageLimitPerUser'], message: 'Giới hạn mỗi tài khoản phải là số nguyên từ 1 trở lên, hoặc để trống nếu không giới hạn.' })
    }
    if (hasStart && Number.isNaN(new Date(values.startDate).getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Ngay bat dau khong hop le.' })
    }
    if (hasEnd && Number.isNaN(new Date(values.endDate).getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Ngay ket thuc khong hop le.' })
    }
    if (hasStart && hasEnd) {
        const startDate = new Date(values.startDate)
        const endDate = new Date(values.endDate)
        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate < startDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Ngay ket thuc phai sau ngay bat dau.' })
        }
    }
})

const defaultValues = {
    code: '',
    name: '',
    description: '',
    voucherType: 'percent',
    value: '10',
    maxDiscount: '',
    minOrderValue: '',
    appliesTo: 'both',
    firstOrderOnly: false,
    usageLimitTotal: '',
    usageLimitPerUser: '',
    startDate: '',
    endDate: '',
    isActive: true,
}

const defaultFilters = {
    search: '',
    statusFilter: '',
    voucherType: '',
    appliesTo: '',
}

const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Sắp diễn ra' },
    { value: 'expired', label: 'Hết hạn' },
]

const voucherTypeOptions = [
    { value: '', label: 'Tất cả loại' },
    { value: 'percent', label: 'Phần trăm' },
    { value: 'fixed', label: 'Cố định' },
]

const appliesToOptions = [
    { value: '', label: 'Tất cả phạm vi' },
    { value: 'both', label: 'Thuê + Mua' },
    { value: 'sale', label: 'Đơn mua' },
    { value: 'rental', label: 'Đơn thuê' },
]

const formatMoney = (value = 0) => `${Number(value || 0).toLocaleString('vi-VN')}d`

const toInputDateTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (number) => String(number).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const mapVoucherToForm = (voucher) => ({
    code: voucher?.code || '',
    name: voucher?.name || '',
    description: voucher?.description || '',
    voucherType: voucher?.voucherType || 'percent',
    value: String(voucher?.value ?? ''),
    maxDiscount: voucher?.maxDiscount !== null && voucher?.maxDiscount !== undefined ? String(voucher.maxDiscount) : '',
    minOrderValue: voucher?.minOrderValue ? String(voucher.minOrderValue) : '',
    appliesTo: voucher?.appliesTo || 'both',
    firstOrderOnly: Boolean(voucher?.firstOrderOnly),
    usageLimitTotal: voucher?.usageLimitTotal !== null && voucher?.usageLimitTotal !== undefined ? String(voucher.usageLimitTotal) : '',
    usageLimitPerUser: voucher?.usageLimitPerUser !== null && voucher?.usageLimitPerUser !== undefined ? String(voucher.usageLimitPerUser) : '',
    startDate: toInputDateTime(voucher?.startDate),
    endDate: toInputDateTime(voucher?.endDate),
    isActive: voucher?.isActive !== false,
})

const getErrorMessage = (error, fallback) => {
    const details = error?.response?.data?.errors
    if (Array.isArray(details) && details.length > 0) {
        return details.map((item) => item?.message).filter(Boolean).join(' ')
    }
    return error?.response?.data?.message || error?.message || fallback
}

const getVoucherStatus = (voucher) => {
    const now = Date.now()
    const startTime = voucher?.startDate ? new Date(voucher.startDate).getTime() : null
    const endTime = voucher?.endDate ? new Date(voucher.endDate).getTime() : null
    if (!voucher?.isActive) return { label: 'DISABLED', tone: 'bg-slate-100 text-slate-600 ring-slate-200' }
    if (startTime && startTime > now) return { label: 'SCHEDULED', tone: 'bg-sky-50 text-sky-700 ring-sky-100' }
    if (endTime && endTime < now) return { label: 'EXPIRED', tone: 'bg-amber-50 text-amber-700 ring-amber-100' }
    return { label: 'ACTIVE', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' }
}

const getAppliesToLabel = (value) => {
    if (value === 'sale') return 'Đơn mua'
    if (value === 'rental') return 'Đơn thuê'
    return 'Thuê + Mua'
}

const formatVoucherValue = (voucher) => {
    if (voucher?.voucherType === 'percent') {
        const maxDiscount = voucher?.maxDiscount ? `, max ${formatMoney(voucher.maxDiscount)}` : ''
        return `Giảm ${voucher.value}%${maxDiscount ? maxDiscount.replace(', max', ', tối đa') : ''}`
    }
    return `Giảm ${formatMoney(voucher?.value)}`
}

const getUsageRatio = (voucher) => {
    const total = Number(voucher?.usageLimitTotal || 0)
    const used = Number(voucher?.effectiveUsageCount || 0)
    if (!total) return 0
    return Math.min((used / total) * 100, 100)
}

const getRemainingUsage = (voucher) => {
    const total = Number(voucher?.usageLimitTotal || 0)
    const used = Number(voucher?.effectiveUsageCount || 0)
    if (!total) return null
    return Math.max(total - used, 0)
}

const getUsageSummary = (voucher) => {
    const used = Number(voucher?.effectiveUsageCount || 0)
    const total = Number(voucher?.usageLimitTotal || 0)
    const remaining = getRemainingUsage(voucher)

    return {
        used,
        total: total > 0 ? total : null,
        remaining,
        perUserLimit: Number(voucher?.usageLimitPerUser || 0) > 0 ? Number(voucher.usageLimitPerUser) : null,
    }
}

const buildPayload = (values) => ({
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    description: values.description.trim(),
    voucherType: values.voucherType,
    value: Number(values.value || 0),
    maxDiscount: values.voucherType === 'percent' && values.maxDiscount !== '' ? Number(values.maxDiscount) : null,
    minOrderValue: values.minOrderValue !== '' ? Number(values.minOrderValue) : 0,
    appliesTo: values.appliesTo,
    appliesOn: 'subtotal',
    firstOrderOnly: Boolean(values.firstOrderOnly),
    usageLimitTotal: values.usageLimitTotal !== '' ? Number(values.usageLimitTotal) : null,
    usageLimitPerUser: values.usageLimitPerUser !== '' ? Number(values.usageLimitPerUser) : null,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    isActive: Boolean(values.isActive),
})

const calculatePreviewDiscount = ({ voucherType, value, maxDiscount, subtotal }) => {
    const normalizedSubtotal = Math.max(Number(subtotal || 0), 0)
    const discountValue = Number(value || 0)
    const normalizedMaxDiscount = Number(maxDiscount || 0)
    if (!Number.isFinite(discountValue) || discountValue <= 0 || normalizedSubtotal <= 0) return 0
    if (voucherType === 'percent') {
        const rawDiscount = (normalizedSubtotal * discountValue) / 100
        if (Number.isFinite(normalizedMaxDiscount) && normalizedMaxDiscount > 0) {
            return Math.floor(Math.min(rawDiscount, normalizedMaxDiscount))
        }
        return Math.floor(rawDiscount)
    }
    return Math.floor(Math.min(discountValue, normalizedSubtotal))
}


export default function PromotionsList() {
    const [listState, setListState] = useState({
        vouchers: [],
        pagination: { page: 1, limit: 9, total: 0, pages: 1 },
        loading: true,
        error: '',
        successMessage: '',
    })
    const [filters, setFilters] = useState(defaultFilters)
    const [debouncedSearch, setDebouncedSearch] = useState(defaultFilters.search)
    const [editingId, setEditingId] = useState('')
    const [loadingDetailId, setLoadingDetailId] = useState('')
    const [previewSubtotal, setPreviewSubtotal] = useState('1500000')
    const [toggleTarget, setToggleTarget] = useState(null)

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid, isSubmitting, isDirty },
    } = useForm({
        resolver: zodResolver(voucherFormSchema),
        defaultValues,
        mode: 'onChange',
    })
    const watchedValues = watch()

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(filters.search)
        }, 450)

        return () => window.clearTimeout(timer)
    }, [filters.search])

    const queryParams = useMemo(() => ({
        page: listState.pagination.page,
        limit: listState.pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: debouncedSearch || undefined,
        voucherType: filters.voucherType || undefined,
        appliesTo: filters.appliesTo || undefined,
        statusFilter: filters.statusFilter || undefined,
    }), [debouncedSearch, filters.appliesTo, filters.statusFilter, filters.voucherType, listState.pagination.limit, listState.pagination.page])

    const previewDiscount = useMemo(() => calculatePreviewDiscount({
        voucherType: watchedValues.voucherType,
        value: watchedValues.value,
        maxDiscount: watchedValues.maxDiscount,
        subtotal: previewSubtotal,
    }), [previewSubtotal, watchedValues.maxDiscount, watchedValues.value, watchedValues.voucherType])

    const previewFinalTotal = Math.max(Number(previewSubtotal || 0) - previewDiscount, 0)

    const loadVouchers = async () => {
        try {
            setListState((prev) => ({ ...prev, loading: true, error: '' }))
            const response = await getVouchersApi(queryParams)
            setListState((prev) => ({
                ...prev,
                vouchers: Array.isArray(response?.data) ? response.data : [],
                pagination: { ...prev.pagination, ...(response?.pagination || {}) },
                loading: false,
            }))
        } catch (error) {
            setListState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(error, 'Khong the tai danh sach voucher.'),
            }))
        }
    }

    useEffect(() => {
        loadVouchers()
    }, [queryParams])

    useEffect(() => {
        if (watchedValues.voucherType === 'fixed' && watchedValues.maxDiscount) {
            setValue('maxDiscount', '', { shouldValidate: true, shouldDirty: true })
        }
    }, [setValue, watchedValues.maxDiscount, watchedValues.voucherType])

    const handleResetForm = () => {
        setEditingId('')
        reset(defaultValues)
    }

    const handleEditVoucher = async (voucherId) => {
        try {
            setLoadingDetailId(voucherId)
            setListState((prev) => ({ ...prev, error: '', successMessage: '' }))
            const response = await getVoucherDetailApi(voucherId)
            if (response?.data) {
                setEditingId(response.data._id)
                reset(mapVoucherToForm(response.data), { keepDefaultValues: false })
            }
        } catch (error) {
            setListState((prev) => ({
                ...prev,
                error: getErrorMessage(error, 'Khong the tai chi tiet voucher.'),
            }))
        } finally {
            setLoadingDetailId('')
        }
    }

    const onSubmit = async (values) => {
        try {
            setListState((prev) => ({ ...prev, error: '', successMessage: '' }))
            const payload = buildPayload(values)
            if (editingId) {
                const response = await updateVoucherApi(editingId, payload)
                setListState((prev) => ({ ...prev, successMessage: response?.message || 'Cap nhat voucher thanh cong.' }))
            } else {
                const response = await createVoucherApi(payload)
                setListState((prev) => ({ ...prev, successMessage: response?.message || 'Tao voucher thanh cong.' }))
            }
            handleResetForm()
            await loadVouchers()
        } catch (error) {
            setListState((prev) => ({
                ...prev,
                error: getErrorMessage(error, 'Khong the luu voucher.'),
            }))
        }
    }

    const executeToggleStatus = async (voucher) => {
        try {
            setListState((prev) => ({ ...prev, error: '', successMessage: '' }))
            const response = await toggleVoucherStatusApi(voucher._id)
            setListState((prev) => ({
                ...prev,
                successMessage: response?.message || 'Cap nhat trang thai voucher thanh cong.',
            }))
            await loadVouchers()
        } catch (error) {
            setListState((prev) => ({
                ...prev,
                error: getErrorMessage(error, 'Khong the cap nhat trang thai voucher.'),
            }))
        } finally {
            setToggleTarget(null)
        }
    }

    const handleToggleClick = (voucher) => {
        if (voucher?.isActive) {
            setToggleTarget(voucher)
            return
        }
        executeToggleStatus(voucher)
    }

    return (
        <>
            <div className="space-y-6">
                <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-[#0f4ea8] via-[#1662c4] to-[#5ea6ff] p-6 text-white shadow-[0_18px_60px_rgba(20,84,171,0.22)]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Trung Tâm Voucher</p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Quản lý voucher theo phong cách SaaS</h1>
                            <p className="mt-3 text-sm leading-6 text-white/82">
                                Tạo, xem trước và theo dõi voucher trong một giao diện gọn gàng, rõ ràng và dễ mở rộng.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MetricCard icon={TicketPercent} label="Tổng voucher" value={listState.pagination.total || 0} />
                            <MetricCard icon={ShieldCheck} label="Đang kích hoạt" value={listState.vouchers.filter((voucher) => voucher.isActive).length} />
                            <MetricCard
                                icon={Users}
                                label="Lượt dùng đã ghi nhận"
                                value={listState.vouchers.reduce((total, voucher) => total + Number(voucher.effectiveUsageCount || 0), 0)}
                            />
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#1662c4]">Trình Tạo Voucher</p>
                                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{editingId ? 'Cập nhật voucher' : 'Tạo voucher mới'}</h2>
                                <p className="mt-2 text-sm text-slate-500">
                                    Form được chia thành từng nhóm logic, validate inline và preview theo thời gian thực.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                    onClick={handleResetForm}
                                >
                                    Form mới
                                </button>
                                <button
                                    type="submit"
                                    form="voucher-form"
                                    disabled={!isValid || isSubmitting}
                                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#1662c4] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4ea8] disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {isSubmitting ? (
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Đang lưu
                                        </span>
                                    ) : editingId ? 'Cập nhật voucher' : 'Tạo voucher'}
                                </button>
                            </div>
                        </div>

                        {(listState.error || listState.successMessage) ? (
                            <div className="mt-5 space-y-3">
                                {listState.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{listState.error}</div> : null}
                                {listState.successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{listState.successMessage}</div> : null}
                            </div>
                        ) : null}

                        <form id="voucher-form" className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                            <FormSection title="1. Thông tin cơ bản" description="Định danh voucher và thông điệp sẽ hiển thị cho owner." icon={Sparkles}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField label="Mã voucher" tooltip="Mã sẽ tự động viết hoa để đồng nhất khi tạo và validate." error={errors.code?.message}>
                                        <input
                                            {...register('code')}
                                            value={watchedValues.code}
                                            onChange={(event) => setValue('code', event.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true })}
                                            placeholder="WELCOME10"
                                            className={inputClassName(Boolean(errors.code))}
                                        />
                                    </FormField>
                                    <FormField label="Tên voucher" tooltip="Tên gợi ý ngắn gọn để owner và nhân viên dễ nhận diện." error={errors.name?.message}>
                                        <input {...register('name')} placeholder="Chào mừng thành viên mới" className={inputClassName(Boolean(errors.name))} />
                                    </FormField>
                                </div>
                                <FormField label="Mô tả" tooltip="Mô tả ngắn để giải thích mục đích hoặc chiến dịch của voucher." error={errors.description?.message}>
                                    <textarea
                                        {...register('description')}
                                        rows={4}
                                        placeholder="Voucher dành cho người dùng mới, áp dụng cho đơn đầu tiên."
                                        className={`${inputClassName(Boolean(errors.description))} min-h-[120px] py-3`}
                                    />
                                </FormField>
                            </FormSection>

                            <FormSection title="2. Cấu hình giảm giá" description="Chọn cách giảm và điều khiển logic tính giá." icon={CircleDollarSign}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField label="Loại giảm" tooltip="Percent sẽ giảm theo phần trăm, Fixed sẽ giảm tiền cố định." error={errors.voucherType?.message}>
                                        <select {...register('voucherType')} className={inputClassName(Boolean(errors.voucherType))}>
                                            <option value="percent">PHẦN TRĂM</option>
                                            <option value="fixed">TIỀN CỐ ĐỊNH</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Giá trị giảm" tooltip="Giá trị giảm chính. Ví dụ 10 là 10% hoặc 10.000đ tùy theo loại." error={errors.value?.message}>
                                        <input {...register('value')} type="number" min="0" placeholder={watchedValues.voucherType === 'percent' ? '10' : '100000'} className={inputClassName(Boolean(errors.value))} />
                                    </FormField>
                                </div>

                                {watchedValues.voucherType === 'percent' ? (
                                    <FormField label="Giảm tối đa" tooltip="Trần giảm tối đa cho voucher phần trăm để tránh giảm quá nhiều." error={errors.maxDiscount?.message}>
                                        <input {...register('maxDiscount')} type="number" min="0" placeholder="200000" className={inputClassName(Boolean(errors.maxDiscount))} />
                                    </FormField>
                                ) : null}
                            </FormSection>

                            <FormSection title="3. Điều kiện áp dụng" description="Kiểm soát voucher được dùng cho ai và cho loại đơn nào." icon={ShieldCheck}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField label="Giá trị đơn tối thiểu" tooltip="Nếu để trống, hệ thống sẽ xem như không có ngưỡng tối thiểu." error={errors.minOrderValue?.message}>
                                        <input {...register('minOrderValue')} type="number" min="0" placeholder="500000" className={inputClassName(Boolean(errors.minOrderValue))} />
                                    </FormField>
                                    <FormField label="Áp dụng cho" tooltip="Chọn rent, sale hoặc áp dụng cho cả hai luồng đơn hàng." error={errors.appliesTo?.message}>
                                        <select {...register('appliesTo')} className={inputClassName(Boolean(errors.appliesTo))}>
                                            <option value="both">CẢ HAI</option>
                                            <option value="sale">ĐƠN MUA</option>
                                            <option value="rental">ĐƠN THUÊ</option>
                                        </select>
                                    </FormField>
                                </div>
                                <ToggleField
                                    label="Chỉ áp dụng cho đơn đầu tiên"
                                    tooltip="Bật lên nếu voucher chỉ được dùng khi khách chưa có đơn hợp lệ nào trước đó."
                                    checked={Boolean(watchedValues.firstOrderOnly)}
                                    error={errors.firstOrderOnly?.message}
                                    onChange={(nextValue) => setValue('firstOrderOnly', nextValue, { shouldValidate: true, shouldDirty: true })}
                                />
                            </FormSection>

                            <FormSection title="4. Giới hạn sử dụng" description="Đặt quota tổng và giới hạn mỗi người dùng nếu cần." icon={Users}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField label="Tổng số lượt sử dụng" tooltip="Tổng số lượt voucher được phép sử dụng trong toàn hệ thống. Để trống nếu không giới hạn." error={errors.usageLimitTotal?.message}>
                                        <input {...register('usageLimitTotal')} type="number" min="1" step="1" placeholder="100" className={inputClassName(Boolean(errors.usageLimitTotal))} />
                                    </FormField>
                                    <FormField label="Giới hạn mỗi tài khoản" tooltip="Mỗi tài khoản được dùng tối đa bao nhiêu lần. Để trống nếu không giới hạn." error={errors.usageLimitPerUser?.message}>
                                        <input {...register('usageLimitPerUser')} type="number" min="1" step="1" placeholder="1" className={inputClassName(Boolean(errors.usageLimitPerUser))} />
                                    </FormField>
                                </div>
                            </FormSection>

                            <FormSection title="5. Thời gian" description="Kích hoạt theo lịch và tắt khi voucher hết hạn." icon={CalendarRange}>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField label="Ngày bắt đầu" tooltip="Ngày bắt đầu cho phép áp dụng voucher." error={errors.startDate?.message}>
                                        <input {...register('startDate')} type="datetime-local" className={inputClassName(Boolean(errors.startDate))} />
                                    </FormField>
                                    <FormField label="Ngày kết thúc" tooltip="Ngày voucher hết hiệu lực. Có thể để trống nếu không giới hạn." error={errors.endDate?.message}>
                                        <input {...register('endDate')} type="datetime-local" className={inputClassName(Boolean(errors.endDate))} />
                                    </FormField>
                                </div>
                                <ToggleField
                                    label="Kích hoạt ngay sau khi lưu"
                                    tooltip="Tắt nếu muốn giữ voucher ở trạng thái disabled để kiểm tra sau."
                                    checked={Boolean(watchedValues.isActive)}
                                    error={errors.isActive?.message}
                                    onChange={(nextValue) => setValue('isActive', nextValue, { shouldValidate: true, shouldDirty: true })}
                                />
                            </FormSection>

                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Trạng thái form</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {isValid ? 'Form hợp lệ và sẵn sàng lưu.' : 'Hoàn thiện các trường còn lỗi để tiếp tục.'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {editingId ? <span className="inline-flex items-center rounded-full bg-[#1662c4]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#1662c4]">Đang sửa</span> : null}
                                    {isDirty ? <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Chưa lưu thay đổi</span> : null}
                                </div>
                            </div>
                        </form>
                    </section>

                    <aside className="space-y-6">
                        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#1662c4]">Xem Trước Thời Gian Thực</p>
                                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Xem trước thẻ voucher</h2>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Thử nhập một giá trị đơn hàng giả lập để xem số tiền giảm ngay lập tức.
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-[#1662c4]/10 p-3 text-[#1662c4]">
                                    <Eye className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="text-sm font-medium text-slate-700">Giá trị đơn hàng giả lập</label>
                                <input type="number" min="0" value={previewSubtotal} onChange={(event) => setPreviewSubtotal(event.target.value)} className={`${inputClassName(false)} mt-2`} />
                            </div>

                            <div className="mt-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-[#0f4ea8] to-[#56a2ff] p-5 text-white shadow-[0_18px_40px_rgba(15,78,168,0.22)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.28em] text-white/65">Xem Trước Voucher</p>
                                        <h3 className="mt-3 text-3xl font-semibold">{watchedValues.code || 'NEWCODE'}</h3>
                                        <p className="mt-2 text-sm text-white/78">{watchedValues.name || 'Tên voucher sẽ hiện ở đây'}</p>
                                    </div>
                                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                                        {watchedValues.voucherType === 'percent' ? 'PERCENT' : 'FIXED'}
                                    </span>
                                </div>

                                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-white/60">Mức Giảm</p>
                                        <p className="mt-2 text-2xl font-semibold">{formatMoney(previewDiscount)}</p>
                                        <p className="mt-1 text-sm text-white/70">{formatVoucherValue(watchedValues)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/12 bg-white/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-white/60">Tổng Sau Giảm</p>
                                        <p className="mt-2 text-2xl font-semibold">{formatMoney(previewFinalTotal)}</p>
                                        <p className="mt-1 text-sm text-white/70">Đơn tối thiểu: {formatMoney(watchedValues.minOrderValue || 0)}</p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
                                    <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2">{getAppliesToLabel(watchedValues.appliesTo)}</span>
                                    {watchedValues.firstOrderOnly ? <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2">Chỉ đơn đầu tiên</span> : null}
                                    <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2">{watchedValues.isActive ? 'Sẵn sàng xuất bản' : 'Đã tắt'}</span>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#1662c4]">Thư Viện Voucher</p>
                                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Danh sách voucher</h2>
                                    <p className="mt-2 text-sm text-slate-500">Tìm kiếm nhanh, lọc thông minh và thao tác bằng card layout.</p>
                                </div>
                                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right">
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hiển thị</p>
                                    <p className="text-sm font-semibold text-slate-900">{listState.pagination.total || 0}</p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={filters.search}
                                        onChange={(event) => {
                                            const nextSearch = event.target.value
                                            setFilters((prev) => ({ ...prev, search: nextSearch }))
                                            setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }))
                                        }}
                                        placeholder="Tìm theo mã hoặc tên voucher"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#1662c4] focus:bg-white"
                                    />
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <CompactSelect
                                        icon={Filter}
                                        value={filters.statusFilter}
                                        onChange={(value) => {
                                            setFilters((prev) => ({ ...prev, statusFilter: value }))
                                            setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }))
                                        }}
                                        options={statusOptions}
                                    />
                                    <CompactSelect
                                        icon={TicketPercent}
                                        value={filters.voucherType}
                                        onChange={(value) => {
                                            setFilters((prev) => ({ ...prev, voucherType: value }))
                                            setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }))
                                        }}
                                        options={voucherTypeOptions}
                                    />
                                    <CompactSelect
                                        icon={ShieldCheck}
                                        value={filters.appliesTo}
                                        onChange={(value) => {
                                            setFilters((prev) => ({ ...prev, appliesTo: value }))
                                            setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: 1 } }))
                                        }}
                                        options={appliesToOptions}
                                    />
                                </div>
                            </div>

                            <div className="mt-5">
                                {listState.loading ? (
                                    <div className="flex items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-16 text-sm text-slate-500">
                                        <span className="inline-flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Đang tải voucher...
                                        </span>
                                    </div>
                                ) : null}

                                {!listState.loading && listState.vouchers.length === 0 ? (
                                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-16 text-center">
                                        <TicketPercent className="mx-auto h-10 w-10 text-slate-400" />
                                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Chưa có voucher phù hợp</h3>
                                        <p className="mt-2 text-sm text-slate-500">Thử đổi bộ lọc hoặc tạo voucher mới để bắt đầu.</p>
                                    </div>
                                ) : null}

                                {!listState.loading && listState.vouchers.length > 0 ? (
                                    <div className="grid gap-4">
                                        {listState.vouchers.map((voucher) => (
                                            <VoucherCard
                                                key={voucher._id}
                                                voucher={voucher}
                                                loadingDetailId={loadingDetailId}
                                                onEdit={() => handleEditVoucher(voucher._id)}
                                                onToggle={() => handleToggleClick(voucher)}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                                <p className="text-sm text-slate-500">Trang {listState.pagination.page} / {Math.max(listState.pagination.pages || 1, 1)}</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                                        disabled={listState.pagination.page <= 1 || listState.loading}
                                        onClick={() => setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: Math.max(prev.pagination.page - 1, 1) } }))}
                                    >
                                        Trước
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                                        disabled={listState.pagination.page >= (listState.pagination.pages || 1) || listState.loading}
                                        onClick={() => setListState((prev) => ({ ...prev, pagination: { ...prev.pagination, page: prev.pagination.page + 1 } }))}
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            {toggleTarget ? (
                <ConfirmationModal
                    title="Tắt voucher này?"
                    description={`Voucher ${toggleTarget.code} sẽ không còn hiển thị để áp dụng cho đến khi được bật lại.`}
                    confirmLabel="Tắt voucher"
                    onCancel={() => setToggleTarget(null)}
                    onConfirm={() => executeToggleStatus(toggleTarget)}
                />
            ) : null}
        </>
    )
}

function MetricCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-[24px] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">{label}</p>
                <Icon className="h-4 w-4 text-white/70" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
        </div>
    )
}

function StatsTile({ label, value, helper }) {
    return (
        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
    )
}

function FormSection({ title, description, icon: Icon, children }) {
    return (
        <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white p-3 text-[#1662c4] shadow-sm">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
            </div>
            <div className="mt-5 space-y-4">{children}</div>
        </section>
    )
}

function FormField({ label, tooltip, error, children }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span>{label}</span>
                {tooltip ? <TooltipBadge content={tooltip} /> : null}
            </label>
            {children}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
    )
}

function ToggleField({ label, tooltip, checked, onChange, error }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span>{label}</span>
                        {tooltip ? <TooltipBadge content={tooltip} /> : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(!checked)}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-[#1662c4]' : 'bg-slate-300'}`}
                    aria-pressed={checked}
                >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-6' : 'left-1'}`} />
                </button>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
    )
}

function TooltipBadge({ content }) {
    return (
        <span title={content} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Info className="h-3.5 w-3.5" />
        </span>
    )
}

function CompactSelect({ icon: Icon, value, onChange, options }) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-[#1662c4] focus:bg-white"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

function VoucherCard({ voucher, loadingDetailId, onEdit, onToggle }) {
    const status = getVoucherStatus(voucher)
    const usageRatio = getUsageRatio(voucher)
    const usageSummary = getUsageSummary(voucher)

    return (
        <article className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1662c4]">Mã voucher</p>
                    <h3 className="mt-2 truncate text-2xl font-semibold text-slate-900">{voucher.code}</h3>
                    <p className="mt-1 text-sm text-slate-500">{voucher.name || 'Voucher chưa có tên'}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.tone}`}>
                    {status.label}
                </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                    <p className="text-xl font-semibold text-slate-900">{formatVoucherValue(voucher)}</p>
                    <p className="mt-2 text-sm text-slate-500">{voucher.description || 'Chưa có mô tả thêm cho voucher này.'}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    {getAppliesToLabel(voucher.appliesTo)}
                </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tiến độ sử dụng</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-[#1662c4] to-[#60a5fa]" style={{ width: `${usageRatio}%` }} />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                        {voucher.effectiveUsageCount || 0}
                        {voucher.usageLimitTotal ? ` / ${voucher.usageLimitTotal}` : ' lượt dùng'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {usageSummary.remaining !== null ? `Còn lại ${usageSummary.remaining} lượt` : 'Không giới hạn tổng lượt'}
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Thời gian</p>
                    <p className="mt-3 text-sm font-medium text-slate-700">{voucher.startDate ? new Date(voucher.startDate).toLocaleString('vi-VN') : 'Ngay bây giờ'}</p>
                    <p className="mt-1 text-sm text-slate-500">{voucher.endDate ? new Date(voucher.endDate).toLocaleString('vi-VN') : 'Không có ngày kết thúc'}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatsTile label="Đã dùng" value={`${usageSummary.used}`} helper="Lượt đã ghi nhận" />
                <StatsTile
                    label="Còn lại"
                    value={usageSummary.remaining !== null ? `${usageSummary.remaining}` : '∞'}
                    helper={usageSummary.remaining !== null ? 'Lượt còn có thể dùng' : 'Không giới hạn tổng'}
                />
                <StatsTile
                    label="Mỗi tài khoản"
                    value={usageSummary.perUserLimit !== null ? `${usageSummary.perUserLimit}` : '∞'}
                    helper={usageSummary.perUserLimit !== null ? 'Tối đa số lần dùng' : 'Không giới hạn'}
                />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#1662c4] hover:text-[#1662c4]"
                >
                    {loadingDetailId === voucher._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                    Sửa
                </button>
                <button
                    type="button"
                    onClick={onToggle}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#1662c4] hover:text-[#1662c4]"
                >
                    <Power className="h-4 w-4" />
                    {voucher.isActive ? 'Tắt' : 'Bật'}
                </button>
            </div>
        </article>
    )
}

function ConfirmationModal({ title, description, confirmLabel, onCancel, onConfirm }) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.2)]">
                <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                        <Power className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

function inputClassName(hasError) {
    return `h-12 w-full rounded-2xl border px-4 text-sm outline-none transition focus:bg-white ${hasError ? 'border-rose-300 bg-rose-50 focus:border-rose-400' : 'border-slate-200 bg-white focus:border-[#1662c4]'}`
}
