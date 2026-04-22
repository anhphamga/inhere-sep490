import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const RentalCartContext = createContext(null)

const STORAGE_KEY = 'inhere_rental_cart'

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
    // ignore
  }
}

export const RentalCartProvider = ({ children }) => {
  const [items, setItems] = useState(getStoredCart)

  const addItem = useCallback((product, variant) => {
    const rq = Number(product?.rentableQuantity)
    const rentable = Number.isFinite(rq) ? rq : Number(product?.availableQuantity || 0)
    if (rentable <= 0) {
      return
    }
    if (Number(variant?.rentPrice || 0) <= 0) {
      return
    }
    const hasSizes = Boolean(product?.hasSizes) || (Array.isArray(product?.sizes) && product.sizes.length > 0)
    const normalizedSize = hasSizes ? (variant?.size || 'FREE SIZE') : ''

    const newItem = {
      id: `${product._id}_${variant.color || 'default'}_${normalizedSize || 'nosize'}_${Date.now()}`,
      productId: product._id,
      productInstanceId: variant.productInstanceId || null,
      name: product.name,
      image: variant.image || product.images?.[0] || product.imageUrl || '',
      color: variant.color || 'Default',
      size: normalizedSize,
      hasSizes,
      rentPrice: variant.rentPrice,
      baseSalePrice: product.baseSalePrice,
      rentStartDate: variant.rentStartDate || null,
      rentEndDate: variant.rentEndDate || null
    }

    setItems(prev => {
      // Kiểm tra xem sản phẩm đã có trong giỏ chưa
      const existingIndex = prev.findIndex(
        item => item.productId === newItem.productId && 
                item.color === newItem.color && 
                item.size === newItem.size
      )

      if (existingIndex >= 0) {
        return prev // Đã có rồi, không thêm
      }

      const newItems = [...prev, newItem]
      saveCart(newItems)
      return newItems
    })
  }, [])

  const removeItem = useCallback((itemId) => {
    setItems(prev => {
      const newItems = prev.filter(item => item.id !== itemId)
      saveCart(newItems)
      return newItems
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    saveCart([])
  }, [])

  const itemCount = useMemo(() => items.length, [items])

  const value = useMemo(() => ({
    items,
    addItem,
    removeItem,
    clearCart,
    itemCount
  }), [items, addItem, removeItem, clearCart, itemCount])

  return (
    <RentalCartContext.Provider value={value}>
      {children}
    </RentalCartContext.Provider>
  )
}

export const useRentalCart = () => {
  const context = useContext(RentalCartContext)
  if (!context) {
    throw new Error('useRentalCart must be used inside RentalCartProvider')
  }
  return context
}
