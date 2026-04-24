export const SIZE_PRESETS = ['S', 'M', 'L', 'XL']
export const DEFAULT_SIZE_GUIDE_LABELS = ['S', 'M', 'L', 'XL']
export const SIZE_GUIDE_GENDERS = ['male', 'female']

export const toText = (value) => String(value ?? '').trim()

export const normalizeSizeGuideLabel = (value) => {
    const normalized = toText(value).toUpperCase()
    if (!normalized) return ''
    if (normalized.length > 20) return ''
    return normalized
}

const dedupeSizeGuideLabels = (values = []) => {
    const seen = new Set()
    const output = []

    ;(Array.isArray(values) ? values : []).forEach((item) => {
        const label = normalizeSizeGuideLabel(item)
        if (!label) return
        if (seen.has(label)) return
        seen.add(label)
        output.push(label)
    })

    return output
}

const normalizeDisplayOrder = (value) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN
    return Math.floor(parsed)
}

const sortGenderRowsByOrder = (rows = []) => {
    return rows.slice().sort((a, b) => {
        const orderA = normalizeDisplayOrder(a.displayOrder)
        const orderB = normalizeDisplayOrder(b.displayOrder)
        const hasOrderA = Number.isFinite(orderA)
        const hasOrderB = Number.isFinite(orderB)

        if (hasOrderA && hasOrderB && orderA !== orderB) {
            return orderA - orderB
        }

        if (hasOrderA !== hasOrderB) {
            return hasOrderA ? -1 : 1
        }

        const inputIndexA = Number(a.__inputIndex)
        const inputIndexB = Number(b.__inputIndex)
        if (Number.isFinite(inputIndexA) && Number.isFinite(inputIndexB) && inputIndexA !== inputIndexB) {
            return inputIndexA - inputIndexB
        }

        return String(a.sizeLabel || '').localeCompare(String(b.sizeLabel || ''))
    })
}

export const getSizeGuideLabels = (rows = [], fallbackLabels = DEFAULT_SIZE_GUIDE_LABELS) => {
    const rowLabels = dedupeSizeGuideLabels(
        (Array.isArray(rows) ? rows : []).map((row) => row?.sizeLabel || row?.size_label || row?.size)
    )

    if (rowLabels.length === 0) {
        return dedupeSizeGuideLabels(fallbackLabels)
    }

    return rowLabels
}

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

export const normalizeSizeGuideRows = (rows = []) => {
    const source = Array.isArray(rows) ? rows : []
    const seen = new Set()
    const collected = []

    source.forEach((row, inputIndex) => {
        const gender = toText(row?.gender).toLowerCase()
        const sizeLabel = normalizeSizeGuideLabel(row?.sizeLabel || row?.size_label || row?.size)
        if (!SIZE_GUIDE_GENDERS.includes(gender)) return
        if (!sizeLabel) return

        const key = `${gender}::${sizeLabel}`
        if (seen.has(key)) return
        seen.add(key)

        collected.push({
            gender,
            sizeLabel,
            heightMin: toNullableNumber(row?.heightMin ?? row?.height_min),
            heightMax: toNullableNumber(row?.heightMax ?? row?.height_max),
            weightMin: toNullableNumber(row?.weightMin ?? row?.weight_min),
            weightMax: toNullableNumber(row?.weightMax ?? row?.weight_max),
            displayOrder: normalizeDisplayOrder(row?.displayOrder ?? row?.display_order),
            itemLength: toNullableNumber(row?.itemLength ?? row?.item_length),
            itemWidth: toNullableNumber(row?.itemWidth ?? row?.item_width),
            __inputIndex: inputIndex,
        })
    })

    const output = []
    SIZE_GUIDE_GENDERS.forEach((gender) => {
        const sortedRows = sortGenderRowsByOrder(collected.filter((row) => row.gender === gender))
        sortedRows.forEach((row, index) => {
            const { __inputIndex, ...safeRow } = row
            output.push({
                ...safeRow,
                displayOrder: index,
            })
        })
    })

    return output
}

const toEditableRow = (row = {}) => ({
    gender: row.gender,
    sizeLabel: row.sizeLabel,
    heightMin: toNumericInput(row?.heightMin),
    heightMax: toNumericInput(row?.heightMax),
    weightMin: toNumericInput(row?.weightMin),
    weightMax: toNumericInput(row?.weightMax),
    displayOrder: Number(row?.displayOrder) || 0,
    itemLength: toNumericInput(row?.itemLength),
    itemWidth: toNumericInput(row?.itemWidth),
})

export const getSizeGuideRowsByGender = (rows = [], gender = '') => {
    const normalizedGender = toText(gender).toLowerCase()
    if (!SIZE_GUIDE_GENDERS.includes(normalizedGender)) return []

    return normalizeSizeGuideRows(rows)
        .filter((row) => row.gender === normalizedGender)
        .sort((a, b) => a.displayOrder - b.displayOrder)
}

export const createDefaultSizeGuideRows = (sourceRows = [], options = {}) => {
    const normalizedRows = normalizeSizeGuideRows(sourceRows)
    const hasSourceRows = normalizedRows.length > 0
    const rows = []

    SIZE_GUIDE_GENDERS.forEach((gender) => {
        const genderRows = getSizeGuideRowsByGender(normalizedRows, gender)
        if (genderRows.length > 0) {
            genderRows.forEach((row) => rows.push(toEditableRow(row)))
            return
        }

        if (hasSourceRows) {
            return
        }

        const fallbackLabels = dedupeSizeGuideLabels(options?.defaultLabelsByGender?.[gender])
        const labels = fallbackLabels.length > 0 ? fallbackLabels : DEFAULT_SIZE_GUIDE_LABELS
        labels.forEach((sizeLabel, index) => {
            rows.push({
                gender,
                sizeLabel,
                heightMin: '',
                heightMax: '',
                weightMin: '',
                weightMax: '',
                displayOrder: index,
                itemLength: '',
                itemWidth: '',
            })
        })
    })

    return rows
}

export const addSizeGuideRow = (rows = [], { gender = '', sizeLabel = '' } = {}) => {
    const normalizedGender = toText(gender).toLowerCase()
    const normalizedLabel = normalizeSizeGuideLabel(sizeLabel)
    if (!SIZE_GUIDE_GENDERS.includes(normalizedGender) || !normalizedLabel) {
        return normalizeSizeGuideRows(rows)
    }

    const normalizedRows = normalizeSizeGuideRows(rows)
    const exists = normalizedRows.some((row) => row.gender === normalizedGender && row.sizeLabel === normalizedLabel)
    if (exists) return normalizedRows

    const currentGenderRows = getSizeGuideRowsByGender(normalizedRows, normalizedGender)
    const nextRows = [...normalizedRows, {
        gender: normalizedGender,
        sizeLabel: normalizedLabel,
        heightMin: null,
        heightMax: null,
        weightMin: null,
        weightMax: null,
        displayOrder: currentGenderRows.length,
        itemLength: null,
        itemWidth: null,
    }]

    return normalizeSizeGuideRows(nextRows)
}

export const removeSizeGuideRow = (rows = [], { gender = '', sizeLabel = '' } = {}) => {
    const normalizedGender = toText(gender).toLowerCase()
    const normalizedLabel = normalizeSizeGuideLabel(sizeLabel)
    const normalizedRows = normalizeSizeGuideRows(rows)
    const filteredRows = normalizedRows.filter((row) => (
        !(row.gender === normalizedGender && row.sizeLabel === normalizedLabel)
    ))

    return normalizeSizeGuideRows(filteredRows)
}

export const reorderSizeGuideRows = (
    rows = [],
    { gender = '', fromIndex = -1, toIndex = -1 } = {}
) => {
    const normalizedGender = toText(gender).toLowerCase()
    if (!SIZE_GUIDE_GENDERS.includes(normalizedGender)) return normalizeSizeGuideRows(rows)

    const normalizedRows = normalizeSizeGuideRows(rows)
    const genderRows = getSizeGuideRowsByGender(normalizedRows, normalizedGender)
    if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= genderRows.length
        || toIndex >= genderRows.length
        || fromIndex === toIndex
    ) {
        return normalizedRows
    }

    const reorderedGenderRows = genderRows.slice()
    const [movedRow] = reorderedGenderRows.splice(fromIndex, 1)
    reorderedGenderRows.splice(toIndex, 0, movedRow)

    const rowsFromOtherGenders = normalizedRows.filter((row) => row.gender !== normalizedGender)
    const mergedRows = [
        ...rowsFromOtherGenders,
        ...reorderedGenderRows.map((row, index) => ({
            ...row,
            displayOrder: index,
        })),
    ]

    return normalizeSizeGuideRows(mergedRows)
}

export const getSizeGuideMatrixError = (rows = []) => {
    const normalized = normalizeSizeGuideRows(rows)
    if (normalized.length === 0) {
        return 'Bảng size phải có ít nhất một dòng size.'
    }

    return ''
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

    const categoryPath = Array.isArray(form.categoryPath) ? form.categoryPath.filter(Boolean) : []
    if (categoryPath.length === 0) {
        errors.category = 'Danh mục sản phẩm là bắt buộc.'
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
        const matrixError = getSizeGuideMatrixError(rows)
        if (matrixError) {
            errors.sizeGuideRows = matrixError
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

    const hasRemoteImages = Array.isArray(form.images) && form.images.filter(Boolean).length > 0
    const hasLocalImages = Array.isArray(form.imageFiles) && form.imageFiles.some((item) => Boolean(item?.file))
    if (!hasRemoteImages && !hasLocalImages) {
        errors.images = 'Vui lòng tải lên ít nhất một hình ảnh sản phẩm.'
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
    const imageFiles = Array.isArray(form.imageFiles)
        ? form.imageFiles.map((item) => item?.file).filter(Boolean)
        : []

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
        imageFiles,
        size: normalizedSizes[0]?.size || 'FREE SIZE',
        colorVariants: [{ name: normalizedColor, images }],
        variantMatrix: [],
        sizeGuideMode,
        sizeGuideRows: sizeGuideMode === 'product' ? sizeGuideRows : [],
    }

    return payload
}
