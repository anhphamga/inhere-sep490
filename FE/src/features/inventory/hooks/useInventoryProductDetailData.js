import { useCallback, useState } from 'react'
import { getInventoryProductDetailApi, getInventoryProductInstancesApi } from '../api/inventory.api'
import { normalizeInstances, toDisplayText, toSafeNumber } from '../utils/inventory.transformers'

export const useInventoryProductDetailData = (productId) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [instances, setInstances] = useState([])
  const [productDefaults, setProductDefaults] = useState({ baseRentPrice: 0, baseSalePrice: 0 })
  const [product, setProduct] = useState({
    name: 'Sản phẩm',
    image: '/placeholder.png'
  })

  const loadData = useCallback(async () => {
    if (!productId) return

    try {
      setLoading(true)
      setError('')

      const [productRes, instanceRes] = await Promise.allSettled([
        getInventoryProductDetailApi(productId),
        getInventoryProductInstancesApi(productId, { includeSold: true, limit: 500 })
      ])

      const productData = productRes.status === 'fulfilled'
        ? (productRes.value?.data?.product || productRes.value?.product || {})
        : {}

      const defaults = {
        baseRentPrice: toSafeNumber(productData?.baseRentPrice, 0),
        baseSalePrice: toSafeNumber(productData?.baseSalePrice, 0)
      }
      setProductDefaults(defaults)

      setProduct({
        name: toDisplayText(productData?.name) || 'Sản phẩm',
        image: productData?.images?.[0] || '/placeholder.png'
      })

      const instanceData = instanceRes.status === 'fulfilled' ? instanceRes.value : {}
      setInstances(normalizeInstances(instanceData, defaults))

      if (productRes.status === 'rejected' || instanceRes.status === 'rejected') {
        setError('Một phần dữ liệu chưa tải đầy đủ.')
      }
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không thể tải dữ liệu sản phẩm.')
      setInstances([])
    } finally {
      setLoading(false)
    }
  }, [productId])

  return {
    loading,
    error,
    instances,
    setInstances,
    product,
    productDefaults,
    reload: loadData
  }
}
