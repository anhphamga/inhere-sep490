import { INSTANCE_STATUS_ORDER } from '../config/inventory.constants'

export const toDisplayText = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  if (Array.isArray(value)) return value.map((item) => toDisplayText(item)).find(Boolean) || ''
  if (typeof value === 'object') return String(value.vi || value.en || value.name || value.label || '').trim()
  return ''
}

export const toSafeNumber = (value, fallback = NaN) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const normalizeLifecycleStatus = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return 'Unknown'

  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  if (['available', 'cosan', 'instock'].includes(key)) return 'Available'
  if (['rented', 'dangthue', 'renting'].includes(key)) return 'Rented'
  if (['reserved', 'dadat', 'giucho'].includes(key)) return 'Reserved'
  if (['washing', 'danggiat', 'laundry'].includes(key)) return 'Washing'
  if (['repair', 'hong', 'damaged', 'broken'].includes(key)) return 'Repair'
  if (['lost', 'mat'].includes(key)) return 'Lost'
  if (['sold', 'daban'].includes(key)) return 'Sold'
  if (['unknown', 'khongro', 'na', 'none', 'null'].includes(key)) return 'Unknown'

  return 'Unknown'
}

export const resolveConditionScore = (item) => {
  const direct = toSafeNumber(item?.conditionScore ?? item?.condition ?? item?.score)
  if (Number.isFinite(direct)) return direct

  const level = String(item?.conditionLevel || item?.level || '').trim().toLowerCase()
  if (level === 'new' || level === 'good') return 100
  if (level === 'used') return 75
  if (level === 'damaged') return 50
  return null
}

export const toConditionLevel = (score) => {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'New'
  return value >= 75 ? 'New' : 'Used'
}

export const getConditionLabel = (score) => {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'Không rõ'
  if (value >= 100) return `Mới (${value}%)`
  if (value >= 75) return `Tình trạng tốt (${value}%)`
  if (value >= 50) return `Trung bình (${value}%)`
  return `Tình trạng tốt (${value}%)`
}

export const getConditionClass = (score) => {
  const value = Number(score)
  if (!Number.isFinite(value)) return 'bg-slate-100 text-slate-700'
  if (value >= 100) return 'bg-emerald-100 text-emerald-700'
  if (value >= 75) return 'bg-sky-100 text-sky-700'
  if (value >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

export const normalizeSizeStock = (product, toArray) => {
  const rows = Array.isArray(product?.sizeStock) ? product.sizeStock : []
  const normalizedRows = rows
    .map((row) => ({
      size: toDisplayText(row?.size),
      quantity: Number(row?.quantity || 0),
      available: Number(row?.available ?? row?.quantity ?? 0),
      reserved: Number(row?.reserved || 0),
      renting: Number(row?.renting || 0),
      other: Number(row?.other || 0),
    }))
    .filter((row) => row.size)

  if (normalizedRows.length > 0) {
    const totalStock = normalizedRows.reduce((sum, item) => sum + item.quantity, 0)
    const totalAvailable = normalizedRows.reduce((sum, item) => sum + item.available, 0)
    const totalReserved = normalizedRows.reduce((sum, item) => sum + item.reserved, 0)
    const totalRenting = normalizedRows.reduce((sum, item) => sum + item.renting, 0)
    return {
      rows: normalizedRows,
      totalStock,
      totalAvailable,
      totalReserved,
      totalRenting,
      sizeText: normalizedRows.map((item) => `${item.size}: ${item.quantity}`).join(' | '),
      sizeAvailableText: normalizedRows
        .filter((r) => r.available > 0)
        .map((item) => `${item.size}: ${item.available}`)
        .join(' | ') || '—',
    }
  }

  return {
    // No fallback: inventory size/stock must come from ProductInstance-derived `sizeStock`.
    rows: [],
    totalStock: 0,
    totalAvailable: 0,
    totalReserved: 0,
    totalRenting: 0,
    sizeText: '—',
    sizeAvailableText: '—',
  }
}

export const normalizeInstances = (payload, defaults = {}) => {
  const rawRows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.instances)
      ? payload.instances
      : Array.isArray(payload)
        ? payload
        : []

  return rawRows.map((item) => {
    const lifecycleStatus = normalizeLifecycleStatus(item?.lifecycleStatus || item?.status)
    const conditionScore = resolveConditionScore(item)
    const rawRentPrice = toSafeNumber(item?.currentRentPrice ?? item?.rentPrice)
    const rawSalePrice = toSafeNumber(item?.currentSalePrice ?? item?.salePrice)

    return {
      id: String(item?._id || item?.id || ''),
      size: toDisplayText(item?.size) || 'Không rõ',
      lifecycleStatus,
      conditionScore,
      currentRentPrice: Number.isFinite(rawRentPrice) && rawRentPrice > 0 ? rawRentPrice : Number(defaults.baseRentPrice || 0),
      currentSalePrice: Number.isFinite(rawSalePrice) && rawSalePrice > 0 ? rawSalePrice : Number(defaults.baseSalePrice || 0),
      note: toDisplayText(item?.note)
    }
  })
}

export const sortInstancesByStatusAndSize = (instances) => {
  return [...instances].sort((a, b) => {
    const aOrder = INSTANCE_STATUS_ORDER[a.lifecycleStatus] || 99
    const bOrder = INSTANCE_STATUS_ORDER[b.lifecycleStatus] || 99
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.size.localeCompare(b.size)
  })
}
