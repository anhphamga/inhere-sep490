import React from 'react'

const STATUS_META = {
  OPEN: { label: 'Đang mở', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  FULL: { label: 'Đủ người', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  CLOSED: { label: 'Đã đóng', className: 'bg-slate-100 text-slate-600 border-slate-200' },
}

export default function ShiftStatusPill({ status }) {
  const key = String(status || '').toUpperCase()
  const meta = STATUS_META[key] || { label: key || 'N/A', className: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

