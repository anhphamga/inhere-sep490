import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  getMyFavorites as getMyFavoritesApi,
  toggleFavorite as toggleFavoriteApi,
} from '../services/favoriteApi'

const FavoritesContext = createContext(null)

const normalizeProductName = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  return String(value?.vi || value?.en || '').trim()
}

const resolveImageUrl = (product = {}) => {
  if (product?.imageUrl) return String(product.imageUrl)
  if (Array.isArray(product?.images) && product.images.length > 0) return String(product.images[0] || '')
  if (Array.isArray(product?.colorVariants) && product.colorVariants[0]?.images?.[0]) {
    return String(product.colorVariants[0].images[0] || '')
  }
  return ''
}

const resolvePrice = (product = {}) => {
  const sale = Number(product?.baseSalePrice || 0)
  if (sale > 0) return sale
  return Number(product?.baseRentPrice || 0)
}

const mapFavoriteDocToItem = (row = {}) => {
  const product = row?.product || {}
  const productId = String(product?._id || row?.productId || row?.product || '').trim()
  if (!productId) return null

  return {
    id: productId,
    favoriteId: String(row?._id || '').trim(),
    name: normalizeProductName(product?.name || row?.name),
    imageUrl: resolveImageUrl(product),
    price: resolvePrice(product),
    addedAt: row?.createdAt || new Date().toISOString(),
    product,
  }
}

const mapProductToFavoriteItem = (product = {}) => {
  const id = String(product?._id || product?.id || '').trim()
  if (!id) return null
  return {
    id,
    favoriteId: '',
    name: normalizeProductName(product?.name),
    imageUrl: resolveImageUrl(product),
    price: resolvePrice(product),
    addedAt: new Date().toISOString(),
    product,
  }
}

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [favoriteMap, setFavoriteMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingIds, setPendingIds] = useState({})

  const resetState = useCallback(() => {
    setFavoriteMap({})
    setLoading(false)
    setError('')
    setPendingIds({})
  }, [])

  const hydrateFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      resetState()
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await getMyFavoritesApi(1, 100)
      const rows = Array.isArray(response?.data) ? response.data : []
      const nextMap = rows.reduce((acc, row) => {
        const item = mapFavoriteDocToItem(row)
        if (!item) return acc
        acc[item.id] = item
        return acc
      }, {})
      setFavoriteMap(nextMap)
    } catch (apiError) {
      setFavoriteMap({})
      setError(apiError?.response?.data?.message || 'Không thể tải danh sách yêu thích')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, resetState])

  useEffect(() => {
    hydrateFavorites()
  }, [hydrateFavorites, user?._id, user?.id])

  const markPending = useCallback((productId, value) => {
    setPendingIds((prev) => {
      if (value) return { ...prev, [productId]: true }
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (productId) => {
      const id = String(productId || '').trim()
      if (!id) return false
      return Boolean(favoriteMap[id])
    },
    [favoriteMap]
  )

  const isFavoriteLoading = useCallback(
    (productId) => {
      const id = String(productId || '').trim()
      if (!id) return false
      return Boolean(pendingIds[id])
    },
    [pendingIds]
  )

  const toggleFavorite = useCallback(
    async (product) => {
      const id = String(product?._id || product?.id || '').trim()
      if (!id) return { ok: false, reason: 'INVALID_PRODUCT' }
      if (!isAuthenticated) return { ok: false, reason: 'AUTH_REQUIRED' }
      if (pendingIds[id]) return { ok: false, reason: 'PENDING' }

      const previousMap = favoriteMap
      const currentlyFavorite = Boolean(previousMap[id])
      const fallbackItem = mapProductToFavoriteItem(product)
      const nextMap = { ...previousMap }

      if (currentlyFavorite) {
        delete nextMap[id]
      } else if (fallbackItem) {
        nextMap[id] = fallbackItem
      }

      setFavoriteMap(nextMap)
      markPending(id, true)

      try {
        const response = await toggleFavoriteApi(id)
        const isNowFavorite = Boolean(response?.data?.isFavorite)

        return { ok: true, added: isNowFavorite }
      } catch (apiError) {
        setFavoriteMap(previousMap)
        return {
          ok: false,
          reason: 'API_ERROR',
          message: apiError?.response?.data?.message || 'Không thể cập nhật yêu thích',
        }
      } finally {
        markPending(id, false)
      }
    },
    [favoriteMap, isAuthenticated, markPending, pendingIds]
  )

  const removeFavorite = useCallback(
    async (productId) => {
      const id = String(productId || '').trim()
      if (!id) return { ok: false, reason: 'INVALID_PRODUCT' }
      if (!isFavorite(id)) return { ok: true, removed: false }
      const result = await toggleFavorite({ id })
      return { ...result, removed: Boolean(result?.ok) }
    },
    [isFavorite, toggleFavorite]
  )

  const addFavorite = useCallback(
    async (product) => {
      const id = String(product?._id || product?.id || '').trim()
      if (!id) return { ok: false, reason: 'INVALID_PRODUCT' }
      if (isFavorite(id)) return { ok: true, added: false, exists: true }
      return toggleFavorite(product)
    },
    [isFavorite, toggleFavorite]
  )

  const favoriteItems = useMemo(() => {
    return Object.values(favoriteMap).sort(
      (a, b) => new Date(b?.addedAt || 0).getTime() - new Date(a?.addedAt || 0).getTime()
    )
  }, [favoriteMap])

  const value = useMemo(
    () => ({
      favoriteItems,
      loading,
      error,
      isFavorite,
      isFavoriteLoading,
      hydrateFavorites,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }),
    [favoriteItems, loading, error, isFavorite, isFavoriteLoading, hydrateFavorites, addFavorite, removeFavorite, toggleFavorite]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used inside FavoritesProvider')
  }
  return context
}
