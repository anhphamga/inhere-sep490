import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getShiftAnalyticsOverview,
  getShiftDailySummary,
  getShiftPeakShifts,
  getShiftRevenueByShift,
  getShiftStaffPerformance,
} from '../api/shiftAnalyticsApi'

const toDateInputValue = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaultRange = () => {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) }
}

const extractApiMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback
}

export const useShiftAnalytics = (options = {}) => {
  const initial = options.initialRange || defaultRange()

  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate)

  const [overview, setOverview] = useState(null)
  const [revenueByShift, setRevenueByShift] = useState([])
  const [staffPerformance, setStaffPerformance] = useState([])
  const [peakShifts, setPeakShifts] = useState([])
  const [dailySummary, setDailySummary] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const filters = useMemo(() => ({ startDate, endDate }), [startDate, endDate])

  const validateRange = useCallback(() => {
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      return 'Vui lòng chọn ngày hợp lệ.'
    }
    s.setHours(0, 0, 0, 0)
    e.setHours(0, 0, 0, 0)
    if (s.getTime() > e.getTime()) {
      return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'
    }
    return ''
  }, [startDate, endDate])

  const refresh = useCallback(async () => {
    const validationError = validateRange()
    if (validationError) {
      setError(validationError)
      return null
    }

    try {
      setLoading(true)
      setError('')
      const params = { startDate, endDate }
      const [
        overviewRes,
        revenueRes,
        staffRes,
        peakRes,
        dailyRes,
      ] = await Promise.all([
        getShiftAnalyticsOverview(params),
        getShiftRevenueByShift(params),
        getShiftStaffPerformance(params),
        getShiftPeakShifts({ ...params, metric: 'revenue' }),
        getShiftDailySummary(params),
      ])

      const o = overviewRes?.data?.data ?? null
      const r = revenueRes?.data?.data ?? []
      const s = staffRes?.data?.data ?? []
      const p = peakRes?.data?.data ?? []
      const d = dailyRes?.data?.data ?? []

      if (!mountedRef.current) return null
      setOverview(o)
      setRevenueByShift(Array.isArray(r) ? r : [])
      setStaffPerformance(Array.isArray(s) ? s : [])
      setPeakShifts(Array.isArray(p) ? p : [])
      setDailySummary(Array.isArray(d) ? d : [])
      return { overview: o, revenueByShift: r, staffPerformance: s, peakShifts: p, dailySummary: d }
    } catch (apiError) {
      if (!mountedRef.current) return null
      setOverview(null)
      setRevenueByShift([])
      setStaffPerformance([])
      setPeakShifts([])
      setDailySummary([])
      setError(extractApiMessage(apiError, 'Không thể tải báo cáo ca làm.'))
      return null
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [endDate, startDate, validateRange])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    filters,
    overview,
    revenueByShift,
    staffPerformance,
    peakShifts,
    dailySummary,
    loading,
    error,
    refresh,
  }
}

