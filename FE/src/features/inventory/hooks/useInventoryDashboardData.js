import { useCallback, useEffect, useState } from 'react'
import { UI_IMAGE_FALLBACKS } from '../../../constants/ui'
import { LOW_STOCK_THRESHOLD } from '../config/inventory.constants'
import { getInventoryDashboardBundleApi } from '../api/inventory.api'
import { normalizeSizeStock, toDisplayText } from '../utils/inventory.transformers'
import { toArray } from '../../../utils/owner.utils'

const addDays = (date, amount) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

const toDateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const useInventoryDashboardData = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const now = new Date()
      const from = toDateKey(addDays(now, -6))
      const to = toDateKey(now)
      const [productsRes, topRes, alertsRes, dashboardRes] = await getInventoryDashboardBundleApi({ from, to })

      const productsData = productsRes.status === 'fulfilled' ? toArray(productsRes.value?.data) : []
      const topData = topRes.status === 'fulfilled' ? (topRes.value?.data || topRes.value || {}) : {}
      const alertsData = alertsRes.status === 'fulfilled' ? (alertsRes.value?.data || alertsRes.value || {}) : {}

      const lowStockIds = new Set(toArray(alertsData.lowStock).map((item) => String(item?.productId || '')))
      const outOfStockIds = new Set(toArray(alertsData.outOfStock).map((item) => String(item?.productId || '')))

      const saleMap = new Map()
      toArray(topData?.topSaleProducts).forEach((item) => {
        saleMap.set(String(item?.productId || ''), Number(item?.totalSold || 0))
      })

      const rentMap = new Map()
      toArray(topData?.topRentProducts).forEach((item) => {
        rentMap.set(String(item?.productId || ''), Number(item?.totalRented || 0))
      })

      const normalizedRows = productsData.map((product) => {
        const id = String(product?._id || product?.id || '')
        const name = toDisplayText(product?.name) || 'Sản phẩm chưa đặt tên'
        const category = toDisplayText(product?.category) || 'Chưa phân loại'
        const { rows: sizeRows, totalStock, totalAvailable, totalReserved, totalRenting, sizeText, sizeAvailableText } = normalizeSizeStock(product, toArray)

        const soldSale = saleMap.get(id) || 0
        const soldRent = rentMap.get(id) || 0
        const soldTotal = soldSale + soldRent
        const soldPerDay = soldTotal > 0 ? soldTotal / 7 : 0

        let status = 'stable'
        let statusLabel = 'Ổn định'
        let insightType = 'onDinh'
        let insightLabel = 'Ổn định'

        if (totalAvailable === 0 || outOfStockIds.has(id)) {
          status = 'out'
          statusLabel = totalStock > 0 ? 'Hết hàng có sẵn' : 'Hết hàng'
          insightType = 'hetHang'
          insightLabel = totalStock > 0 ? 'Hết có sẵn' : 'Hết hàng'
        } else if (totalAvailable <= LOW_STOCK_THRESHOLD || lowStockIds.has(id)) {
          status = 'low'
          statusLabel = 'Sắp hết hàng'
          insightType = 'sapHet'
          insightLabel = 'Sắp hết'
        } else if (soldTotal >= 3) {
          status = 'hot'
          statusLabel = 'Bán chạy'
          insightType = 'banChay'
          insightLabel = 'Bán chạy'
        }

        if (soldTotal === 0 && totalAvailable > 6) {
          insightType = 'tonLau'
          insightLabel = 'Tồn lâu'
        }

        let prediction = 'Ổn định'
        if (totalAvailable === 0) {
          prediction = totalStock > 0 ? 'Hết hàng có sẵn' : 'Đã hết hàng'
        } else if (soldPerDay > 0) {
          const remainingDays = Math.max(1, Math.ceil(totalAvailable / soldPerDay))
          prediction = remainingDays <= 3 ? `Hết trong ${remainingDays} ngày` : `Dự kiến còn ${remainingDays} ngày`
        }

        const trend = soldPerDay > 0
          ? (totalAvailable <= LOW_STOCK_THRESHOLD ? 'Giảm nhanh' : 'Giảm nhẹ')
          : 'Ổn định'

        return {
          id,
          image: product?.images?.[0] || UI_IMAGE_FALLBACKS.ownerProductCard,
          name,
          category,
          sizeRows,
          sizeText,
          sizeAvailableText,
          stock: totalStock,
          totalAvailable,
          totalReserved,
          totalRenting,
          soldTotal,
          soldPerDay,
          status,
          statusLabel,
          insightType,
          insightLabel,
          prediction,
          trend
        }
      })

      setRows(normalizedRows)

      if ([productsRes, topRes, alertsRes, dashboardRes].some((item) => item.status === 'rejected')) {
        setError('Một phần dữ liệu chưa tải đầy đủ, hệ thống đang hiển thị phần khả dụng.')
      }
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải dữ liệu kho.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    rows,
    loading,
    error,
    reload: loadData
  }
}
