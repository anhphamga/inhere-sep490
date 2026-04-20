export const SIZE_PRESETS = ['S', 'M', 'L', 'XL']

export const toText = (value) => String(value ?? '').trim()

export const toPositiveInteger = (value, fallback = 0) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    if (!Number.isInteger(parsed)) return fallback
    if (parsed < 0) return fallback
    return parsed
}

export const toPositiveNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    if (parsed < 0) return fallback
    return parsed
}

export const normalizeSizeRows = (rows = []) => {
    const seen = new Set()
    return (Array.isArray(rows) ? rows : [])
        .map((item) => ({
            size: toText(item?.size).toUpperCase(),
            quantity: toPositiveInteger(item?.quantity, 0),
        }))
        .filter((item) => {
            if (!item.size) return false
            const key = item.size.toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
}

export const ensureUniqueStringList = (values = []) => {
    const seen = new Set()
    const output = []
    ;(Array.isArray(values) ? values : []).forEach((item) => {
        const normalized = toText(item)
        if (!normalized) return
        if (seen.has(normalized)) return
        seen.add(normalized)
        output.push(normalized)
    })
    return output
}

export const calculateTotalQuantity = ({ hasSizes, quantity, sizes }) => {
    if (hasSizes) {
        return normalizeSizeRows(sizes).reduce((sum, item) => sum + item.quantity, 0)
    }
    return toPositiveInteger(quantity, 0)
}

export const createValidationErrors = (form) => {
    const errors = {}

    if (!toText(form.name)) {
        errors.name = 'Tên sản phẩm là bắt buộc.'
    }

    if (toPositiveNumber(form.baseSalePrice, 0) <= 0) {
        errors.baseSalePrice = 'Giá bán phải lớn hơn 0.'
    }

    if (toPositiveNumber(form.baseRentPrice, 0) <= 0) {
        errors.baseRentPrice = 'Giá thuê phải lớn hơn 0.'
    }

    if (form.hasSizes) {
        const rows = normalizeSizeRows(form.sizes)
        if (rows.length === 0) {
            errors.sizes = 'Vui lòng thêm ít nhất một size.'
        }
        if (rows.some((item) => item.quantity <= 0)) {
            errors.sizes = 'Số lượng của mỗi size phải lớn hơn 0.'
        }
    } else if (toPositiveInteger(form.quantity, 0) <= 0) {
        errors.quantity = 'Số lượng phải lớn hơn 0.'
    }

    return errors
}

export const createOwnerProductPayload = (form) => {
    const normalizedName = toText(form.name)
    const normalizedDescription = toText(form.description)
    const normalizedColor = toText(form.color) || 'Default'
    const normalizedCategoryPath = Array.isArray(form.categoryPath) ? form.categoryPath.filter(Boolean) : []
    const selectedCategory = normalizedCategoryPath[normalizedCategoryPath.length - 1] || ''
    const normalizedSizes = form.hasSizes ? normalizeSizeRows(form.sizes) : []
    const quantity = toPositiveInteger(form.quantity, 0)
    const salePrice = toPositiveNumber(form.baseSalePrice, 0)
    const rentPrice = toPositiveNumber(form.baseRentPrice, 0)
    const images = ensureUniqueStringList(form.images)

    const payload = {
        name: normalizedName,
        description: normalizedDescription,
        category: selectedCategory,
        categoryParent: normalizedCategoryPath[0] || '',
        categoryChild: normalizedCategoryPath.length > 1 ? normalizedCategoryPath[normalizedCategoryPath.length - 1] : '',
        categoryAncestors: normalizedCategoryPath,
        color: normalizedColor,
        hasSizes: Boolean(form.hasSizes),
        sizes: form.hasSizes ? normalizedSizes : [],
        quantity: form.hasSizes ? 0 : quantity,
        price: salePrice,
        rentPrice,
        baseSalePrice: salePrice,
        baseRentPrice: rentPrice,
        commonRentPrice: rentPrice,
        images,
        imageFiles: Array.isArray(form.imageFiles) ? form.imageFiles : [],
        size: normalizedSizes[0]?.size || 'FREE SIZE',
        colorVariants: [{ name: normalizedColor, images }],
        variantMatrix: [],
    }

    return payload
}
