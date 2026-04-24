import React from 'react'

const META = {
  PENDING: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function RegistrationStatusPill({ status }) {
  const key = String(status || '').toUpperCase()
  const meta = META[key] || { label: key || 'Chưa đăng ký', className: 'bg-slate-50 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

