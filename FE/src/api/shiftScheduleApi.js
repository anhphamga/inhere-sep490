import axiosClient from '../config/axios'

const asText = (value) => String(value || '').trim()

const normalizeDateParam = (value) => {
  if (!value) return ''
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const text = asText(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const normalizePagination = (params = {}) => {
  const next = { ...params }
  const limit = Number(next.limit)
  const page = Number(next.page)
  if (Number.isFinite(limit) && limit > 0) next.limit = limit
  else delete next.limit
  if (Number.isFinite(page) && page > 0) next.page = page
  else delete next.page
  return next
}

export const getShiftSchedules = (params = {}) => {
  const normalized = normalizePagination(params)
  const date = normalizeDateParam(normalized.date)
  if (date) normalized.date = date
  else delete normalized.date
  return axiosClient.get('/shifts', { params: normalized })
}

export const createShiftSchedule = (payload = {}) => {
  return axiosClient.post('/shifts', payload)
}

export const registerShiftSchedule = (payload = {}) => {
  return axiosClient.post('/shifts/register', payload)
}

export const approveShiftRegistration = (payload = {}) => {
  return axiosClient.post('/shifts/approve', { ...payload, status: 'APPROVED' })
}

export const rejectShiftRegistration = (payload = {}) => {
  return axiosClient.post('/shifts/approve', { ...payload, status: 'REJECTED' })
}

export const checkInShiftRegistration = (payload = {}) => {
  return axiosClient.post('/shifts/check-in', payload)
}

export const checkOutShiftRegistration = (payload = {}) => {
  return axiosClient.post('/shifts/check-out', payload)
}

export const undoCheckoutShiftRegistration = (payload = {}) => {
  return axiosClient.post('/shifts/undo-checkout', payload)
}

// Phase 2 integration helpers (minimal extra endpoints)
export const getShiftRegistrationsByShiftId = (shiftId) => {
  const id = asText(shiftId)
  return axiosClient.get(`/shifts/${id}/registrations`)
}

export const getMyShiftRegistrations = (params = {}) => {
  const normalized = normalizePagination(params)
  const date = normalizeDateParam(normalized.date)
  if (date) normalized.date = date
  else delete normalized.date
  return axiosClient.get('/shifts/my-registrations', { params: normalized })
}

// Phase 2.5: active shift + close shift
export const getCurrentShift = () => {
  return axiosClient.get('/shifts/current')
}

export const closeShiftSchedule = (shiftId) => {
  const id = asText(shiftId)
  return axiosClient.post(`/shifts/${id}/close`)
}
