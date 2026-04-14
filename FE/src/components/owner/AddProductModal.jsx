import { useMemo, useState } from 'react'
import { createOwnerProductApi } from '../../services/owner.service'
import { getCategoryLevelOptions } from '../../utils/categoryTree'
import { createProductSchema } from '../../validations/product.schema'
import { mapZodErrors } from '../../utils/validation/validation.rules'

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

const toTrimmedText = (value) => String(value ?? '').trim()

const toCurrency = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0'
}

const parseNumberInput = (value, fallback = 0) => {
    const text = toTrimmedText(value)
    if (!text) return fallback
    const num = Number(text.replace(/,/g, ''))
    return Number.isFinite(num) ? num : Number.NaN
}

const isValidImageUrl = (value) => {
    const text = toTrimmedText(value)
    if (!text) return false
    if (text.startsWith('data:image/')) return true
    try {
        const parsed = new URL(text)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

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
    const [submitError, setSubmitError] = useState('')
    const [errors, setErrors] = useState({})
    const [form, setForm] = useState({ name: '', quantity: '1', baseSalePrice: '', baseRentPrice: '', commonRentPrice: '', description: '', categoryPath: [] })
    const [sizes, setSizes] = useState([])
    const [sizeDraft, setSizeDraft] = useState('')
    const [colors, setColors] = useState([])
    const [colorDraft, setColorDraft] = useState('')
    const [, setVariantMatrix] = useState([])
    const [activePreviewColor, setActivePreviewColor] = useState('')

    const selectedCategoryPath = useMemo(() => (Array.isArray(form.categoryPath) ? form.categoryPath : []), [form.categoryPath])
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

    const clearError = (field) => {
        setErrors((prev) => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const setFieldError = (field, message) => {
        setErrors((prev) => {
            if (!message) {
                if (!prev[field]) return prev
                const next = { ...prev }
                delete next[field]
                return next
            }
            if (prev[field] === message) return prev
            return { ...prev, [field]: message }
        })
    }

    const buildValidationResult = (isDraft, overrides = {}) => {
        const currentForm = overrides.form || form
        const currentSizes = overrides.sizes || sizes
        const currentColors = overrides.colors || colors

        const sanitizedForm = {
            ...currentForm,
            name: toTrimmedText(currentForm.name),
            quantity: toTrimmedText(currentForm.quantity),
            baseSalePrice: toTrimmedText(currentForm.baseSalePrice),
            baseRentPrice: toTrimmedText(currentForm.baseRentPrice),
            description: toTrimmedText(currentForm.description),
            categoryPath: Array.isArray(currentForm.categoryPath)
                ? currentForm.categoryPath.map((item) => toTrimmedText(item)).filter(Boolean)
                : [],
        }

        const normalizedSizes = uniq((currentSizes || []).map((item) => String(item || '').trim().toUpperCase()))
        const normalizedColors = (currentColors || []).map((item) => ({
            ...item,
            name: toTrimmedText(item?.name),
            images: uniq((item?.images || []).map((img) => toTrimmedText(img))),
            urlDraft: toTrimmedText(item?.urlDraft),
        }))

        const selectedCategoryValue = sanitizedForm.categoryPath[sanitizedForm.categoryPath.length - 1] || ''
        const quantityValue = parseNumberInput(sanitizedForm.quantity, 0)
        const baseSalePriceValue = parseNumberInput(sanitizedForm.baseSalePrice, 0)
        const baseRentPriceValue = parseNumberInput(sanitizedForm.baseRentPrice, 0)

        const parsed = createProductSchema({ isDraft }).safeParse({
            name: sanitizedForm.name,
            selectedCategory: selectedCategoryValue,
            quantity: quantityValue,
            baseSalePrice: baseSalePriceValue,
            baseRentPrice: baseRentPriceValue,
            description: sanitizedForm.description,
            sizes: normalizedSizes,
            colors: normalizedColors.map((item) => ({ name: item.name, images: item.images })),
        })

        const nextErrors = parsed.success ? {} : mapZodErrors(parsed.error)

        if (Number.isNaN(quantityValue)) nextErrors.quantity = nextErrors.quantity || 'Số lượng phải là số hợp lệ.'
        if (Number.isNaN(baseSalePriceValue)) nextErrors.baseSalePrice = nextErrors.baseSalePrice || 'Giá bán phải là số hợp lệ.'
        if (Number.isNaN(baseRentPriceValue)) nextErrors.baseRentPrice = nextErrors.baseRentPrice || 'Giá thuê phải là số hợp lệ.'

        normalizedColors.forEach((item, index) => {
            const colorUrlField = `colorUrl.${item.id}`
            const colorImagesField = `colorImages.${item.id}`

            if (item.urlDraft && !isValidImageUrl(item.urlDraft)) {
                nextErrors[colorUrlField] = nextErrors[colorUrlField] || 'URL ảnh không hợp lệ.'
            }

            if (item.images.some((image) => !isValidImageUrl(image))) {
                nextErrors[colorImagesField] = nextErrors[colorImagesField] || 'Danh sách ảnh chứa URL không hợp lệ.'
            }

            if (nextErrors[`colors.${index}.images`]) {
                nextErrors[colorImagesField] = nextErrors[colorImagesField] || nextErrors[`colors.${index}.images`]
                delete nextErrors[`colors.${index}.images`]
            }

            if (nextErrors[`colors.${index}.name`]) {
                nextErrors.colors = nextErrors.colors || nextErrors[`colors.${index}.name`]
                delete nextErrors[`colors.${index}.name`]
            }
        })

        if (nextErrors.selectedCategory) {
            nextErrors.categoryPath = nextErrors.selectedCategory
            delete nextErrors.selectedCategory
        }

        return {
            errors: nextErrors,
            sanitizedForm,
            normalizedSizes,
            normalizedColors,
            selectedCategoryValue,
            numbers: { quantityValue, baseSalePriceValue, baseRentPriceValue },
        }
    }

    const validateField = (field, options = {}) => {
        const { isDraft = false, overrides = {} } = options
        const { errors: nextErrors } = buildValidationResult(isDraft, overrides)
        setFieldError(field, nextErrors[field] || '')
    }

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        clearError(field)
        setDirty(true)
    }

    const updateCategoryLevel = (level, value) => {
        setForm((prev) => {
            const currentPath = Array.isArray(prev.categoryPath) ? prev.categoryPath : []
            const nextPath = currentPath.slice(0, level)
            if (value) nextPath.push(value)
            return { ...prev, categoryPath: nextPath }
        })
        clearError('categoryPath')
        setDirty(true)
    }

    const updateSizes = (next) => {
        const normalized = uniq(next.map((item) => String(item || '').trim().toUpperCase()))
        setSizes(normalized)
        setVariantMatrix((prev) => buildVariantMatrix(normalized, colors.map((c) => c.name), prev))
        clearError('sizes')
        clearError('sizeDraft')
        setDirty(true)
    }

    const addSize = () => {
        const value = String(sizeDraft || '').trim().toUpperCase()
        if (!value) return setFieldError('sizeDraft', 'Vui lòng nhập size.')
        if (sizes.includes(value)) return setFieldError('sizeDraft', 'Size đã tồn tại.')
        updateSizes([...sizes, value])
        setSizeDraft('')
        clearError('sizeDraft')
    }

    const addColor = () => {
        const name = String(colorDraft || '').trim()
        if (!name) return setFieldError('colorDraft', 'Vui lòng nhập tên màu.')
        if (colors.some((item) => item.name.toLowerCase() === name.toLowerCase())) return setFieldError('colorDraft', 'Màu đã tồn tại.')
        const next = [...colors, { id: `${Date.now()}-${Math.random()}`, name, images: [], urlDraft: '' }]
        setColors(next)
        setVariantMatrix((prev) => buildVariantMatrix(sizes, next.map((item) => item.name), prev))
        setActivePreviewColor(name)
        setColorDraft('')
        clearError('colors')
        clearError('colorDraft')
        setDirty(true)
    }

    const updateColorUrlDraft = (name, value) => {
        const target = colors.find((item) => item.name === name)
        if (target) clearError(`colorUrl.${target.id}`)
        setColors((prev) => prev.map((item) => (item.name === name ? { ...item, urlDraft: value } : item)))
    }

    const handleColorUrlBlur = (name) => {
        const target = colors.find((item) => item.name === name)
        if (!target) return
        const trimmed = toTrimmedText(target.urlDraft)
        setColors((prev) => prev.map((item) => (item.name === name ? { ...item, urlDraft: trimmed } : item)))
        if (!trimmed) return clearError(`colorUrl.${target.id}`)
        if (!isValidImageUrl(trimmed)) return setFieldError(`colorUrl.${target.id}`, 'URL ảnh không hợp lệ.')
        clearError(`colorUrl.${target.id}`)
    }

    const addColorUrl = (name) => {
        const target = colors.find((item) => item.name === name)
        if (!target) return
        const url = toTrimmedText(target.urlDraft)
        const urlErrorKey = `colorUrl.${target.id}`
        if (!url) {
            setColors((prev) => prev.map((item) => (item.name === name ? { ...item, urlDraft: '' } : item)))
            clearError(urlErrorKey)
            return
        }
        if (!isValidImageUrl(url)) return setFieldError(urlErrorKey, 'URL ảnh không hợp lệ.')

        setColors((prev) => prev.map((item) => {
            if (item.name !== name) return item
            if (!url || item.images.includes(url)) return { ...item, urlDraft: '' }
            return { ...item, images: [...item.images, url], urlDraft: '' }
        }))
        clearError(urlErrorKey)
        clearError(`colorImages.${target.id}`)
        clearError('colors')
        setDirty(true)
    }

    const addColorFiles = async (name, files) => {
        const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'))
        if (imageFiles.length === 0) return
        const urls = await Promise.all(imageFiles.map((file) => fileToDataUrl(file)))
        setColors((prev) => prev.map((item) => (item.name === name ? { ...item, images: uniq([...item.images, ...urls]) } : item)))
        const target = colors.find((item) => item.name === name)
        if (target) clearError(`colorImages.${target.id}`)
        clearError('colors')
        setDirty(true)
    }

    const handleMainFieldBlur = (field, { trim = false } = {}) => {
        const nextForm = { ...form }
        if (trim) nextForm[field] = toTrimmedText(nextForm[field])
        if (trim && nextForm[field] !== form[field]) setForm(nextForm)
        validateField(field, { overrides: { form: nextForm } })
    }

    const save = async (isDraft) => {
        try {
            const validation = buildValidationResult(isDraft)
            if (Object.keys(validation.errors).length > 0) {
                setErrors(validation.errors)
                setSubmitError('')
                return
            }

            setSaving(true)
            setSubmitError('')
            setErrors({})

            const safeQuantity = Number.isFinite(validation.numbers.quantityValue) ? validation.numbers.quantityValue : 1
            const safeBaseRentPrice = Number.isFinite(validation.numbers.baseRentPriceValue) ? validation.numbers.baseRentPriceValue : 0
            const safeBaseSalePrice = Number.isFinite(validation.numbers.baseSalePriceValue) ? validation.numbers.baseSalePriceValue : 0

            const payload = {
                name: validation.sanitizedForm.name || 'Draft product',
                category: validation.selectedCategoryValue || 'Draft',
                categoryParent: validation.sanitizedForm.categoryPath[0] || '',
                categoryChild: validation.sanitizedForm.categoryPath.length > 1 ? validation.sanitizedForm.categoryPath[validation.sanitizedForm.categoryPath.length - 1] : '',
                categoryAncestors: validation.sanitizedForm.categoryPath,
                size: validation.normalizedSizes[0] || 'M',
                sizes: validation.normalizedSizes,
                color: validation.normalizedColors[0]?.name || 'Default',
                colorVariants: validation.normalizedColors.map((item) => ({ name: item.name, images: item.images })),
                quantity: safeQuantity,
                baseRentPrice: safeBaseRentPrice,
                baseSalePrice: safeBaseSalePrice,
                commonRentPrice: safeBaseRentPrice,
                pricingMode: 'common',
                variantMatrix: [],
                description: validation.sanitizedForm.description,
                isDraft,
            }
            const response = await createOwnerProductApi(payload)
            await onCreated?.(response?.data?._id || response?.data?.id)
            onClose?.()
        } catch (apiError) {
            setSubmitError(apiError?.response?.data?.message || apiError?.message || 'Không thể lưu sản phẩm.')
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
                                <Field label="Tên sản phẩm" value={form.name} onChange={(value) => updateField('name', value)} onBlur={() => handleMainFieldBlur('name', { trim: true })} error={errors.name} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Field type="number" label="Số lượng" value={form.quantity} onChange={(value) => updateField('quantity', value)} onBlur={() => handleMainFieldBlur('quantity')} error={errors.quantity} />
                                    <Field type="number" label="Giá bán cơ bản" value={form.baseSalePrice} onChange={(value) => updateField('baseSalePrice', value)} onBlur={() => handleMainFieldBlur('baseSalePrice')} hint={form.baseSalePrice ? `${toCurrency(form.baseSalePrice)}đ` : ''} error={errors.baseSalePrice} />
                                    <Field type="number" label="Giá thuê cơ bản" value={form.baseRentPrice} onChange={(value) => { updateField('baseRentPrice', value); updateField('commonRentPrice', value) }} onBlur={() => handleMainFieldBlur('baseRentPrice')} hint={form.baseRentPrice ? `${toCurrency(form.baseRentPrice)}đ` : ''} error={errors.baseRentPrice} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {categoryLevelOptions.map((options, index) => (
                                        <Select
                                            key={`category-level-${index}`}
                                            label={`Danh mục cấp ${index + 1}`}
                                            value={selectedCategoryPath[index] || ''}
                                            options={options}
                                            onChange={(value) => updateCategoryLevel(index, value)}
                                            onBlur={() => validateField('categoryPath')}
                                            error={errors.categoryPath}
                                            placeholder={`Chọn danh mục cấp ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Mô tả</label>
                                    <textarea rows={4} className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.description ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} value={form.description} onChange={(event) => updateField('description', event.target.value)} onBlur={() => handleMainFieldBlur('description', { trim: true })} />
                                    {errors.description ? <p className="text-xs text-rose-600">{errors.description}</p> : null}
                                </div>
                            </section>
                            <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                                <h4 className="text-sm font-bold">Preview sản phẩm</h4>
                                <div className="h-48 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">{previewImage ? <img src={previewImage} alt="preview" className="w-full h-full object-contain" /> : null}</div>
                                <p className="font-semibold">{form.name || 'Tên sản phẩm'}</p>
                                <p className="text-sm text-slate-500">{selectedCategory || 'Danh mục'}</p>
                                <p className="text-lg font-bold text-[#1975d2]">{toCurrency(form.baseRentPrice)}đ</p>
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
                                        <input className={`flex-1 h-10 border rounded-lg px-3 text-sm ${errors.sizeDraft || errors.sizes ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} placeholder="Thêm size mới" value={sizeDraft} onChange={(event) => { setSizeDraft(event.target.value); clearError('sizeDraft') }} onBlur={() => validateField('sizes')} />
                                        <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" onClick={addSize}>Thêm size mới</button>
                                    </div>
                                    {errors.sizeDraft ? <p className="text-xs text-rose-600">{errors.sizeDraft}</p> : null}
                                    {!errors.sizeDraft && errors.sizes ? <p className="text-xs text-rose-600">{errors.sizes}</p> : null}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Màu sắc</label>
                                    <div className="flex items-center gap-2">
                                        <input className={`flex-1 h-10 border rounded-lg px-3 text-sm ${errors.colorDraft || errors.colors ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} placeholder="Nhập tên màu" value={colorDraft} onChange={(event) => { setColorDraft(event.target.value); clearError('colorDraft') }} onBlur={() => validateField('colors')} />
                                        <button type="button" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" onClick={addColor}>Thêm màu</button>
                                    </div>
                                    {errors.colorDraft ? <p className="text-xs text-rose-600">{errors.colorDraft}</p> : null}
                                    {!errors.colorDraft && errors.colors ? <p className="text-xs text-rose-600">{errors.colors}</p> : null}
                                    <div className="space-y-3">
                                        {colors.map((item) => (
                                            <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                                                <div className="flex items-center justify-between"><p className="text-sm font-semibold">{item.name} <span className="text-slate-500 font-normal">({item.images.length} ảnh)</span></p><button type="button" className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600" onClick={() => { setColors((prev) => prev.filter((x) => x.name !== item.name)); setVariantMatrix((prev) => buildVariantMatrix(sizes, colors.filter((x) => x.name !== item.name).map((x) => x.name), prev)); clearError(`colorUrl.${item.id}`); clearError(`colorImages.${item.id}`); setDirty(true) }}>Xóa màu</button></div>
                                                <div className="flex flex-wrap gap-2">{item.images.map((img, idx) => <button key={`${item.id}-${idx}`} type="button" className="h-14 w-14 rounded border border-slate-200 overflow-hidden" onClick={() => { setColors((prev) => prev.map((x) => x.name === item.name ? { ...x, images: x.images.filter((m) => m !== img) } : x)); setDirty(true) }}><img src={img} alt={`${item.name}-${idx}`} className="w-full h-full object-cover" /></button>)}</div>
                                                <div className="flex gap-2">
                                                    <input className={`flex-1 h-9 border rounded-lg px-3 text-xs ${(errors[`colorUrl.${item.id}`] || errors[`colorImages.${item.id}`]) ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} placeholder="Dán URL ảnh màu" value={item.urlDraft} onChange={(event) => updateColorUrlDraft(item.name, event.target.value)} onBlur={() => handleColorUrlBlur(item.name)} />
                                                    <button type="button" className="h-9 px-3 rounded-lg border border-slate-200 text-xs" onClick={() => addColorUrl(item.name)}>Thêm URL</button>
                                                </div>
                                                {errors[`colorUrl.${item.id}`] ? <p className="text-xs text-rose-600">{errors[`colorUrl.${item.id}`]}</p> : null}
                                                {!errors[`colorUrl.${item.id}`] && errors[`colorImages.${item.id}`] ? <p className="text-xs text-rose-600">{errors[`colorImages.${item.id}`]}</p> : null}
                                                <label className="inline-flex h-9 items-center px-3 rounded-lg border border-slate-200 text-xs cursor-pointer">Thêm ảnh từ máy<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addColorFiles(item.name, event.target.files)} /></label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : null}

                    {submitError ? <div className="owner-alert">{submitError}</div> : null}
                </div>
            </div>
        </div>
    )
}

function Tab({ active, onClick, children }) {
    return <button type="button" onClick={onClick} className={`h-9 px-3 rounded-lg text-sm ${active ? 'bg-[#1975d2] text-white' : 'bg-slate-100 text-slate-700'}`}>{children}</button>
}

function Field({ label, value, onChange, type = 'text', hint = '', error = '', onBlur }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input type={type} className={`w-full h-10 border rounded-lg px-3 text-sm ${error ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} />
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            {!error && hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    )
}

function Select({ label, value, onChange, options = [], placeholder = 'Chọn', disabled = false, error = '', onBlur }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <select className={`w-full h-10 border rounded-lg px-3 text-sm bg-white disabled:bg-slate-100 ${error ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200'}`} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} disabled={disabled}>
                <option value="">{placeholder}</option>
                {options.map((item) => {
                    const optionValue = typeof item === 'object' && item !== null ? item.value : item
                    const optionLabel = typeof item === 'object' && item !== null ? item.label : item
                    return <option key={optionValue} value={optionValue}>{optionLabel}</option>
                })}
            </select>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
    )
}
