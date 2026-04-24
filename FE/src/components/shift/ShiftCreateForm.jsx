import React, { useMemo, useState } from 'react'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const toInt = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

export default function ShiftCreateForm({ onSubmit, loading, errorMessage = '' }) {
  const today = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const [form, setForm] = useState({
    date: today,
    startTime: '08:00',
    endTime: '12:00',
    requiredStaff: 1,
  })
  const [localError, setLocalError] = useState('')

  const validate = () => {
    if (!form.date) return 'Vui lòng chọn ngày.'
    if (!TIME_REGEX.test(String(form.startTime || ''))) return 'startTime phải đúng định dạng HH:mm.'
    if (!TIME_REGEX.test(String(form.endTime || ''))) return 'endTime phải đúng định dạng HH:mm.'
    if (String(form.startTime) >= String(form.endTime)) return 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc.'
    const required = toInt(form.requiredStaff)
    if (!Number.isInteger(required) || required < 1) return 'requiredStaff phải là số nguyên >= 1.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const msg = validate()
    setLocalError(msg)
    if (msg) return
    await onSubmit?.({
      date: form.date,
      startTime: String(form.startTime).trim(),
      endTime: String(form.endTime).trim(),
      requiredStaff: Number(form.requiredStaff),
    })
  }

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setLocalError('')
  }

  const shownError = localError || errorMessage

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Tạo ca làm</h2>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Đang tạo...' : 'Tạo ca'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Ngày</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Giờ bắt đầu</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setField('startTime', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Giờ kết thúc</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setField('endTime', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-semibold text-slate-700">Số nhân sự</label>
          <input
            type="number"
            min={1}
            step={1}
            value={form.requiredStaff}
            onChange={(e) => setField('requiredStaff', e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>
      </div>

      {shownError ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {shownError}
        </div>
      ) : null}
    </form>
  )
}

