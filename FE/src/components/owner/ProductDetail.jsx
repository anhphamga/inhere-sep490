import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
    deleteOwnerProductApi,
    deleteOwnerProductSizeGuideApi,
    getOwnerProductDetailApi,
    getOwnerProductSizeGuideApi,
    getProductInstancesApi,
    updateOwnerProductApi,
    upsertOwnerProductSizeGuideApi,
} from '../../services/owner.service'
import { findCategoryPathFromProduct, normalizeCategoryTree } from '../../utils/categoryTree'
import ProductForm from './product-form/ProductForm'

const toText = (value) => String(value ?? '').trim()

export default function ProductDetail({ productId, onBack, onSaved }) {
    const navigate = useNavigate()
    const location = useLocation()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const [actionError, setActionError] = useState('')
    const [categoryTree, setCategoryTree] = useState([])
    const [formSeed, setFormSeed] = useState(null)
    const [productDetail, setProductDetail] = useState(null)
    const [instances, setInstances] = useState([])

    const applyProductSizeGuide = useCallback(async (nextProductId, payload) => {
        const mode = String(payload?.sizeGuideMode || '').trim().toLowerCase()
        if (mode === 'product') {
            await upsertOwnerProductSizeGuideApi(nextProductId, {
                mode: 'product',
                rows: Array.isArray(payload?.sizeGuideRows) ? payload.sizeGuideRows : [],
            })
            return
        }

        await deleteOwnerProductSizeGuideApi(nextProductId)
    }, [])

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const [response, guideResponse] = await Promise.all([
                getOwnerProductDetailApi(productId),
                getOwnerProductSizeGuideApi(productId),
            ])

            const payload = response?.data || {}
            const guidePayload = guideResponse?.data || {}
            setProductDetail({ ...payload, ...guidePayload })
            
            // Lấy instances thực tế
            try {
                const instancesResponse = await getProductInstancesApi(productId)
                const raw = instancesResponse?.data ?? instancesResponse?.instances ?? []
                setInstances(Array.isArray(raw) ? raw : [])
            } catch (err) {
                console.warn('Không lấy được instances:', err)
                setInstances([])
            }
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải sản phẩm.')
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => {
        loadDetail()
    }, [loadDetail])

    useEffect(() => {
        let mounted = true
        const loadCategories = async () => {
            try {
                const response = await fetch('/api/categories?lang=vi')
                const payload = response.ok ? await response.json() : { categories: [] }
                if (!mounted) return
                setCategoryTree(normalizeCategoryTree(payload?.categories))
            } catch {
                if (mounted) setCategoryTree([])
            }
        }
        loadCategories()
        return () => { mounted = false }
    }, [])

    useEffect(() => {
        const product = productDetail?.product
        if (!product) return
        
        // Use COMPUTED sizes from API (from instances), NOT product.sizes
        const apiSizes = productDetail?.sizes || [];
        const hasSizes = apiSizes.length > 0
        const totalQuantity = productDetail?.totalQuantity || 0
        const availableQuantity = productDetail?.availableQuantity || 0
        const inv = productDetail?.inventory || {}
        const rentedOnly = Number(inv.rented || 0)
        // Form "rentedCount" = đang thuê (Rented); không gộp Reserved/Giặt vào "thuê"
        const rentedCount = Number.isFinite(rentedOnly) ? rentedOnly : Math.max(0, totalQuantity - availableQuantity)
        const sizeGuideMode = productDetail?.hasOverride ? 'product' : 'global'
        const sizeGuideRows = Array.isArray(productDetail?.productRows) ? productDetail.productRows : []

        setFormSeed({
            name: toText(product?.name),
            description: toText(product?.description),
            categoryPath: findCategoryPathFromProduct(categoryTree, product),
            color: toText(product?.color) || toText(product?.colorVariants?.[0]?.name) || 'Default',
            baseSalePrice: String(product?.baseSalePrice ?? ''),
            baseRentPrice: String(product?.baseRentPrice ?? ''),
            hasSizes,
            quantity: String(totalQuantity), // Total from instances, not product.quantity
            // Use API-computed sizes (from instances), not product.sizes
            sizes: hasSizes ? apiSizes : [{ size: 'ONE', quantity: 1 }],
            sizeGuideMode,
            sizeGuideRows,
            images: Array.isArray(product?.images) ? product.images.filter(Boolean).map(String) : [],
            rentedCount,
        })
    }, [categoryTree, productDetail])

    const handleSubmit = async ({ payload, isDraft }) => {
        try {
            setSaving(true)
            setActionError('')
            await updateOwnerProductApi(productId, payload)

            try {
                await applyProductSizeGuide(productId, payload)
            } catch {
                setActionError('Sản phẩm đã được cập nhật, nhưng đồng bộ bảng size thất bại. Vui lòng thử lưu lại phần bảng size.')
                if (isDraft) {
                    await loadDetail()
                }
                return
            }

            if (!isDraft) {
                const returnTo = location.state?.returnTo || '/owner/products'
                const returnPage = Math.max(1, Number(location.state?.page) || 1)
                if (typeof onSaved === 'function') {
                    onSaved()
                } else if (typeof onBack === 'function') {
                    onBack()
                } else {
                    navigate(returnTo, { state: { page: returnPage } })
                }
                return
            }

            await loadDetail()
        } catch (apiError) {
            setActionError(apiError?.response?.data?.message || apiError?.message || 'Không thể cập nhật sản phẩm.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        const confirmed = window.confirm('Bạn chắc chắn muốn xóa sản phẩm này?')
        if (!confirmed) return

        try {
            setDeleting(true)
            setActionError('')
            await deleteOwnerProductApi(productId)
            onBack?.()
        } catch (apiError) {
            setActionError(apiError?.response?.data?.message || apiError?.message || 'Không thể xóa sản phẩm.')
        } finally {
            setDeleting(false)
        }
    }

    if (loading) return <div className="owner-card owner-loading">Đang tải chi tiết sản phẩm...</div>
    if (!productDetail?.product) return <div className="owner-alert">{error || 'Không tìm thấy sản phẩm.'}</div>

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="sticky top-16 z-20 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900">Chi tiết sản phẩm</h3>
                <div className="flex items-center gap-2">
                    {onBack ? (
                        <button
                            type="button"
                            className="h-10 px-3 rounded-lg border border-slate-200 text-sm inline-flex items-center gap-1"
                            onClick={onBack}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Quay lại
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm disabled:opacity-60"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}

            {formSeed ? (
                <ProductForm
                    categoryTree={categoryTree}
                    initialValues={formSeed}
                    submitting={saving}
                    errorMessage={actionError}
                    onSubmit={handleSubmit}
                    allowDraft
                    submitLabel="Lưu"
                    draftLabel="Lưu nháp"
                    actualInstances={instances}

                />
            ) : null}
        </div>
    )
}
