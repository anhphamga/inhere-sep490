import React from 'react'

const formatMoney = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const formatNumber = (v) => Number(v || 0).toLocaleString('vi-VN')
const formatHours = (v) => `${Number(v || 0).toFixed(1)} giờ`

export default function ShiftStaffPerformanceTable({ items = [] }) {
  const rows = Array.isArray(items) ? items : []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Hiệu suất nhân sự</h3>
        <p className="mt-1 text-sm text-slate-600">Tính theo check-in (giờ làm chỉ tính khi có check-out).</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          Chưa có dữ liệu nhân sự trong khoảng lọc.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4">Nhân sự</th>
                <th className="py-2 pr-4">Số ca</th>
                <th className="py-2 pr-4">Giờ làm</th>
                <th className="py-2 pr-4">Số đơn</th>
                <th className="py-2 pr-4">Doanh thu</th>
                <th className="py-2 pr-0">TB / ca</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {rows.map((row) => (
                <tr key={row.staffId} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-semibold text-slate-900">{row.staffName || 'N/A'}</td>
                  <td className="py-2 pr-4">{formatNumber(row.totalShiftsWorked)}</td>
                  <td className="py-2 pr-4">{formatHours(row.totalHoursWorked)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.totalOrdersHandled)}</td>
                  <td className="py-2 pr-4">{formatMoney(row.totalRevenueHandled)}</td>
                  <td className="py-2 pr-0">{formatMoney(row.averageRevenuePerShift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

