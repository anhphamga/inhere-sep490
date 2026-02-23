import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
    getOwnerDashboardSummaryApi,
    getOwnerRentalStatsApi,
    getOwnerRevenueAnalyticsApi,
    getOwnerStaffApi,
    getOwnerTopProductsApi
} from '../../services/owner.service'
import { currencyFormatter, numberFormatter, toArray } from './owner.utils'

const calculateTrend = (rows) => {
    if (rows.length < 2) {
        return null
    }

    const latest = Number(rows[rows.length - 1]?.rentRevenue || 0) + Number(rows[rows.length - 1]?.saleRevenue || 0)
    const previous = Number(rows[rows.length - 2]?.rentRevenue || 0) + Number(rows[rows.length - 2]?.saleRevenue || 0)

    if (!previous) {
        return null
    }

    return ((latest - previous) / previous) * 100
}

export default function StaffAnalytics() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [summary, setSummary] = useState({})
    const [staff, setStaff] = useState([])
    const [revenueRows, setRevenueRows] = useState([])
    const [rentalRows, setRentalRows] = useState([])
    const [topProducts, setTopProducts] = useState([])

    const loadAnalytics = async () => {
        try {
            setLoading(true)
            setError('')

            const [summaryRes, staffRes, revenueRes, rentalRes, topProductsRes] = await Promise.all([
                getOwnerDashboardSummaryApi(),
                getOwnerStaffApi(),
                getOwnerRevenueAnalyticsApi({ period: 'month' }),
                getOwnerRentalStatsApi({ groupBy: 'category' }),
                getOwnerTopProductsApi({ type: 'rent', limit: 5 })
            ])

            setSummary(summaryRes?.data || {})
            setStaff(toArray(staffRes?.data))
            setRevenueRows(toArray(revenueRes?.data).slice(-6))
            setRentalRows(toArray(rentalRes?.data).slice(0, 8))
            setTopProducts(toArray(topProductsRes?.data))
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được analytics cho owner')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAnalytics()
    }, [])

    const totalRevenue = useMemo(
        () => revenueRows.reduce((sum, row) => sum + Number(row.rentRevenue || 0) + Number(row.saleRevenue || 0), 0),
        [revenueRows]
    )

    const revenueTrend = useMemo(() => calculateTrend(revenueRows), [revenueRows])

    const revenueChartData = useMemo(() => {
        return revenueRows.map((row) => ({
            period: row.period,
            revenue: Number(row.rentRevenue || 0) + Number(row.saleRevenue || 0)
        }))
    }, [revenueRows])

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải dữ liệu phân tích...</div>
    }

    return (
        <div className="space-y-8">
            {error ? <div className="owner-alert">{error}</div> : null}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnalyticCard title="Tổng staff" value={numberFormatter.format(staff.length)} subtitle="Nhân sự hiện tại" />
                <AnalyticCard title="Tổng sản phẩm" value={numberFormatter.format(summary.productCount || 0)} subtitle="Danh mục hiện có" />
                <AnalyticCard title="Tổng khách hàng" value={numberFormatter.format(summary.customerCount || 0)} subtitle="Khách hàng hệ thống" />
                <AnalyticCard
                    title="Revenue 6 kỳ"
                    value={currencyFormatter.format(totalRevenue)}
                    subtitle={revenueTrend == null ? 'Không đủ dữ liệu để tính xu hướng' : `Xu hướng: ${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`}
                />
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-2">Doanh thu 6 kỳ gần nhất</h3>
                <p className="text-sm text-slate-500 mb-6">Tổng hợp doanh thu thuê + bán theo kỳ</p>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#334155' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <Tooltip formatter={(value) => currencyFormatter.format(Number(value || 0))} />
                            <Bar dataKey="revenue" fill="#1975d2" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-4">Rental theo category</h4>
                    <div className="space-y-3">
                        {rentalRows.map((row) => (
                            <div className="flex items-center justify-between" key={row.key}>
                                <span className="text-sm text-slate-600">{row.key}</span>
                                <strong className="text-sm text-slate-900">{numberFormatter.format(row.count || 0)}</strong>
                            </div>
                        ))}
                        {rentalRows.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu rental.</p> : null}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-semibold text-slate-900 mb-4">Top sản phẩm cho thuê</h4>
                    <div className="space-y-3">
                        {topProducts.map((item, index) => (
                            <div className="flex items-center justify-between" key={item.productId || `${item.name}-${index}`}>
                                <span className="text-sm text-slate-600">#{index + 1} {item.name || 'N/A'}</span>
                                <strong className="text-sm text-slate-900">{numberFormatter.format(item.rentCount || 0)} lượt</strong>
                            </div>
                        ))}
                        {topProducts.length === 0 ? <p className="text-sm text-slate-500">Chưa có dữ liệu top sản phẩm.</p> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

function AnalyticCard({ title, value, subtitle }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
        </div>
    )
}
