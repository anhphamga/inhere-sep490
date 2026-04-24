import axiosClient from '../config/axios'

const asText = (value) => String(value || '').trim()

const normalizeDateParam = (value) => {
  const text = asText(value)
  return text
}

const normalizeParams = (params = {}) => {
  const next = { ...params }
  const startDate = normalizeDateParam(next.startDate)
  const endDate = normalizeDateParam(next.endDate)
  if (startDate) next.startDate = startDate
  else delete next.startDate
  if (endDate) next.endDate = endDate
  else delete next.endDate
  if (next.groupBy) next.groupBy = asText(next.groupBy)
  if (next.metric) next.metric = asText(next.metric)
  return next
}

export const getShiftAnalyticsOverview = (params = {}) => {
  return axiosClient.get('/shift-analytics/overview', { params: normalizeParams(params) })
}

export const getShiftRevenueByShift = (params = {}) => {
  return axiosClient.get('/shift-analytics/revenue-by-shift', { params: normalizeParams(params) })
}

export const getShiftStaffPerformance = (params = {}) => {
  return axiosClient.get('/shift-analytics/staff-performance', { params: normalizeParams(params) })
}

export const getShiftPeakShifts = (params = {}) => {
  return axiosClient.get('/shift-analytics/peak-shifts', { params: normalizeParams(params) })
}

export const getShiftDailySummary = (params = {}) => {
  return axiosClient.get('/shift-analytics/daily-summary', { params: normalizeParams(params) })
}

