export const numberFormatter = new Intl.NumberFormat('vi-VN')

export const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
})

export const toArray = (value) => {
    if (Array.isArray(value)) {
        return value
    }

    if (Array.isArray(value?.items)) {
        return value.items
    }

    if (Array.isArray(value?.rows)) {
        return value.rows
    }

    if (Array.isArray(value?.data)) {
        return value.data
    }

    return []
}
