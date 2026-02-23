import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    getOwnerCustomerStatsApi,
    getOwnerDashboardSummaryApi,
    getOwnerInventoryStatsApi,
    getOwnerRevenueAnalyticsApi,
    getOwnerTopProductsApi
} from '../../services/owner.service'
import { currencyFormatter, numberFormatter, toArray } from './owner.utils'
import OwnerRefreshButton from './OwnerRefreshButton'

const OwnerDashboardScreen = () => {
    const [data, setData] = useState({
        summary: null,
        customerStats: null,
        inventory: null,
        revenue: [],
        topProducts: []
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const loadData = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const [summaryRes, customerStatsRes, inventoryRes, revenueRes, topProductsRes] = await Promise.all([
                getOwnerDashboardSummaryApi(),
                getOwnerCustomerStatsApi(),
                getOwnerInventoryStatsApi(),
                getOwnerRevenueAnalyticsApi({ period: 'month' }),
                getOwnerTopProductsApi({ type: 'rent', limit: 8 })
            ])

            setData({
                summary: summaryRes?.data || {},
                customerStats: customerStatsRes?.data || {},
                inventory: inventoryRes?.data || {},
                revenue: toArray(revenueRes?.data),
                topProducts: toArray(topProductsRes?.data)
            })
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được tổng quan owner')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const kpis = useMemo(() => {
        const summary = data.summary || {}
        const customerStats = data.customerStats || {}
        const inventory = data.inventory || {}
        const latestRevenue = (data.revenue || [])[data.revenue.length - 1] || {}
        const latestTotalRevenue = Number(latestRevenue.rentRevenue || 0) + Number(latestRevenue.saleRevenue || 0)

        return [
            {
                label: 'Tổng sản phẩm',
                value: numberFormatter.format(summary.productCount || 0),
                helper: 'Trong danh mục hiện có'
            },
            {
                label: 'Tổng nhân sự',
                value: numberFormatter.format(summary.staffCount || 0),
                helper: 'Tài khoản staff'
            },
            {
                label: 'Tổng khách hàng',
                value: numberFormatter.format(summary.customerCount || 0),
                helper: `${numberFormatter.format(customerStats.active || 0)} hoạt động / ${numberFormatter.format(customerStats.locked || 0)} khóa`
            },
            {
                label: 'Kho khả dụng',
                value: numberFormatter.format(inventory?.lifecycle?.Available || 0),
                helper: `${numberFormatter.format(inventory.total || 0)} item trong kho`
            },
            {
                label: 'Doanh thu kỳ gần nhất',
                value: currencyFormatter.format(latestTotalRevenue),
                helper: latestRevenue.period || 'Chưa có dữ liệu'
            }
        ]
    }, [data])

    const latestRevenue = useMemo(() => {
        const rows = data.revenue || []
        return rows[rows.length - 1] || {}
    }, [data.revenue])

    const previousRevenue = useMemo(() => {
        const rows = data.revenue || []
        return rows[rows.length - 2] || null
    }, [data.revenue])

    const latestTotalRevenue = Number(latestRevenue.rentRevenue || 0) + Number(latestRevenue.saleRevenue || 0)
    const previousTotalRevenue = previousRevenue
        ? Number(previousRevenue.rentRevenue || 0) + Number(previousRevenue.saleRevenue || 0)
        : 0

    const revenueTrend = previousTotalRevenue > 0
        ? ((latestTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
        : null

    const revenueRows = useMemo(() => {
        const rows = (data.revenue || []).slice(-6)
        const maxValue = rows.reduce((max, row) => {
            const total = Number(row.rentRevenue || 0) + Number(row.saleRevenue || 0)
            return total > max ? total : max
        }, 0)

        return rows.map((row) => {
            const rentRevenue = Number(row.rentRevenue || 0)
            const saleRevenue = Number(row.saleRevenue || 0)
            const total = rentRevenue + saleRevenue

            return {
                ...row,
                total,
                width: maxValue > 0 ? Math.max((total / maxValue) * 100, 6) : 0
            }
        })
    }, [data.revenue])

    const inventoryLifecycleRows = useMemo(() => {
        return Object.entries(data.inventory?.lifecycle || {}).sort((a, b) => b[1] - a[1])
    }, [data.inventory])

    const inventoryConditionRows = useMemo(() => {
        return Object.entries(data.inventory?.condition || {}).sort((a, b) => b[1] - a[1])
    }, [data.inventory])

    const topProducts = useMemo(() => {
        return toArray(data.topProducts).slice(0, 5)
    }, [data.topProducts])

    const customerStats = data.customerStats || {}
    const customerActive = Number(customerStats.active || 0)

    const revenueRatio = useMemo(() => {
        const rows = toArray(data.revenue)
        const rentTotal = rows.reduce((sum, row) => sum + Number(row.rentRevenue || 0), 0)
        const saleTotal = rows.reduce((sum, row) => sum + Number(row.saleRevenue || 0), 0)
        const total = rentTotal + saleTotal
        const rentPercent = total > 0 ? (rentTotal / total) * 100 : 0
        const salePercent = total > 0 ? 100 - rentPercent : 0

        return {
            rentTotal,
            saleTotal,
            rentPercent,
            salePercent
        }
    }, [data.revenue])

    if (loading) {
        return <div className="owner-card owner-loading">Đang tải screen tổng quan...</div>
    }

    return (
        <div className="owner-layout">
            <header className="owner-header">
                <div>
                    <h1>Tổng quan </h1>
                </div>
                <div className="owner-header-actions">
                    <OwnerRefreshButton onClick={loadData} />
                </div>
            </header>

            {error ? <div className="owner-alert">{error}</div> : null}

            <section className="owner-dash-summary">
                <article className="owner-dash-hero">
                    <p className="owner-dash-hero-label">Hiệu suất kỳ gần nhất</p>
                    <h2>{currencyFormatter.format(latestTotalRevenue)}</h2>
                    <p className="owner-dash-hero-sub">{latestRevenue.period || 'Chưa có dữ liệu kỳ gần nhất'}</p>
                </article>

                <article className="owner-dash-meta">
                    <div className="owner-dash-meta-item">
                        <span>Tăng trưởng so với kỳ trước</span>
                        <strong className={revenueTrend != null && revenueTrend < 0 ? 'owner-trend-down' : 'owner-trend-up'}>
                            {revenueTrend == null ? 'N/A' : `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`}
                        </strong>
                    </div>
                    <div className="owner-dash-meta-item">
                        <span>Tổng tồn kho hiện tại</span>
                        <strong>{numberFormatter.format(data.inventory?.total || 0)} item</strong>
                    </div>
                    <div className="owner-dash-meta-item">
                        <span>Khách hàng hoạt động</span>
                        <strong>{numberFormatter.format(customerActive)}</strong>
                    </div>
                </article>
            </section>

            <section className="owner-kpi-grid">
                {kpis.map((item) => (
                    <article className="owner-kpi-card" key={item.label}>
                        <p className="owner-kpi-label">{item.label}</p>
                        <p className="owner-kpi-value">{item.value}</p>
                        <p className="owner-kpi-helper">{item.helper}</p>
                    </article>
                ))}
            </section>

            <section className="owner-panels owner-panels-2">
                <article className="owner-card">
                    <div className="owner-card-head">
                        <h2>Doanh thu </h2>
                        <span>Biểu đồ nhanh</span>
                    </div>
                    <div className="owner-revenue-bars">
                        {revenueRows.length > 0 ? (
                            revenueRows.map((row) => (
                                <div className="owner-revenue-row" key={row.period}>
                                    <div className="owner-revenue-head">
                                        <span>{row.period}</span>
                                        <strong>{currencyFormatter.format(row.total)}</strong>
                                    </div>
                                    <div className="owner-revenue-track">
                                        <div className="owner-revenue-fill" style={{ width: `${row.width}%` }} />
                                    </div>
                                    <div className="owner-revenue-detail">
                                        <span>Thuê: {currencyFormatter.format(Number(row.rentRevenue || 0))}</span>
                                        <span>Bán: {currencyFormatter.format(Number(row.saleRevenue || 0))}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="owner-empty-text">Chưa có dữ liệu doanh thu.</p>
                        )}
                    </div>
                </article>

                <article className="owner-card">
                    <div className="owner-card-head">
                        <h2>Rental vs Sale Ratio</h2>
                        <span>Doanh thu tích luỹ</span>
                    </div>
                    <div className="owner-ratio-wrap">
                        <div
                            className="owner-ratio-donut"
                            style={{ '--ratio-rent': `${revenueRatio.rentPercent}%` }}
                        >
                            <div className="owner-ratio-center">
                                <strong>{revenueRatio.rentPercent.toFixed(0)}%</strong>
                                <span>RENTAL</span>
                            </div>
                        </div>

                        <div className="owner-ratio-legend">
                            <div className="owner-ratio-row">
                                <div className="owner-ratio-label">
                                    <span className="owner-ratio-dot owner-ratio-dot-rent" />
                                    <span>Rentals</span>
                                </div>
                                <strong>{revenueRatio.rentPercent.toFixed(1)}%</strong>
                            </div>
                            <div className="owner-ratio-row">
                                <div className="owner-ratio-label">
                                    <span className="owner-ratio-dot owner-ratio-dot-sale" />
                                    <span>Sales</span>
                                </div>
                                <strong>{revenueRatio.salePercent.toFixed(1)}%</strong>
                            </div>
                            <div className="owner-ratio-amounts">
                                <span>Thuê: {currencyFormatter.format(revenueRatio.rentTotal)}</span>
                                <span>Bán: {currencyFormatter.format(revenueRatio.saleTotal)}</span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section className="owner-panels owner-panels-2">
                <article className="owner-card">
                    <div className="owner-card-head">
                        <h2>Top sản phẩm cho thuê</h2>
                        <span>Top 5</span>
                    </div>
                    <div className="owner-list">
                        {topProducts.length > 0 ? (
                            topProducts.map((item, index) => (
                                <div className="owner-list-item" key={item.productId || `${item.name}-${index}`}>
                                    <div>
                                        <p className="owner-list-title">#{index + 1} • {item.name || 'N/A'}</p>
                                        <p className="owner-list-sub">{item.category || 'N/A'} • {item.size || 'N/A'} • {item.color || 'N/A'}</p>
                                    </div>
                                    <span className="owner-badge">{numberFormatter.format(item.rentCount || 0)} lượt</span>
                                </div>
                            ))
                        ) : (
                            <p className="owner-empty-text">Chưa có dữ liệu top sản phẩm.</p>
                        )}
                    </div>
                </article>

                <article className="owner-card">
                    <div className="owner-card-head">
                        <h2>Inventory health</h2>
                        <span>{numberFormatter.format(data.inventory?.total || 0)} item</span>
                    </div>
                    <div className="owner-health-grid">
                        <div>
                            <p className="owner-health-title">Theo vòng đời</p>
                            <div className="owner-pill-group">
                                {inventoryLifecycleRows.map(([key, value]) => (
                                    <div className="owner-pill" key={`life-${key}`}>
                                        <strong>{key}</strong>
                                        <span>{numberFormatter.format(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="owner-health-title">Theo chất lượng</p>
                            <div className="owner-pill-group">
                                {inventoryConditionRows.map(([key, value]) => (
                                    <div className="owner-pill" key={`cond-${key}`}>
                                        <strong>{key}</strong>
                                        <span>{numberFormatter.format(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </article>
            </section>
        </div>
    )
}

export default OwnerDashboardScreen