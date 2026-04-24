import { useEffect, useState } from 'react'
import { getShiftStaffPerformance } from '../api/shiftAnalyticsApi'

const DEFAULT_THRESHOLD = 2000 // đồng/giờ - threshold for "🔥 Hiệu suất cao"

/**
 * Hook to fetch and manage staff performance data
 * @param {Object} options - Configuration options
 * @param {string} options.startDate - Start date (YYYY-MM-DD)
 * @param {string} options.endDate - End date (YYYY-MM-DD)
 * @param {number} options.threshold - Revenue per hour threshold (default: 2000)
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useStaffPerformance = (options = {}) => {
    const { startDate, endDate, threshold = DEFAULT_THRESHOLD } = options
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await getShiftStaffPerformance({ startDate, endDate })
            const staffData = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.data?.data)
                    ? response.data.data
                    : []
            setData(staffData)
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu hiệu suất')
            setData([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    // Calculate KPI metrics
    const kpis = {
        totalStaff: data.length,
        totalRevenue: data.reduce((sum, staff) => sum + (staff.totalRevenue || 0), 0),
        totalOrders: data.reduce((sum, staff) => sum + (staff.totalOrders || 0), 0),
        totalHours: data.reduce((sum, staff) => sum + (staff.totalHours || 0), 0),
        avgRevenuePerHour: data.length
            ? data.reduce((sum, staff) => sum + (staff.avgRevenuePerHour || 0), 0) / data.length
            : 0,
    }

    // Add ranking and performance badge
    const enhancedData = data.map((staff, index) => ({
        ...staff,
        rank: index + 1,
        rankMedal: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '',
        performanceLevel:
            staff.avgRevenuePerHour > threshold ? '🔥 Hiệu suất cao' : '⚠️ Cần cải thiện',
    }))

    return {
        data: enhancedData,
        kpis,
        loading,
        error,
        refetch: fetchData,
    }
}
