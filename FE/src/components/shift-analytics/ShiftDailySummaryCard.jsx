import React, { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const formatMoney = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`

export default function ShiftDailySummaryCard({ items = [] }) {
  const chartData = useMemo(() => {
    const rows = Array.isArray(items) ? items : []
    return rows.map((row) => ({
      date: row.date,
      totalRevenue: Number(row.totalRevenue || 0),
      totalOrders: Number(row.totalOrders || 0),
      totalShifts: Number(row.totalShifts || 0),
      totalStaffWorked: Number(row.totalStaffWorked || 0),
    }))
  }, [items])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Tổng hợp theo ngày</h3>
        <p className="mt-1 text-sm text-slate-600">Biểu đồ doanh thu theo ngày trong khoảng lọc.</p>
      </div>

      <div className="mt-4 h-[260px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-500">
            Chưa có dữ liệu tổng hợp theo ngày.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('vi-VN')} />
              <Tooltip
                formatter={(value, name) => (name === 'totalRevenue' ? formatMoney(value) : value)}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Line type="monotone" dataKey="totalRevenue" name="Doanh thu" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

