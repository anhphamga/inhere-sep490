import {
  PRODUCT_LIFECYCLE_STATUS_LABELS,
  PRODUCT_LIFECYCLE_STATUS_BADGES,
  SALE_ORDER_STATUS_LABELS,
  SALE_ORDER_STATUS_BADGES,
  RENT_ORDER_STATUS_LABELS,
  PRODUCT_CONDITION_LABELS,
  OWNER_DEFAULTS,
  RENT_ORDER_STATUSES,
  SALE_ORDER_STATUSES,
  PRODUCT_LIFECYCLE_STATUSES
} from '../constants/owner.constants'

export const numberFormatter = new Intl.NumberFormat('vi-VN')

export const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
})

/**
 * Chuyển đổi mảng bất kỳ thành mảng an toàn
 */
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

/**
 * Chuyển đổi giá trị thành text hiển thị
 */
export const toDisplayText = (value) => {
    if (value === null || value === undefined) {
        return ''
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim()
    }

    if (Array.isArray(value)) {
        return value.map((item) => toDisplayText(item)).find(Boolean) || ''
    }

    if (typeof value === 'object') {
        const preferredKeys = ['vi', 'en', 'name', 'label', 'value']
        for (const key of preferredKeys) {
            const normalized = toDisplayText(value[key])
            if (normalized) {
                return normalized
            }
        }
    }

    return ''
}

/**
 * Lấy nhãn trạng thái đơn mua
 */
export const getSaleOrderStatusLabel = (status) => {
    return SALE_ORDER_STATUS_LABELS[status] || status || 'N/A'
}

/**
 * Lấy nhãn trạng thái đơn thuê
 */
export const getRentOrderStatusLabel = (status) => {
    return RENT_ORDER_STATUS_LABELS[status] || status || 'N/A'
}

/**
 * Lấy class CSS badge cho trạng thái đơn mua
 */
export const getSaleOrderStatusBadge = (status) => {
    return SALE_ORDER_STATUS_BADGES[status] || OWNER_DEFAULTS.DEFAULT_STATUS_BADGE
}

/**
 * Lấy class CSS badge cho trạng thái sản phẩm
 */
export const getProductLifecycleStatusBadge = (status) => {
    return PRODUCT_LIFECYCLE_STATUS_BADGES[status] || OWNER_DEFAULTS.DEFAULT_STATUS_BADGE
}

/**
 * Lấy nhãn trạng thái vòng đời sản phẩm
 */
export const getProductLifecycleStatusLabel = (status) => {
    return PRODUCT_LIFECYCLE_STATUS_LABELS[status] || status || 'Không rõ'
}

/**
 * Sắp xếp sản phẩm đã bán xuống cuối danh sách
 */
export const sortInstancesBySoldLast = (list = []) => {
    return [...list].sort((a, b) => {
        const aSold = a?.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.SOLD
        const bSold = b?.lifecycleStatus === PRODUCT_LIFECYCLE_STATUSES.SOLD
        if (aSold === bSold) return 0
        return aSold ? 1 : -1
    })
}

/**
 * Định dạng ngày giờ
 */
export const formatDateTime = (value) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'N/A'
    return parsed.toLocaleString('vi-VN')
}

/**
 * Chuyển đổi ngày thành input value (YYYY-MM-DD)
 */
export const toDateInputValue = (value) => {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
}

/**
 * Cộng ngày
 */
export const addDays = (value, days) => {
    const date = new Date(value)
    date.setDate(date.getDate() + days)
    return date
}

/**
 * Tính phần trăm thay đổi
 */
export const calculatePercentChange = (current, previous) => {
    const cur = Number(current || 0)
    const prev = Number(previous || 0)
    if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return 0
    return Number((((cur - prev) / prev) * 100).toFixed(1))
}

/**
 * Lấy tên khách hàng từ đơn hàng
 */
export const getCustomerName = (order, orderType = 'sale') => {
    if (orderType === 'sale') {
        return order?.customerId?.name || order?.guestName || 'Khách vãng lai'
    }
    return order?.customerId?.name || 'Khách thuê'
}

/**
 * Lấy số điện thoại khách hàng
 */
export const getCustomerPhone = (order, orderType = 'sale') => {
    if (orderType === 'sale') {
        return order?.shippingPhone || order?.customerId?.phone || 'N/A'
    }
    return order?.customerId?.phone || 'N/A'
}

/**
 * Lấy tên sản phẩm chính trong đơn hàng
 */
export const getPrimaryItemName = (order, orderType = 'sale') => {
    const items = toArray(order?.items)
    if (items.length === 0) return 'Không có sản phẩm'

    const firstName = orderType === 'sale'
        ? (items[0]?.productId?.name || 'Sản phẩm')
        : (items[0]?.productInstanceId?.productId?.name || 'Sản phẩm thuê')

    return items.length > 1 ? `${firstName} +${items.length - 1}` : firstName
}

/**
 * Lấy giá trị tiền tệ từ đơn hàng
 */
export const getOrderAmount = (order) => Number(order?.totalAmount || 0)

/**
 * Kiểm tra đơn hàng có trạng thái chờ xử lý
 */
export const isOrderPending = (status, orderType = 'sale') => {
    if (orderType === 'sale') {
        return status === SALE_ORDER_STATUSES.PENDING_CONFIRMATION
    }
    return [
        RENT_ORDER_STATUSES.PENDING_DEPOSIT,
        RENT_ORDER_STATUSES.DEPOSITED,
        RENT_ORDER_STATUSES.CONFIRMED,
        RENT_ORDER_STATUSES.WAITING_PICKUP
    ].includes(status)
}

/**
 * Kiểm tra đơn hàng đã hoàn thành
 */
export const isOrderCompleted = (status, orderType = 'sale') => {
    if (orderType === 'sale') {
        return status === SALE_ORDER_STATUSES.COMPLETED
    }
    return status === RENT_ORDER_STATUSES.COMPLETED
}

/**
 * Lấy hình ảnh sản phẩm từ item trong đơn hàng
 */
export const getProductImage = (item, orderType = 'sale') => {
    if (orderType === 'sale') {
        const images = item?.productId?.images
        return Array.isArray(images) && images.length > 0 ? images[0] : ''
    }

    const images = item?.productInstanceId?.productId?.images
    return Array.isArray(images) && images.length > 0 ? images[0] : ''
}

/**
 * Lấy kích thước hiển thị từ sản phẩm
 */
export const getDisplaySizes = (product = {}) => {
    const fromStock = Array.isArray(product?.sizeStock)
        ? product.sizeStock
            .filter((row) => row && Number(row.quantity || 0) > 0)
            .map((row) => toDisplayText(row.size))
            .filter(Boolean)
        : []

    if (fromStock.length > 0) {
        return [...new Set(fromStock)].join(', ')
    }

    const fromSizes = toArray(product?.sizes)
        .map((item) => toDisplayText(typeof item === 'object' ? item?.size : item))
        .filter(Boolean)

    if (fromSizes.length > 0) {
        return [...new Set(fromSizes)].join(', ')
    }

    const fromOptions = toArray(product?.sizeOptions)
        .map((item) => toDisplayText(item))
        .filter(Boolean)

    if (fromOptions.length > 0) {
        return [...new Set(fromOptions)].join(', ')
    }

    const singleSize = toDisplayText(product?.size)
    return singleSize || 'Không có'
}
