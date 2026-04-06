import { useMemo, useState } from 'react'
import { createOwnerProductApi } from '../../services/owner.service'
import { getCategoryLevelOptions } from '../../utils/categoryTree'

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

export default function AddProductModal({ categoryTree = [], onClose, onCreated }) {
    const [tab, setTab] = useState('basic')
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [pricingMode, setPricingMode] = useState('common')
    const [form, setForm] = useState({ name: '', quantity: '1', baseSalePrice: '', baseRentPrice: '', commonRentPrice: '', description: '', categoryPath: [] })
    const [sizes, setSizes] = useState([])
    const [sizeDraft, setSizeDraft] = useState('')
    const [colors, setColors] = useState([])
    const [colorDraft, setColorDraft] = useState('')
    const [variantMatrix, setVariantMatrix] = useState([])
    const [activePreviewColor, setActivePreviewColor] = useState('')

    const selectedCategoryPath = useMemo(
        () => (Array.isArray(form.categoryPath) ? form.categoryPath : []),
        [form.categoryPath]
    )
    const selectedCategory = selectedCategoryPath[selectedCategoryPath.length - 1] || ''
    const categoryLevelOptions = useMemo(() => {
        const levels = []
        let level = 0
        while (level === 0 || level < selectedCategoryPath.length + 1) {
            const options = getCategoryLevelOptions(categoryTree, selectedCategoryPath, level)
            if (options.length === 0) break
            levels.push(options)
            level += 1
        }
        return levels
    }, [categoryTree, selectedCategoryPath])
    const previewColor = colors.find((item) => item.name === activePreviewColor) || colors[0]
    const previewImage = previewColor?.images?.[0] || ''

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setDirty(true)
    }

    const updateCategoryLevel = (level, value) => {
        setForm((prev) => {
            const currentPath = Array.isArray(prev.categoryPath) ? prev.categoryPath : []
            const nextPath = currentPath.slice(0, level)
            if (value) nextPath.push(value)
            return { ...prev, categoryPath: nextPath }
        })
        setDirty(true)
    }

    const updateSizes = (next) => {
        const normalized = uniq(next.map((item) => String(item || '').trim().toUpperCase()))
        setSizes(normalized)
        setVariantMatrix((prev) => buildVariantMatrix(normalized, colors.map((c) => c.name), prev))
        setDirty(true)
    }

    const addSize = () => {
        const value = String(sizeDraft || '').trim().toUpperCase()
        if (!value) return
        if (sizes.includes(value)) return setError('Size đã tồn tại.')
        updateSizes([...sizes, value])
        setSizeDraft('')
        setError('')
    }

    const addColor = () => {
        const name = String(colorDraft || '').trim()
        if (!name) return
        if (colors.some((item) => item.name.toLowerCase() === name.toLowerCase())) return setError('Màu đã tồn tại.')
        const next = [...colors, { id: `${Date.now()}-${Math.random()}`, name, images: [], urlDraft: '' }]
        setColors(next)
        setVariantMatrix((prev) => buildVariantMatrix(sizes, next.map((item) => item.name), prev))
        setActivePreviewColor(name)
        setColorDraft('')
        setDirty(true)
        setError('')
    }

    const updateColorUrlDraft = (name, value) => setColors((prev) => prev.map((item) => (item.name === name ? { ...item, urlDraft: value } : item)))

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

    const validate = (isDraft) => {
        if (isDraft) return ''
        if (!form.name.trim()) return 'Tên sản phẩm là bắt buộc.'
        if (!selectedCategory) return 'Danh mục là bắt buộc.'
        if (sizes.length === 0) return 'Phải có ít nhất 1 size.'
        if (colors.length === 0) return 'Phải có ít nhất 1 màu.'
        if (colors.some((item) => item.images.length === 0)) return 'Mỗi màu cần ít nhất 1 ảnh.'
        if (Number(form.baseRentPrice || 0) < 0 || Number(form.baseSalePrice || 0) < 0) return 'Giá không được âm.'
        return ''
    }

    const save = async (isDraft) => {
        try {
            const invalidMessage = validate(isDraft)
            if (invalidMessage) return setError(invalidMessage)
            setSaving(true)
            setError('')
            const payload = {
                name: form.name.trim() || 'Draft product',
                category: selectedCategory || 'Draft',
                categoryParent: selectedCategoryPath[0] || '',
                categoryChild: selectedCategoryPath.length > 1 ? selectedCategoryPath[selectedCategoryPath.length - 1] : '',
                categoryAncestors: selectedCategoryPath,
                size: sizes[0] || 'M',
                sizes,
                color: colors[0]?.name || 'Default',
                colorVariants: colors.map((item) => ({ name: item.name, images: item.images })),
                quantity: Number(form.quantity || 1),
                baseRentPrice: Number(form.baseRentPrice || 0),
                baseSalePrice: Number(form.baseSalePrice || 0),
                commonRentPrice: Number(form.baseRentPrice || 0),
                pricingMode: 'common',
                variantMatrix: [],
                description: form.description.trim(),
                isDraft,
            }
            const response = await createOwnerProductApi(payload)
            await onCreated?.(response?.data?._id || response?.data?.id)
            onClose?.()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không thỒ lưu sản phẩm.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }} onClick={(event) => event.stopPropagation()}>
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Tab active={tab === 'basic'} onClick={() => setTab('basic')}>Thông tin</Tab>
                        <Tab active={tab === 'variants'} onClick={() => setTab('variants')}>Biến thể</Tab>
                    </div>
                    {dirty ? <p className="text-xs text-amber-600 font-medium">Bạn chưa lưu thay đổi</p> : <span />}
                    <div className="flex items-center gap-2">
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-sm" onClick={onClose}>Quay lại</button>
                        <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-sm disabled:opacity-60" onClick={() => save(true)} disabled={saving}>Lưu nháp</button>
                        <button type="button" className="h-9 px-3 rounded-lg bg-[#1975d2] text-white text-sm font-semibold disabled:opacity-60" onClick={() => save(false)} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {tab === 'basic' ? (
                        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
                            <section className="rounded-xl border border-slate-200 p-4 space-y-4">
                                <h4 className="text-sm font-bold">Phần 1: Thông tin cơ bản</h4>
                                <Field label="Tên sản phẩm" value={form.name} onChange={(value) => updateField('name', value)} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field type="number" label="Số lượng" value={form.quantity} onChange={(value) => updateField('quantity', value)} />
                                    <Field type="number" label="Giá bán cơ bản" value={form.baseSalePrice} onChange={(value) => updateField('baseSalePrice', value)} hint={form.baseSalePrice ? `${toCurrency(form.baseSalePrice)}₫` : ''} />
                                    <Field
                                        type="number"
                                        label="Giá thuê cơ bản"
                                        value={form.baseRentPrice}
                                        onChange={(value) => {
                                            updateField('baseRentPrice', value)
                                            updateField('commonRentPrice', value)
                                        }}
                                        hint={form.baseRentPrice ? `${toCurrency(form.baseRentPrice)}₫` : ''}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {categoryLevelOptions.map((options, index) => (
                                        <Select
                                            key={`category-level-${index}`}
                                            label={`Danh mục cấp ${index + 1}`}
                                            value={selectedCategoryPath[index] || ''}
                                            options={options}
                                            onChange={(value) => updateCategoryLevel(index, value)}
                                            placeholder={`Chọn danh mục cấp ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Mô tả</label>
                                    <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
                                </div>
                            </section>
                            <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <h4 className="text-sm font-bold">Preview sản phẩm</h4>
                                <div className="h-48 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">{previewImage ? <img src={previewImage} alt="preview" className="w-full h-full object-contain" /> : null}</div>
                                <p className="font-semibold">{form.name || 'Tên sản phẩm'}</p>
                                <p className="text-sm text-slate-500">{selectedCategory || 'Danh mục'}</p>
                                <p className="text-lg font-bold text-[#1975d2]">{toCurrency(form.baseRentPrice)}₫</p>
                            </section>
                        </div>
                    ) : null}

                    {tab === 'variants' ? (
                        <div className="grid grid-cols-1 gap-5">
                            <section className="rounded-xl border border-slate-200 p-4 space-y-4">
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
                                                <div className="flex items-center justify-between"><p className="text-sm font-semibold">{item.name} <span className="text-slate-500 font-normal">({item.images.length} ảnh)</span></p><button type="button" className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600" onClick={() => { setColors((prev) => prev.filter((x) => x.name !== item.name)); setVariantMatrix((prev) => buildVariantMatrix(sizes, colors.filter((x) => x.name !== item.name).map((x) => x.name), prev)); setDirty(true) }}>Xóa màu</button></div>
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
                        </div>
                    ) : null}

                    {error ? <div className="owner-alert">{error}</div> : null}
                </div>
            </div>
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
                {options.map((item) => {
                    const optionValue = typeof item === 'object' && item !== null ? item.value : item
                    const optionLabel = typeof item === 'object' && item !== null ? item.label : item
                    return <option key={optionValue} value={optionValue}>{optionLabel}</option>
                })}
            </select>
        </div>
    )
}


