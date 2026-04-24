import React from 'react'

export default function ShiftAnalyticsFilterBar({
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onRefresh,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo ca làm</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi doanh thu, đơn hàng và hiệu suất nhân sự theo ca.</p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-600">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate?.(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-slate-600">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate?.(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="button"
            onClick={() => onRefresh?.()}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>
    </div>
  )
}

