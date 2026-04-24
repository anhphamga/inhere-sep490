export const ACTIVE_SHIFT_STORAGE_KEY = 'inhere_active_shift'

export const getStoredActiveShiftId = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return String(parsed?.shiftId || '').trim()
  } catch {
    return ''
  }
}

export const setStoredActiveShiftId = (shiftId) => {
  const id = String(shiftId || '').trim()
  if (!id) return
  try {
    localStorage.setItem(ACTIVE_SHIFT_STORAGE_KEY, JSON.stringify({ shiftId: id, updatedAt: new Date().toISOString() }))
  } catch {
    // ignore storage errors
  }
}

export const clearStoredActiveShift = () => {
  try {
    localStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

// Detect current active approved shift for staff (checked-in but not checked-out).
export const getCurrentApprovedShift = (shifts = [], myRegistrationByShiftId = {}) => {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  for (const shift of shifts) {
    const shiftId = String(shift?._id || '')
    if (!shiftId) continue
    const reg = myRegistrationByShiftId[shiftId]
    if (!reg) continue
    if (String(reg?.status || '').toUpperCase() !== 'APPROVED') continue
    if (!reg?.checkInAt || reg?.checkOutAt) continue

    const shiftDate = shift?.date ? new Date(shift.date) : null
    if (!shiftDate || Number.isNaN(shiftDate.getTime())) continue
    shiftDate.setHours(0, 0, 0, 0)
    if (shiftDate.getTime() !== today.getTime()) continue

    return { shift, registration: reg }
  }

  return null
}

