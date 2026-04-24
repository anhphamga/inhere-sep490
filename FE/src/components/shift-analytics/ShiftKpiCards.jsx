import React from 'react'

const formatMoney = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const formatNumber = (v) => Number(v || 0).toLocaleString('vi-VN')

const Card = ({ title, value, sub }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
  </div>
)

export default function ShiftKpiCards({ overview }) {
  const data = overview || {}
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card title="Tổng ca" value={formatNumber(data.totalShifts)} />
      <Card title="Ca đã đóng" value={formatNumber(data.totalClosedShifts)} />
      <Card title="Tổng doanh thu" value={formatMoney(data.totalRevenue)} />
      <Card title="Tổng đơn" value={formatNumber(data.totalOrders)} sub={`Thuê: ${formatNumber(data.totalRentOrders)} • Mua: ${formatNumber(data.totalSaleOrders)}`} />
      <Card title="Doanh thu TB / ca" value={formatMoney(data.averageRevenuePerShift)} />
      <Card title="Tổng nhân sự làm việc" value={formatNumber(data.totalStaffWorked)} sub="Tính theo check-in trong khoảng ngày" />
    </div>
  )
}

