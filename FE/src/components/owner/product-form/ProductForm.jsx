import { useEffect, useMemo, useRef, useState } from 'react'
import BasicInfoSection from './BasicInfoSection'
import SizeSection from './SizeSection'
import ImageSection from './ImageSection'
import InventorySummary from './InventorySummary'
import {
    calculateTotalQuantity,
    createOwnerProductPayload,
    createValidationErrors,
    normalizeSizeRows,
    toPositiveInteger,
    toText,
} from './formUtils'

const buildInitialState = (initialValues = {}) => ({
    name: toText(initialValues.name),
    description: toText(initialValues.description),
    categoryPath: Array.isArray(initialValues.categoryPath) ? initialValues.categoryPath.slice(0, 3).filter(Boolean) : [],
    color: toText(initialValues.color) || 'Default',
    baseSalePrice: String(initialValues.baseSalePrice ?? ''),
    baseRentPrice: String(initialValues.baseRentPrice ?? ''),
    hasSizes: Boolean(initialValues.hasSizes),
    quantity: String(initialValues.quantity ?? '0'),
    sizes: normalizeSizeRows(initialValues.sizes).map((item) => ({ size: item.size, quantity: String(item.quantity) })),
    images: Array.isArray(initialValues.images) ? initialValues.images.filter(Boolean).map(String) : [],
    imageFiles: [],
    rentedCount: toPositiveInteger(initialValues.rentedCount, 0),
})

export default function ProductForm({
    categoryTree = [],
    initialValues = {},
    submitting = false,
    onSubmit,
    errorMessage = '',
    allowDraft = true,
    submitLabel = 'Save',
    draftLabel = 'Save draft',
    actualInstances = [],
}) {
    const [form, setForm] = useState(buildInitialState(initialValues))
    const [sizeDraft, setSizeDraft] = useState('')
    const [imageUrlDraft, setImageUrlDraft] = useState('')
    const [errors, setErrors] = useState({})
    const fileItemsRef = useRef([])

    useEffect(() => {
        const nextState = buildInitialState(initialValues)
        setForm(nextState)
        setErrors({})
        setSizeDraft('')
        setImageUrlDraft('')
    }, [initialValues])

    useEffect(() => {
        fileItemsRef.current = form.imageFiles
    }, [form.imageFiles])

    useEffect(() => () => {
        fileItemsRef.current.forEach((item) => {
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
        })
    }, [])

    const totalQuantity = useMemo(
        () => calculateTotalQuantity({ hasSizes: form.hasSizes, quantity: form.quantity, sizes: form.sizes }),
        [form.hasSizes, form.quantity, form.sizes]
    )

    const imageItems = useMemo(() => {
        const remoteItems = form.images.map((url) => ({
            id: `remote-${url}`,
            kind: 'remote',
            url,
            previewUrl: url,
            label: 'image',
        }))

        const localItems = form.imageFiles.map((item) => ({
            id: item.id,
            kind: 'local',
            key: item.key,
            previewUrl: item.previewUrl,
            label: item.file?.name || 'upload',
        }))

        return [...remoteItems, ...localItems]
    }, [form.imageFiles, form.images])

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: '' }))
    }

    const updateCategoryLevel = (level, value) => {
        setForm((prev) => {
            const path = Array.isArray(prev.categoryPath) ? prev.categoryPath : []
            const nextPath = path.slice(0, level)
            if (value) nextPath.push(value)
            return { ...prev, categoryPath: nextPath.slice(0, 3) }
        })
    }

    const toggleHasSizes = (checked) => {
        setForm((prev) => ({
            ...prev,
            hasSizes: checked,
            sizes: checked && prev.sizes.length === 0 ? [{ size: 'M', quantity: '1' }] : prev.sizes,
        }))
    }

    const addSize = (value = '') => {
        const normalized = toText(value || sizeDraft).toUpperCase()
        if (!normalized) return

        setForm((prev) => {
            const existing = (Array.isArray(prev.sizes) ? prev.sizes : []).some(
                (item) => toText(item.size).toLowerCase() === normalized.toLowerCase()
            )
            if (existing) return prev
            return {
                ...prev,
                sizes: [...prev.sizes, { size: normalized, quantity: '1' }],
            }
        })
        setSizeDraft('')
    }

    const updateSize = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            sizes: prev.sizes.map((item, currentIndex) => (
                currentIndex === index ? { ...item, [field]: value } : item
            )),
        }))
    }

    const removeSize = (index) => {
        setForm((prev) => ({
            ...prev,
            sizes: prev.sizes.filter((_, currentIndex) => currentIndex !== index),
        }))
    }

    const uploadFiles = (files) => {
        const selected = Array.from(files || []).filter((file) => file?.type?.startsWith('image/'))
        if (selected.length === 0) return

        setForm((prev) => {
            const existingKeys = new Set(prev.imageFiles.map((item) => item.key))
            const additions = []
            selected.forEach((file) => {
                const key = `${file.name}__${file.size}__${file.lastModified}`
                if (existingKeys.has(key)) return
                existingKeys.add(key)
                additions.push({
                    id: `${Date.now()}-${Math.random()}`,
                    key,
                    file,
                    previewUrl: URL.createObjectURL(file),
                })
            })
            return { ...prev, imageFiles: [...prev.imageFiles, ...additions] }
        })
    }

    const addImageUrl = (url = '') => {
        const imageUrl = toText(url || imageUrlDraft).trim()
        if (!imageUrl) return

        setForm((prev) => {
            const exists = prev.images.some((img) => img === imageUrl)
            if (exists) return prev
            return { ...prev, images: [...prev.images, imageUrl] }
        })
        setImageUrlDraft('')
    }

    const deleteImage = (item) => {
        if (item.kind === 'remote') {
            setForm((prev) => ({ ...prev, images: prev.images.filter((url) => url !== item.url) }))
            return
        }

        setForm((prev) => {
            const target = prev.imageFiles.find((current) => current.id === item.id)
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
            return {
                ...prev,
                imageFiles: prev.imageFiles.filter((current) => current.id !== item.id),
            }
        })
    }

    const setPrimaryImage = (item) => {
        if (item.kind === 'remote') {
            setForm((prev) => ({
                ...prev,
                images: [item.url, ...prev.images.filter((url) => url !== item.url)],
            }))
            return
        }

        setForm((prev) => {
            const found = prev.imageFiles.find((current) => current.id === item.id)
            if (!found) return prev
            return {
                ...prev,
                imageFiles: [found, ...prev.imageFiles.filter((current) => current.id !== item.id)],
            }
        })
    }

    const submit = async (isDraft) => {
        console.log('[ProductForm] Submit clicked, isDraft:', isDraft)
        const validationErrors = createValidationErrors(form)
        if (!isDraft && Object.keys(validationErrors).length > 0) {
            console.warn('[ProductForm] Validation errors:', validationErrors)
            setErrors(validationErrors)
            return
        }

        const payload = createOwnerProductPayload(form)
        console.log('[ProductForm] Submitting payload:', payload)
        console.log('[ProductForm] onSubmit callback exists?', !!onSubmit)
        await onSubmit?.({ payload: { ...payload, isDraft }, isDraft })
        console.log('[ProductForm] onSubmit completed')
    }

    return (
        <div className="space-y-4">
            <BasicInfoSection
                values={form}
                categoryTree={categoryTree}
                onChangeField={updateField}
                onCategoryChange={updateCategoryLevel}
                errors={errors}
            />

            <SizeSection
                hasSizes={form.hasSizes}
                quantity={form.quantity}
                sizes={form.sizes}
                sizeDraft={sizeDraft}
                onToggleHasSizes={toggleHasSizes}
                onQuantityChange={(value) => updateField('quantity', value)}
                onSizeDraftChange={setSizeDraft}
                onAddSize={addSize}
                onUpdateSize={updateSize}
                onRemoveSize={removeSize}
                errors={errors}
            />

            <InventorySummary totalQuantity={totalQuantity} rentedCount={form.rentedCount} actualInstances={actualInstances} />

            <ImageSection
                imageItems={imageItems}
                onUploadFiles={uploadFiles}
                onDeleteImage={deleteImage}
                onSelectPrimaryImage={setPrimaryImage}
                imageUrlDraft={imageUrlDraft}
                onImageUrlChange={setImageUrlDraft}
                onAddImageUrl={addImageUrl}
            />

            {errorMessage ? <div className="owner-alert">{errorMessage}</div> : null}

            <div className="flex items-center justify-end gap-2">
                {allowDraft ? (
                    <button
                        type="button"
                        className="h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-60"
                        disabled={submitting}
                        onClick={() => submit(true)}
                    >
                        {draftLabel}
                    </button>
                ) : null}
                <button
                    type="button"
                    className="h-10 px-3 rounded-lg bg-[#1975d2] text-white text-sm font-semibold disabled:opacity-60"
                    disabled={submitting}
                    onClick={() => submit(false)}
                >
                    {submitting ? 'Đang lưu...' : submitLabel}
                </button>
            </div>
        </div>
    )
}
