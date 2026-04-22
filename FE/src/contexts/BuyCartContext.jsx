import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const BuyCartContext = createContext(null)

const STORAGE_KEY = 'inhere_buy_cart'

const getStoredCart = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const saveCart = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export const BuyCartProvider = ({ children }) => {
  const [items, setItems] = useState(getStoredCart)

  const addItem = useCallback((product, variant = {}) => {
    if (Number(product?.availableQuantity || 0) <= 0) {
      return
    }
    const price = Number(variant.salePrice ?? product.baseSalePrice ?? 0)
    const quantity = Math.max(Number(variant.quantity || 1), 1)

    const conditionLevel = variant.conditionLevel === 'Used' ? 'Used' : 'New'

    const hasSizes = Boolean(product?.hasSizes) || (Array.isArray(product?.sizes) && product.sizes.length > 0)
    const normalizedSize = hasSizes ? (variant.size || 'FREE SIZE') : ''

    const newItem = {
      id: `${product._id}_${variant.color || 'default'}_${normalizedSize || 'nosize'}_${conditionLevel}`,
      productId: product._id,
      productInstanceId: variant.productInstanceId || null,
      name: product.name,
      image: variant.image || product.images?.[0] || product.imageUrl || '',
      color: variant.color || 'Default',
      size: normalizedSize,
      hasSizes,
      salePrice: price,
      quantity,
      conditionLevel,
      conditionScore: Number(variant.conditionScore ?? 100),
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (newItem.productInstanceId || item.productInstanceId) {
          return Boolean(newItem.productInstanceId) && item.productInstanceId === newItem.productInstanceId
        }
        return (
          item.productId === newItem.productId &&
          item.color === newItem.color &&
          item.size === newItem.size &&
          item.conditionLevel === newItem.conditionLevel
        )
      })

      if (existingIndex >= 0) {
        const nextItems = [...prev]
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: newItem.productInstanceId
            ? 1
            : nextItems[existingIndex].quantity + quantity
        }
        saveCart(nextItems)
        return nextItems
      }

      const nextItems = [...prev, newItem]
      saveCart(nextItems)
      return nextItems
    })
  }, [])

  const updateQuantity = useCallback((itemId, quantity) => {
    const normalizedQuantity = Math.max(Number(quantity || 1), 1)
    setItems((prev) => {
      const nextItems = prev.map((item) =>
        item.id === itemId ? { ...item, quantity: normalizedQuantity } : item
      )
      saveCart(nextItems)
      return nextItems
    })
  }, [])

  const removeItem = useCallback((itemId) => {
    setItems((prev) => {
      const nextItems = prev.filter((item) => item.id !== itemId)
      saveCart(nextItems)
      return nextItems
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    saveCart([])
  }, [])

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  )

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.salePrice || 0) * Number(item.quantity || 0), 0),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      totalAmount
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, itemCount, totalAmount]
  )

  return <BuyCartContext.Provider value={value}>{children}</BuyCartContext.Provider>
}

export const useBuyCart = () => {
  const context = useContext(BuyCartContext)
  if (!context) {
    throw new Error('useBuyCart must be used inside BuyCartProvider')
  }

  return context
}
