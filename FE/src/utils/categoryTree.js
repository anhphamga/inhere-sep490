const toText = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim()
    }
    if (Array.isArray(value)) {
        return value.map((item) => toText(item)).find(Boolean) || ''
    }
    if (typeof value === 'object') {
        return toText(value.displayName) || toText(value.name) || toText(value.value) || toText(value.label) || ''
    }
    return ''
}

export const normalizeCategoryTree = (nodes = [], trail = []) => {
    return (Array.isArray(nodes) ? nodes : [])
        .map((node) => {
            const name = toText(node?.displayName || node?.name || node?.value)
            if (!name) return null

            const nextTrail = [...trail, name]
            return {
                id: String(node?._id || node?.id || node?.value || name),
                name,
                label: nextTrail.join(' / '),
                ancestors: nextTrail,
                parentName: trail[0] || '',
                leafName: name,
                raw: node,
                children: normalizeCategoryTree(node?.children || [], nextTrail),
            }
        })
        .filter(Boolean)
}

export const findCategoryPath = (nodes = [], targetPath = [], trail = []) => {
    const normalizedTarget = (Array.isArray(targetPath) ? targetPath : []).map((item) => toText(item)).filter(Boolean)
    if (normalizedTarget.length === 0) return []

    for (const node of Array.isArray(nodes) ? nodes : []) {
        const currentName = toText(node?.name || node?.displayName || node?.value)
        if (!currentName) continue

        const nextTrail = [...trail, currentName]
        const isSameLength = nextTrail.length === normalizedTarget.length
        const matchesTrail = nextTrail.every((item, index) => item === normalizedTarget[index])
        if (matchesTrail && isSameLength) {
            return nextTrail
        }

        const nested = findCategoryPath(node?.children || [], normalizedTarget, nextTrail)
        if (nested.length > 0) return nested
    }

    return []
}

export const getCategoryLevelOptions = (nodes = [], selectedPath = [], level = 0) => {
    const currentLevel = Number(level || 0)
    const path = (Array.isArray(selectedPath) ? selectedPath : []).map((item) => toText(item)).filter(Boolean)

    let items = Array.isArray(nodes) ? nodes : []
    for (let index = 0; index < currentLevel; index += 1) {
        const selectedName = path[index]
        const matched = items.find((item) => item?.name === selectedName)
        if (!matched) return []
        items = Array.isArray(matched.children) ? matched.children : []
    }

    return items.map((item) => ({
        value: item.name,
        label: item.name,
    }))
}

export const flattenCategoryOptions = (nodes = []) => {
    const result = []

    const visit = (items) => {
        items.forEach((item) => {
            result.push({
                id: item.id,
                value: item.leafName,
                label: item.label,
                ancestors: item.ancestors,
                parentName: item.parentName || item.ancestors[0] || '',
                childName: item.ancestors.length > 1 ? item.leafName : '',
                depth: Math.max(item.ancestors.length - 1, 0),
            })
            if (Array.isArray(item.children) && item.children.length > 0) {
                visit(item.children)
            }
        })
    }

    visit(Array.isArray(nodes) ? nodes : [])
    return result
}

export const flattenCategoryNames = (nodes = []) =>
    flattenCategoryOptions(nodes).map((item) => item.value)

export const findCategoryOption = (options = [], product = {}) => {
    const path = Array.isArray(product?.categoryPath?.ancestors) ? product.categoryPath.ancestors.filter(Boolean) : []
    const pathKey = path.join(' / ')
    const child = toText(product?.categoryPath?.child)
    const category = toText(product?.category)

    if (pathKey) {
        const exact = options.find((item) => item.label === pathKey)
        if (exact) return exact
    }

    if (child) {
        const exactChild = options.find((item) => item.value === child)
        if (exactChild) return exactChild
    }

    if (category) {
        return options.find((item) => item.value === category || item.label === category) || null
    }

    return null
}

export const findCategoryPathFromProduct = (tree = [], product = {}) => {
    const rawPath = Array.isArray(product?.categoryPath?.ancestors) ? product.categoryPath.ancestors.filter(Boolean) : []
    if (rawPath.length > 0) {
        const matched = findCategoryPath(tree, rawPath)
        if (matched.length > 0) return matched
        return rawPath
    }

    const fallback = findCategoryOption(flattenCategoryOptions(tree), product)
    return Array.isArray(fallback?.ancestors) ? fallback.ancestors : []
}
