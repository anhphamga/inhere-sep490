import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { deleteOwnerProductApi, getOwnerProductDetailApi, updateOwnerProductApi } from '../../services/owner.service'
import { numberFormatter, toArray } from '../../utils/owner.utils'

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE SIZE']

const uniq = (items = []) => {
    const seen = new Set()
    const out = []
    items.forEach((item) => {
        const text = String(item || '').trim()
        if (!text) return
        const key = text.toLowerCase()
        if (seen.has(key)) return
        seen.add(key)
        out.push(text)
    })
    return out
}

const parseMultiValues = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
    return String(value).split(/[,\n;/|]/g).map((item) => item.trim()).filter(Boolean)
}

const toCurrency = (value) => Number(value || 0).toLocaleString('vi-VN')

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
})

const buildVariantMatrix = (sizes = [], colors = [], seed = []) => {
    const seedMap = new Map((seed || []).map((item) => [`${item.size}::${item.color}`, item]))
    const rows = []
    sizes.forEach((size) => colors.forEach((color) => {
        const old = seedMap.get(`${size}::${color}`)
        rows.push({ size, color, rentPrice: old?.rentPrice ?? '', salePrice: old?.salePrice ?? '', quantity: old?.quantity ?? '' })
    }))
    return rows
}

const normalizeCategoryTree = (nodes = []) => {
    return (Array.isArray(nodes) ? nodes : [])
        .map((node) => ({
            name: String(node?.displayName || '').trim(),
            children: toArray(node?.children).map((child) => String(child?.displayName || '').trim()).filter(Boolean),
        }))
        .filter((item) => item.name)
}

const getCategorySelection = (tree, value, categoryPath = {}) => {
    const pathParent = String(categoryPath?.parent || '').trim()
    const pathChild = String(categoryPath?.child || '').trim()
    if (pathParent) return { parent: pathParent, child: pathChild }
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return { parent: '', child: '' }
    for (const node of tree) {
        if (node.name.toLowerCase() === normalized) return { parent: node.name, child: '' }
        const matched = node.children.find((child) => child.toLowerCase() === normalized)
        if (matched) return { parent: node.name, child: matched }
    }
    return { parent: String(value || '').trim(), child: '' }
}

export default function ProductDetail({ productId, onBack }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionError, setActionError] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [tab, setTab] = useState('basic')
    const [categoryTree, setCategoryTree] = useState([])
    const [detail, setDetail] = useState({ product: null, instances: [], totalQuantity: 0, availableQuantity: 0 })
    const [form, setForm] = useState({ name: '', quantity: '0', baseSalePrice: '', baseRentPrice: '', commonRentPrice: '', description: '', parentCategory: '', childCategory: '', pricingMode: 'common' })
    const [sizes, setSizes] = useState([])
    const [sizeDraft, setSizeDraft] = useState('')
    const [colors, setColors] = useState([])
    const [colorDraft, setColorDraft] = useState('')
    const [mainImageFiles, setMainImageFiles] = useState([])
    const [variantMatrix, setVariantMatrix] = useState([])

    const childOptions = useMemo(() => categoryTree.find((item) => item.name === form.parentCategory)?.children || [], [categoryTree, form.parentCategory])
    const selectedCategory = form.childCategory || form.parentCategory
    const previewImage = colors[0]?.images?.[0] || detail.product?.images?.[0] || mainImageFiles[0]?.preview || ''

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setDirty(true)
    }

    const bootstrapFromProduct = (product, tree = categoryTree) => {
        const sizesInit = uniq((product?.sizes?.length ? product.sizes : parseMultiValues(product?.size)).map((item) => String(item || '').trim().toUpperCase()))
        const colorVariants = Array.isArray(product?.colorVariants) && product.colorVariants.length > 0
            ? product.colorVariants.map((item) => ({ id: `${Date.now()}-${Math.random()}`, name: String(item?.name || '').trim(), images: uniq(toArray(item?.images).map((img) => String(img || '').trim())), urlDraft: '' })).filter((item) => item.name)
            : uniq(parseMultiValues(product?.color)).map((name) => ({ id: `${Date.now()}-${Math.random()}`, name, images: [], urlDraft: '' }))
        const categoryChoice = getCategorySelection(tree, product?.category, product?.categoryPath)
        setForm({
            name: String(product?.name || ''),
            quantity: '0',
            baseSalePrice: String(product?.baseSalePrice ?? ''),
            baseRentPrice: String(product?.baseRentPrice ?? ''),
            commonRentPrice: String(product?.commonRentPrice ?? product?.baseRentPrice ?? ''),
            description: String(product?.description || ''),
            parentCategory: categoryChoice.parent,
            childCategory: categoryChoice.child,
            pricingMode: product?.pricingMode === 'per_variant' ? 'per_variant' : 'common',
        })
        setSizes(sizesInit)
        setColors(colorVariants)
        setVariantMatrix(buildVariantMatrix(sizesInit, colorVariants.map((item) => item.name), toArray(product?.variantMatrix)))
        setMainImageFiles([])
        setDirty(false)
        setActionError('')
    }

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const response = await getOwnerProductDetailApi(productId)
            const data = response?.data || {}
            const product = data?.product || null
            setDetail({
                product,
                instances: toArray(data.instances),
                totalQuantity: Number(data.totalQuantity || 0),
                availableQuantity: Number(data.availableQuantity || 0),
            })
            if (product) bootstrapFromProduct(product)
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được sản phẩm.')
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
                const response = await fetch('/api/categories')
                const payload = response.ok ? await response.json() : { categories: [] }
                if (!mounted) return
                const tree = normalizeCategoryTree(payload?.categories)
                setCategoryTree(tree)
                if (detail.product) bootstrapFromProduct(detail.product, tree)
            } catch {
                if (mounted) setCategoryTree([])
            }
        }
        loadCategories()
        return () => { mounted = false }
    }, [detail.product])

    const updateSizes = (nextValues) => {
        const normalized = uniq(nextValues.map((item) => String(item || '').trim().toUpperCase())).filter(Boolean)
        setSizes(normalized)
        setVariantMatrix((prev) => buildVariantMatrix(normalized, colors.map((c) => c.name), prev))
        setDirty(true)
    }

    const addSize = () => {
        const value = String(sizeDraft || '').trim().toUpperCase()
        if (!value) return
        if (sizes.includes(value)) return setActionError('Size đã tồn tại.')
        updateSizes([...sizes, value])
        setSizeDraft('')
        setActionError('')
    }

    const addColor = () => {
        const name = String(colorDraft || '').trim()
        if (!name) return
        if (colors.some((item) => item.name.toLowerCase() === name.toLowerCase())) return setActionError('Màu đã tồn tại.')
        const next = [...colors, { id: `${Date.now()}-${Math.random()}`, name, images: [], urlDraft: '' }]
        setColors(next)
        setVariantMatrix((prev) => buildVariantMatrix(sizes, next.map((item) => item.name), prev))
        setColorDraft('')
        setDirty(true)
        setActionError('')
    }

    const updateColorUrlDraft = (name, value) => {
        setColors((prev) => prev.map((item) => (item.name === name ? { ...item, urlDraft: value } : item)))
        setDirty(true)
    }

    const addColorUrl = (name) => {
        setColors((prev) => prev.map((item) => {
            if (item.name !== name) return item
            const url = String(item.urlDraft || '').trim()
            if (!url || item.images.includes(url)) return { ...item, urlDraft: '' }
            return { ...item, images: [...item.images, url], urlDraft: '' }
        }))
        setDirty(true)
    }

    const addColorFiles = async (name, files) => {
        const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'))
        if (imageFiles.length === 0) return
        const urls = await Promise.all(imageFiles.map((file) => fileToDataUrl(file)))
        setColors((prev) => prev.map((item) => (item.name === name ? { ...item, images: uniq([...item.images, ...urls]) } : item)))
        setDirty(true)
    }

    const addMainFiles = (files) => {
        const prepared = Array.from(files || [])
            .filter((file) => file?.type?.startsWith('image/'))
            .map((file) => ({ id: `${Date.now()}-${Math.random()}`, file, preview: URL.createObjectURL(file) }))
        if (prepared.length === 0) return
        setMainImageFiles((prev) => [...prev, ...prepared])
        setDirty(true)
    }

    const validate = (isDraft) => {
        if (isDraft) return ''
        if (!form.name.trim()) return 'Tên sản phẩm là bắt buộc.'
        if (!selectedCategory) return 'Danh mục là bắt buộc.'
        if (sizes.length === 0) return 'Phải có ít nhất 1 size.'
        if (colors.length === 0) return 'Phải có ít nhất 1 màu.'
        if (colors.some((item) => item.images.length === 0)) return 'Mỗi màu cần ít nhất 1 ảnh.'
        if ((detail.product?.images || []).length === 0 && mainImageFiles.length === 0 && colors.every((item) => item.images.length === 0)) return 'Phải có ít nhất 1 ảnh chính.'
        if (Number(form.baseRentPrice || 0) < 0 || Number(form.baseSalePrice || 0) < 0) return 'Giá không được âm.'
        return ''
    }

    const save = async (isDraft) => {
        const invalidMessage = validate(isDraft)
        if (invalidMessage) return setActionError(invalidMessage)
        try {
            setSaving(true)
            setActionError('')
            const payload = {
                name: form.name.trim() || 'Draft product',
                category: selectedCategory || 'Draft',
                categoryParent: form.parentCategory,
                categoryChild: form.childCategory,
                size: sizes[0] || 'M',
                sizes,
                color: colors[0]?.name || 'Default',
                colorVariants: colors.map((item) => ({ name: item.name, images: item.images })),
                quantity: Number(form.quantity || 0),
                baseRentPrice: Number(form.baseRentPrice || 0),
                baseSalePrice: Number(form.baseSalePrice || 0),
                commonRentPrice: Number(form.commonRentPrice || form.baseRentPrice || 0),
                pricingMode: form.pricingMode,
                variantMatrix: form.pricingMode === 'per_variant'
                    ? variantMatrix.map((item) => ({ size: item.size, color: item.color, rentPrice: Number(item.rentPrice || 0), salePrice: Number(item.salePrice || 0), quantity: Number(item.quantity || 0) }))
                    : [],
                description: form.description.trim(),
                imageFiles: mainImageFiles.map((item) => item.file),
                isDraft,
            }
            await updateOwnerProductApi(productId, payload)
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
            await deleteOwnerProductApi(productId)
            onBack?.()
        } catch (apiError) {
            setActionError(apiError?.response?.data?.message || apiError?.message || 'Không thể xóa sản phẩm.')
        } finally {
            setDeleting(false)
        }
    }

    if (loading) return <div className="owner-card owner-loading">Đang tải chi tiết sản phẩm...</div>
    if (!detail.product) return <div className="owner-alert">{error || 'Không tìm thấy sản phẩm.'}</div>

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="sticky top-16 z-20 bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Tab active={tab === 'basic'} onClick={() => setTab('basic')}>Thông tin</Tab>
                    <Tab active={tab === 'variants'} onClick={() => setTab('variants')}>Biến thể</Tab>
                    <Tab active={tab === 'images'} onClick={() => setTab('images')}>Hình ảnh</Tab>
                </div>
                {dirty ? <p className="text-xs text-amber-600 font-medium">Bạn chưa lưu thay đổi</p> : <span />}
                <div className="flex items-center gap-2">
                    {onBack ? <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm inline-flex items-center gap-1" onClick={onBack}><ChevronLeft className="w-4 h-4" />Quay lại</button> : null}
                    <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm disabled:opacity-60" onClick={() => save(true)} disabled={saving}>Lưu nháp</button>
                    <button type="button" className="h-10 px-3 rounded-lg bg-[#1975d2] text-white text-sm font-semibold disabled:opacity-60" onClick={() => save(false)} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                    <button type="button" className="h-10 px-3 rounded-lg border border-rose-200 text-rose-600 text-sm disabled:opacity-60" onClick={handleDelete} disabled={deleting}>{deleting ? 'Đang xóa...' : 'Xóa'}</button>
                </div>
            </div>

            {error ? <div className="owner-alert">{error}</div> : null}
            {actionError ? <div className="owner-alert">{actionError}</div> : null}

            {tab === 'basic' ? (
                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-bold">Phần 1: Thông tin cơ bản</h4>
                        <Field label="Tên sản phẩm" value={form.name} onChange={(value) => setField('name', value)} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field type="number" label="Số lượng bổ sung" value={form.quantity} onChange={(value) => setField('quantity', value)} />
                            <Field type="number" label="Giá bán cơ bản" value={form.baseSalePrice} onChange={(value) => setField('baseSalePrice', value)} hint={form.baseSalePrice ? `${toCurrency(form.baseSalePrice)}đ` : ''} />
                            <Field type="number" label="Giá thuê cơ bản" value={form.baseRentPrice} onChange={(value) => setField('baseRentPrice', value)} hint={form.baseRentPrice ? `${toCurrency(form.baseRentPrice)}đ` : ''} />
                            <Field type="number" label="Giá thuê chung" value={form.commonRentPrice} onChange={(value) => setField('commonRentPrice', value)} hint={form.commonRentPrice ? `${toCurrency(form.commonRentPrice)}đ` : ''} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Select label="Danh mục cha" value={form.parentCategory} options={categoryTree.map((item) => item.name)} onChange={(value) => { setForm((prev) => ({ ...prev, parentCategory: value, childCategory: '' })); setDirty(true) }} placeholder="Chọn danh mục cha" />
                            <Select label="Danh mục con (nếu có)" value={form.childCategory} options={childOptions} onChange={(value) => setField('childCategory', value)} placeholder={childOptions.length > 0 ? 'Chọn danh mục con' : 'Danh mục cha không có thẻ con'} disabled={childOptions.length === 0} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Mô tả</label>
                            <textarea rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(event) => setField('description', event.target.value)} />
                        </div>
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                        <h4 className="text-sm font-bold">Preview sản phẩm</h4>
                        <div className="h-48 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">{previewImage ? <img src={previewImage} alt="preview" className="w-full h-full object-cover" /> : null}</div>
                        <p className="font-semibold">{form.name || 'Tên sản phẩm'}</p>
                        <p className="text-sm text-slate-500">{selectedCategory || 'Danh mục'}</p>
                        <p className="text-lg font-bold text-[#1975d2]">{toCurrency(form.baseRentPrice)}đ</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Stat label="Tổng tồn" value={numberFormatter.format(detail.totalQuantity)} />
                            <Stat label="Khả dụng" value={numberFormatter.format(detail.availableQuantity)} />
                        </div>
                    </section>
                </div>
            ) : null}

            {tab === 'variants' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-bold">Phần 2: Biến thể (Size - Màu)</h4>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Size (chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2">
                                {SIZE_PRESETS.map((size) => <button key={size} type="button" className={`h-8 px-3 rounded-full text-xs border ${sizes.includes(size) ? 'bg-[#1975d2] text-white border-[#1975d2]' : 'border-slate-200'}`} onClick={() => updateSizes(sizes.includes(size) ? sizes.filter((item) => item !== size) : [...sizes, size])}>{size}</button>)}
                            </div>
                            <div className="flex items-center gap-2">
                                <input className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm" placeholder="Thêm size mới" value={sizeDraft} onChange={(event) => setSizeDraft(event.target.value)} />
                                <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" onClick={addSize}>Thêm size mới</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Màu sắc</label>
                            <div className="flex items-center gap-2">
                                <input className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm" placeholder="Nhập tên màu" value={colorDraft} onChange={(event) => setColorDraft(event.target.value)} />
                                <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" onClick={addColor}>Thêm màu</button>
                            </div>
                            <div className="space-y-3">
                                {colors.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                                        <div className="flex items-center justify-between"><p className="text-sm font-semibold">{item.name} <span className="text-slate-500 font-normal">({item.images.length} ảnh)</span></p><button type="button" className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600" onClick={() => { const next = colors.filter((x) => x.name !== item.name); setColors(next); setVariantMatrix((prev) => buildVariantMatrix(sizes, next.map((x) => x.name), prev)); setDirty(true) }}>Xóa màu</button></div>
                                        <div className="flex flex-wrap gap-2">{item.images.map((img, idx) => <button key={`${item.id}-${idx}`} type="button" className="h-14 w-14 rounded border border-slate-200 overflow-hidden" onClick={() => { setColors((prev) => prev.map((x) => x.name === item.name ? { ...x, images: x.images.filter((m) => m !== img) } : x)); setDirty(true) }}><img src={img} alt={`${item.name}-${idx}`} className="w-full h-full object-cover" /></button>)}</div>
                                        <div className="flex gap-2">
                                            <input className="flex-1 h-9 border border-slate-200 rounded-lg px-3 text-xs" placeholder="Dán URL ảnh màu" value={item.urlDraft} onChange={(event) => updateColorUrlDraft(item.name, event.target.value)} />
                                            <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-xs" onClick={() => addColorUrl(item.name)}>Thêm URL</button>
                                        </div>
                                        <label className="inline-flex h-9 items-center px-3 rounded-lg border border-slate-200 text-xs cursor-pointer">Thêm ảnh từ máy<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addColorFiles(item.name, event.target.files)} /></label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                        <h4 className="text-sm font-bold">Phần 3: Bảng biến thể</h4>
                        <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={form.pricingMode === 'common'} onChange={() => setField('pricingMode', 'common')} />Giá thuê chung</label>
                            <label className="inline-flex items-center gap-2"><input type="radio" checked={form.pricingMode === 'per_variant'} onChange={() => setField('pricingMode', 'per_variant')} />Giá riêng theo biến thể</label>
                        </div>
                        {form.pricingMode === 'common' ? <Field type="number" label="Giá thuê chung" value={form.commonRentPrice} onChange={(value) => setField('commonRentPrice', value)} hint={form.commonRentPrice ? `${toCurrency(form.commonRentPrice)}đ` : ''} /> : (
                            <div className="rounded-lg border border-slate-200 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-3 py-2 text-left">Size</th><th className="px-3 py-2 text-left">Màu</th><th className="px-3 py-2 text-left">Giá thuê</th><th className="px-3 py-2 text-left">Giá bán</th><th className="px-3 py-2 text-left">SL</th></tr></thead>
                                    <tbody>{variantMatrix.length === 0 ? <tr><td className="px-3 py-3 text-slate-500" colSpan={5}>Hãy chọn size và màu để tạo bảng biến thể.</td></tr> : variantMatrix.map((row) => <tr key={`${row.size}-${row.color}`} className="border-b border-slate-100"><td className="px-3 py-2">{row.size}</td><td className="px-3 py-2">{row.color}</td><td className="px-3 py-2"><input type="number" className="h-8 w-24 border border-slate-200 rounded px-2" value={row.rentPrice} onChange={(event) => setVariantMatrix((prev) => prev.map((it) => it.size === row.size && it.color === row.color ? { ...it, rentPrice: event.target.value } : it))} /></td><td className="px-3 py-2"><input type="number" className="h-8 w-24 border border-slate-200 rounded px-2" value={row.salePrice} onChange={(event) => setVariantMatrix((prev) => prev.map((it) => it.size === row.size && it.color === row.color ? { ...it, salePrice: event.target.value } : it))} /></td><td className="px-3 py-2"><input type="number" className="h-8 w-20 border border-slate-200 rounded px-2" value={row.quantity} onChange={(event) => setVariantMatrix((prev) => prev.map((it) => it.size === row.size && it.color === row.color ? { ...it, quantity: event.target.value } : it))} /></td></tr>)}</tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            ) : null}

            {tab === 'images' ? (
                <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="text-sm font-bold">Ảnh chính (kéo thả)</h4>
                    <div className="h-36 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-sm text-slate-500" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addMainFiles(event.dataTransfer?.files) }}>Kéo thả ảnh vào đây</div>
                    <label className="inline-flex h-10 items-center px-4 rounded-lg border border-slate-200 text-sm cursor-pointer">Chọn ảnh từ máy<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addMainFiles(event.target.files)} /></label>
                    <div className="flex flex-wrap gap-2">{(detail.product?.images || []).map((img, idx) => <div key={`existing-${idx}`} className="h-20 w-20 rounded-lg border border-slate-200 overflow-hidden"><img src={img} alt={`existing-${idx}`} className="w-full h-full object-cover" /></div>)}</div>
                    <div className="flex flex-wrap gap-2">{mainImageFiles.map((item) => <button key={item.id} type="button" className="h-20 w-20 rounded-lg border border-slate-200 overflow-hidden" onClick={() => { setMainImageFiles((prev) => prev.filter((img) => img.id !== item.id)); setDirty(true) }}><img src={item.preview} alt={item.file?.name || 'image'} className="w-full h-full object-cover" /></button>)}</div>
                </section>
            ) : null}
        </div>
    )
}

function Tab({ active, onClick, children }) {
    return <button type="button" onClick={onClick} className={`h-9 px-3 rounded-lg text-sm ${active ? 'bg-[#1975d2] text-white' : 'bg-slate-100 text-slate-700'}`}>{children}</button>
}

function Field({ label, value, onChange, type = 'text', hint = '' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input type={type} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    )
}

function Select({ label, value, onChange, options = [], placeholder = 'Chọn', disabled = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <select className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white disabled:bg-slate-100" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
                <option value="">{placeholder}</option>
                {options.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div className="p-3 border border-slate-100 rounded-lg">
            <p className="text-[11px] text-slate-400 uppercase font-bold">{label}</p>
            <p className="text-base font-semibold text-slate-900">{value}</p>
        </div>
    )
}
