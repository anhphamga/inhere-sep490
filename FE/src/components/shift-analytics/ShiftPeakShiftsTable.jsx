import React from 'react'

const formatMoney = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A')

export default function ShiftPeakShiftsTable({ items = [] }) {
  const rows = Array.isArray(items) ? items : []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Top ca hiệu quả</h3>
        <p className="mt-1 text-sm text-slate-600">Sắp xếp theo doanh thu (Completed).</p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
          Chưa có ca nào trong khoảng lọc.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4">Ngày</th>
                <th className="py-2 pr-4">Ca</th>
                <th className="py-2 pr-4">Doanh thu</th>
                <th className="py-2 pr-4">Đơn</th>
                <th className="py-2 pr-0">Nhân sự</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {rows.map((row) => (
                <tr key={row.shiftId} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{formatDate(row.date)}</td>
                  <td className="py-2 pr-4">{row.startTime} - {row.endTime}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-900">{formatMoney(row.totalRevenue)}</td>
                  <td className="py-2 pr-4">{Number(row.totalOrders || 0).toLocaleString('vi-VN')}</td>
                  <td className="py-2 pr-0">{Number(row.staffCount || 0).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

