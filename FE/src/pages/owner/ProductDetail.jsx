import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { getOwnerProductDetailApi, updateOwnerProductApi } from '../../services/owner.service'
import { currencyFormatter, numberFormatter, toArray } from './owner.utils'

const lifecycleColor = {
    Available: 'bg-green-500',
    RentedOut: 'bg-blue-500',
    Sold: 'bg-purple-500',
    InMaintenance: 'bg-amber-500',
    Retired: 'bg-slate-500'
}

const conditionColor = {
    New: 'bg-green-500',
    Good: 'bg-blue-500',
    Worn: 'bg-amber-500',
    Damaged: 'bg-red-500'
}

export default function ProductDetail({ productId }) {
    const [detail, setDetail] = useState({ product: null, instances: [], totalQuantity: 0, availableQuantity: 0 })
    const [selectedImage, setSelectedImage] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [actionError, setActionError] = useState('')
    const [editForm, setEditForm] = useState({
        name: '',
        category: '',
        size: '',
        color: '',
        quantity: '0',
        baseRentPrice: '',
        baseSalePrice: '',
        depositAmount: '',
        buyoutValue: '',
        description: '',
        imageFiles: []
    })

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const response = await getOwnerProductDetailApi(productId)
            const data = response?.data || {}
            setDetail({
                product: data.product || null,
                instances: toArray(data.instances),
                totalQuantity: Number(data.totalQuantity || 0),
                availableQuantity: Number(data.availableQuantity || 0)
            })
            setSelectedImage(Array.isArray(data?.product?.images) ? (data.product.images[0] || '') : '')

            if (data.product) {
                setEditForm({
                    name: data.product.name || '',
                    category: data.product.category || '',
                    size: data.product.size || '',
                    color: data.product.color || '',
                    quantity: '0',
                    baseRentPrice: String(data.product.baseRentPrice ?? ''),
                    baseSalePrice: String(data.product.baseSalePrice ?? ''),
                    depositAmount: String(data.product.depositAmount ?? 0),
                    buyoutValue: String(data.product.buyoutValue ?? 0),
                    description: data.product.description || '',
                    imageFiles: []
                })
            }
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được chi tiết sản phẩm')
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => {
        loadDetail()
    }, [loadDetail])

    const lifecycleRows = useMemo(() => {
        const map = {}
        detail.instances.forEach((item) => {
            const key = item.lifecycleStatus || 'Unknown'
            map[key] = (map[key] || 0) + 1
        })
        return Object.entries(map).sort((a, b) => b[1] - a[1])
    }, [detail.instances])

    const conditionRows = useMemo(() => {
        const map = {}
        detail.instances.forEach((item) => {
            const key = item.conditionLevel || 'Unknown'
            map[key] = (map[key] || 0) + 1
        })
        return Object.entries(map).sort((a, b) => b[1] - a[1])
    }, [detail.instances])

    const handleUpdateProduct = async (event) => {
        event.preventDefault()

        const payload = {
            name: editForm.name.trim(),
            category: editForm.category.trim(),
            size: editForm.size.trim(),
            color: editForm.color.trim(),
            quantity: editForm.quantity === '' ? 0 : Number(editForm.quantity),
            description: editForm.description.trim(),
            baseRentPrice: Number(editForm.baseRentPrice),
            baseSalePrice: Number(editForm.baseSalePrice),
            depositAmount: Number(editForm.depositAmount),
            buyoutValue: Number(editForm.buyoutValue),
            imageFiles: editForm.imageFiles
        }

        if (!payload.name || !payload.category || !payload.size || !payload.color) {
            setActionError('Vui lòng nhập đủ name, category, size, color')
            return
        }

        if (
            !Number.isInteger(payload.quantity)
            || payload.quantity < 0
            || Number.isNaN(payload.baseRentPrice)
            || Number.isNaN(payload.baseSalePrice)
            || Number.isNaN(payload.depositAmount)
            || Number.isNaN(payload.buyoutValue)
        ) {
            setActionError('Số lượng bổ sung phải là số nguyên không âm, các trường giá cần là số hợp lệ')
            return
        }

        try {
            setUpdating(true)
            setActionError('')
            await updateOwnerProductApi(productId, payload)
            await loadDetail()
            setEditing(false)
        } catch (apiError) {
            setActionError(apiError?.response?.data?.message || apiError?.message || 'Không cập nhật được sản phẩm')
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải chi tiết sản phẩm...</div>
    }

    if (!detail.product) {
        return <div className="owner-alert">{error || 'Không tìm thấy sản phẩm.'}</div>
    }

    const product = detail.product
    const mainImage = selectedImage || product.images?.[0] || 'https://picsum.photos/seed/product-detail/600/800'

    return (
        <div className="max-w-6xl mx-auto">
            {error ? <div className="owner-alert mb-4">{error}</div> : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm p-2">
                        <img
                            src={mainImage}
                            alt={product.name || 'Product'}
                            className="w-full h-125 object-cover rounded-lg"
                        />
                    </div>

                    {product.images?.length > 1 ? (
                        <div className="grid grid-cols-4 gap-4">
                            {product.images.slice(0, 4).map((image, index) => (
                                <button
                                    type="button"
                                    className={`bg-white rounded-lg overflow-hidden border shadow-sm p-1 transition-all ${mainImage === image ? 'border-[#1975d2] ring-2 ring-[#1975d2]/20' : 'border-slate-200 hover:border-slate-300'}`}
                                    key={`${image}-${index}`}
                                    onClick={() => setSelectedImage(image)}
                                >
                                    <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-6 mb-8">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                                <div className="min-w-0 md:pr-6">
                                    <span className="text-xs font-bold text-[#1975d2] bg-[#1975d2]/10 px-3 py-1 rounded-full uppercase tracking-wider inline-block mb-2">
                                        {product.category || 'N/A'}
                                    </span>
                                    <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight wrap-break-word">{product.name || 'N/A'}</h2>
                                </div>

                                <div className="shrink-0">
                                    <button
                                        type="button"
                                        className="h-12 px-6 rounded-xl bg-[#1975d2] text-white text-lg font-semibold hover:bg-[#1975d2]/90 shadow-md"
                                        onClick={() => {
                                            setActionError('')
                                            setEditing((prev) => !prev)
                                        }}
                                    >
                                        {editing ? 'Cancel Edit' : 'Edit Product'}
                                    </button>
                                </div>
                            </div>

                            {actionError ? <div className="owner-alert">{actionError}</div> : null}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">Giá thuê cơ bản</p>
                                    <p className="text-2xl font-bold text-slate-900">{currencyFormatter.format(Number(product.baseRentPrice || 0))}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide mb-1">Giá bán cơ bản</p>
                                    <p className="text-2xl font-bold text-slate-900">{currencyFormatter.format(Number(product.baseSalePrice || 0))}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <StatCard label="Số lượng tổng" value={numberFormatter.format(detail.totalQuantity)} />
                            <StatCard label="Số lượng khả dụng" value={numberFormatter.format(detail.availableQuantity)} />
                            <StatCard label="Tiền cọc" value={currencyFormatter.format(Number(product.depositAmount || 0))} />
                            <StatCard label="Giá buyout" value={currencyFormatter.format(Number(product.buyoutValue || 0))} />
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-900">Phân bố trạng thái vòng đời</h4>
                            {lifecycleRows.map(([label, value]) => (
                                <DistributionBar
                                    key={`life-${label}`}
                                    label={label}
                                    value={value}
                                    total={detail.totalQuantity || 1}
                                    color={lifecycleColor[label] || 'bg-slate-400'}
                                />
                            ))}
                        </div>

                        <div className="space-y-3 mt-6">
                            <h4 className="text-sm font-bold text-slate-900">Phân bố chất lượng</h4>
                            {conditionRows.map(([label, value]) => (
                                <DistributionBar
                                    key={`cond-${label}`}
                                    label={label}
                                    value={value}
                                    total={detail.totalQuantity || 1}
                                    color={conditionColor[label] || 'bg-slate-400'}
                                />
                            ))}
                        </div>

                        {editing ? (
                            <form onSubmit={handleUpdateProduct} className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                                <h4 className="text-sm font-bold text-slate-900">Cập nhật sản phẩm</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Tên sản phẩm" value={editForm.name} onChange={(value) => setEditForm((prev) => ({ ...prev, name: value }))} />
                                    <Field label="Category" value={editForm.category} onChange={(value) => setEditForm((prev) => ({ ...prev, category: value }))} />
                                    <Field label="Size" value={editForm.size} onChange={(value) => setEditForm((prev) => ({ ...prev, size: value }))} />
                                    <Field label="Màu sắc" value={editForm.color} onChange={(value) => setEditForm((prev) => ({ ...prev, color: value }))} />
                                    <Field type="number" label="Số lượng bổ sung" value={editForm.quantity} onChange={(value) => setEditForm((prev) => ({ ...prev, quantity: value }))} />
                                    <Field type="number" label="Giá thuê" value={editForm.baseRentPrice} onChange={(value) => setEditForm((prev) => ({ ...prev, baseRentPrice: value }))} />
                                    <Field type="number" label="Giá bán" value={editForm.baseSalePrice} onChange={(value) => setEditForm((prev) => ({ ...prev, baseSalePrice: value }))} />
                                    <Field type="number" label="Tiền cọc" value={editForm.depositAmount} onChange={(value) => setEditForm((prev) => ({ ...prev, depositAmount: value }))} />
                                    <Field type="number" label="Buyout value" value={editForm.buyoutValue} onChange={(value) => setEditForm((prev) => ({ ...prev, buyoutValue: value }))} />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Ảnh mới (tuỳ chọn)</label>
                                    <input
                                        id="update-product-images"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(event) => {
                                            const files = Array.from(event.target.files || [])
                                            setEditForm((prev) => ({ ...prev, imageFiles: files }))
                                        }}
                                    />
                                    <label
                                        htmlFor="update-product-images"
                                        className="w-full h-11 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 cursor-pointer hover:border-[#1975d2]/50 hover:bg-slate-50 flex items-center justify-between gap-2"
                                    >
                                        <span className="inline-flex items-center gap-2 min-w-0">
                                            <ImagePlus className="w-4 h-4 text-[#1975d2] shrink-0" />
                                            <span className="truncate">{editForm.imageFiles.length > 0 ? `Đã chọn ${editForm.imageFiles.length} ảnh mới` : 'Chọn ảnh để thay thế ảnh hiện tại'}</span>
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 shrink-0">Tải lên</span>
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        Nếu chọn ảnh mới, hệ thống sẽ cập nhật ảnh sản phẩm theo file bạn tải lên.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Mô tả</label>
                                    <textarea
                                        rows={4}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                                        value={editForm.description}
                                        onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="h-10 px-4 rounded-lg bg-[#1975d2] text-white text-sm font-semibold hover:bg-[#1975d2]/90 disabled:opacity-60"
                                        disabled={updating}
                                    >
                                        {updating ? 'Đang lưu...' : 'Lưu cập nhật'}
                                    </button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Field({ label, value, onChange, type = 'text' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
                type={type}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/40"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    )
}

function StatCard({ label, value }) {
    return (
        <div className="p-4 border border-slate-100 rounded-lg">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-tight">{label}</p>
            <p className="text-lg font-semibold text-slate-900">{value}</p>
        </div>
    )
}

function DistributionBar({ label, value, total, color }) {
    const safeTotal = total > 0 ? total : 1
    const percentage = (value / safeTotal) * 100

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    {label}
                </span>
                <span className="font-bold">{value}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}
