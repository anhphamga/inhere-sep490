export const SIZE_PRESETS = ['S', 'M', 'L', 'XL']
export const SIZE_GUIDE_GENDERS = ['male', 'female']

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

const toNumericInput = (value) => {
    if (value === undefined || value === null || value === '') return ''
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return ''
    if (parsed < 0) return ''
    return String(parsed)
}

const toNullableNumber = (value) => {
    if (value === undefined || value === null || value === '') return null
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return Number.NaN
    if (parsed < 0) return Number.NaN
    return parsed
}

export const createDefaultSizeGuideRows = (sourceRows = []) => {
    const source = Array.isArray(sourceRows) ? sourceRows : []
    const rowMap = new Map()

    source.forEach((row) => {
        const gender = toText(row?.gender).toLowerCase()
        const sizeLabel = toText(row?.sizeLabel || row?.size_label || row?.size).toUpperCase()
        if (!SIZE_GUIDE_GENDERS.includes(gender)) return
        if (!SIZE_PRESETS.includes(sizeLabel)) return

        rowMap.set(`${gender}::${sizeLabel}`, {
            gender,
            sizeLabel,
            heightMin: toNumericInput(row?.heightMin ?? row?.height_min),
            heightMax: toNumericInput(row?.heightMax ?? row?.height_max),
            weightMin: toNumericInput(row?.weightMin ?? row?.weight_min),
            weightMax: toNumericInput(row?.weightMax ?? row?.weight_max),
            itemLength: toNumericInput(row?.itemLength ?? row?.item_length),
            itemWidth: toNumericInput(row?.itemWidth ?? row?.item_width),
        })
    })

    const rows = []
    SIZE_GUIDE_GENDERS.forEach((gender) => {
        SIZE_PRESETS.forEach((sizeLabel) => {
            const key = `${gender}::${sizeLabel}`
            rows.push(
                rowMap.get(key) || {
                    gender,
                    sizeLabel,
                    heightMin: '',
                    heightMax: '',
                    weightMin: '',
                    weightMax: '',
                    itemLength: '',
                    itemWidth: '',
                }
            )
        })
    })

    return rows
}

export const normalizeSizeGuideRows = (rows = []) => {
    const source = Array.isArray(rows) ? rows : []
    const seen = new Set()
    const normalized = []

    source.forEach((row) => {
        const gender = toText(row?.gender).toLowerCase()
        const sizeLabel = toText(row?.sizeLabel || row?.size_label || row?.size).toUpperCase()
        if (!SIZE_GUIDE_GENDERS.includes(gender)) return
        if (!SIZE_PRESETS.includes(sizeLabel)) return

        const key = `${gender}::${sizeLabel}`
        if (seen.has(key)) return
        seen.add(key)

        normalized.push({
            gender,
            sizeLabel,
            heightMin: toNullableNumber(row?.heightMin ?? row?.height_min),
            heightMax: toNullableNumber(row?.heightMax ?? row?.height_max),
            weightMin: toNullableNumber(row?.weightMin ?? row?.weight_min),
            weightMax: toNullableNumber(row?.weightMax ?? row?.weight_max),
            itemLength: toNullableNumber(row?.itemLength ?? row?.item_length),
            itemWidth: toNullableNumber(row?.itemWidth ?? row?.item_width),
        })
    })

    return normalized.sort((a, b) => {
        const genderDiff = SIZE_GUIDE_GENDERS.indexOf(a.gender) - SIZE_GUIDE_GENDERS.indexOf(b.gender)
        if (genderDiff !== 0) return genderDiff
        return SIZE_PRESETS.indexOf(a.sizeLabel) - SIZE_PRESETS.indexOf(b.sizeLabel)
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

    const sizeGuideMode = toText(form.sizeGuideMode).toLowerCase() || 'global'
    if (sizeGuideMode === 'product') {
        const rows = normalizeSizeGuideRows(form.sizeGuideRows)
        if (rows.length !== SIZE_PRESETS.length * SIZE_GUIDE_GENDERS.length) {
            errors.sizeGuideRows = 'Bảng size riêng phải có đủ male/female cho các size S, M, L, XL.'
        } else {
            const hasInvalidRequired = rows.some((row) => (
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

            if (hasInvalidRequired) {
                errors.sizeGuideRows = 'Vui lòng nhập đầy đủ chiều cao/cân nặng hợp lệ (min <= max) cho toàn bộ bảng size riêng.'
            }
        }
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
    const sizeGuideMode = toText(form.sizeGuideMode).toLowerCase() === 'product' ? 'product' : 'global'
    const sizeGuideRows = normalizeSizeGuideRows(form.sizeGuideRows)

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
        sizeGuideMode,
        sizeGuideRows: sizeGuideMode === 'product' ? sizeGuideRows : [],
    }

    return payload
}
