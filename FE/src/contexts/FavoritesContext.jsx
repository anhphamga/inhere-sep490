import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const FavoritesContext = createContext(null)

const getUserFavoriteKey = (user) => {
  const userId = String(user?._id || user?.id || user?.email || '').trim().toLowerCase()
  if (!userId) return ''
  return `inhere_favorites_${userId}`
}

const toSafeItem = (item = {}) => {
  const id = String(item.id || item._id || '').trim()
  if (!id) return null

  return {
    id,
    name: String(item.name || '').trim(),
    imageUrl: String(item.imageUrl || '').trim(),
    price: Number(item.price || 0),
    addedAt: item.addedAt || new Date().toISOString(),
  }
}

export const FavoritesProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [favoriteItems, setFavoriteItems] = useState([])

  const storageKey = useMemo(() => getUserFavoriteKey(user), [user])

  useEffect(() => {
    if (!isAuthenticated || !storageKey) {
      setFavoriteItems([])
      return
    }

    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) {
        setFavoriteItems([])
        return
      }
      const parsed = JSON.parse(raw)
      const safeList = Array.isArray(parsed)
        ? parsed.map((item) => toSafeItem(item)).filter(Boolean)
        : []
      setFavoriteItems(safeList)
    } catch {
      setFavoriteItems([])
    }
  }, [isAuthenticated, storageKey])

  const persist = useCallback((nextItems) => {
    setFavoriteItems(nextItems)
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(nextItems))
    }
  }, [storageKey])

  const isFavorite = useCallback((productId) => {
    const id = String(productId || '').trim()
    if (!id) return false
    return favoriteItems.some((item) => item.id === id)
  }, [favoriteItems])

  const addFavorite = useCallback((product) => {
    if (!isAuthenticated || !storageKey) {
      return { ok: false, reason: 'AUTH_REQUIRED' }
    }

    const safeItem = toSafeItem(product)
    if (!safeItem) {
      return { ok: false, reason: 'INVALID_PRODUCT' }
    }

    if (favoriteItems.some((item) => item.id === safeItem.id)) {
      return { ok: true, added: false, exists: true }
    }

    persist([safeItem, ...favoriteItems])
    return { ok: true, added: true }
  }, [favoriteItems, isAuthenticated, persist, storageKey])

  const removeFavorite = useCallback((productId) => {
    if (!isAuthenticated || !storageKey) {
      return { ok: false, reason: 'AUTH_REQUIRED' }
    }

    const id = String(productId || '').trim()
    if (!id) {
      return { ok: false, reason: 'INVALID_PRODUCT' }
    }

    const nextItems = favoriteItems.filter((item) => item.id !== id)
    persist(nextItems)
    return { ok: true, removed: true }
  }, [favoriteItems, isAuthenticated, persist, storageKey])

  const toggleFavorite = useCallback((product) => {
    const id = String(product?.id || product?._id || '').trim()
    if (!id) return { ok: false, reason: 'INVALID_PRODUCT' }

    if (isFavorite(id)) {
      const result = removeFavorite(id)
      return { ...result, added: false }
    }

    const result = addFavorite(product)
    return { ...result, added: true }
  }, [addFavorite, isFavorite, removeFavorite])

  const value = useMemo(() => ({
    favoriteItems,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  }), [favoriteItems, isFavorite, addFavorite, removeFavorite, toggleFavorite])

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used inside FavoritesProvider')
  }
  return context
}

