import React, { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatMoney = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`

const toDateLabel = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN')
}

const toShortTime = (t) => String(t || '')

export default function ShiftRevenueChartCard({ items = [] }) {
  const chartData = useMemo(() => {
    const rows = Array.isArray(items) ? items : []
    return rows.map((row) => ({
      key: row.shiftId,
      name: `${toDateLabel(row.date)} ${toShortTime(row.startTime)}-${toShortTime(row.endTime)}`,
      totalRevenue: Number(row.totalRevenue || 0),
      totalOrders: Number(row.totalOrders || 0),
    }))
  }, [items])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Doanh thu theo ca</h3>
          <p className="mt-1 text-sm text-slate-600">Chỉ tính đơn hoàn tất (Completed) có gắn ca.</p>
        </div>
      </div>

      <div className="mt-4 h-[280px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-500">
            Chưa có dữ liệu doanh thu trong khoảng ngày này.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('vi-VN')} />
              <Tooltip
                formatter={(value, name) => (name === 'totalRevenue' ? formatMoney(value) : value)}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="totalRevenue" name="Doanh thu" fill="#2563eb" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
