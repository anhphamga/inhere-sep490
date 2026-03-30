import { useEffect, useMemo, useState } from 'react'
import { SHIFT_STATUS_OPTIONS } from '../../constants/shiftStatus'

const DEFAULT_FORM = {
  code: '',
  name: '',
  workDate: '',
  startTime: '',
  endTime: '',
  maxStaff: 3,
  assignedCount: 0,
  status: 'OPEN',
  allowRegistration: true,
  notes: '',
}

const validateForm = (form) => {
  const nextErrors = {}
  if (!String(form.name || '').trim()) nextErrors.name = 'Vui lòng nhập tên ca'
  if (!String(form.code || '').trim()) nextErrors.code = 'Vui lòng nhập mã ca'
  if (!String(form.workDate || '').trim()) nextErrors.workDate = 'Vui lòng chọn ngày làm'
  if (!String(form.startTime || '').trim()) nextErrors.startTime = 'Vui lòng chọn giờ bắt đầu'
  if (!String(form.endTime || '').trim()) nextErrors.endTime = 'Vui lòng chọn giờ kết thúc'
  if (Number(form.maxStaff || 0) < 1) nextErrors.maxStaff = 'Số lượng tối đa phải lớn hơn hoặc bằng 1'
  if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    nextErrors.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu'
  }
  return nextErrors
}

export default function ShiftFormModal({
  open,
  mode = 'create',
  initialData,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setForm(initialData ? { ...DEFAULT_FORM, ...initialData } : DEFAULT_FORM)
    setErrors({})
  }, [initialData, open])

  const title = useMemo(() => (mode === 'edit' ? 'Sửa ca làm' : 'Tạo ca mới'), [mode])
  const submitText = useMemo(() => (mode === 'edit' ? 'Lưu thay đổi' : 'Lưu ca làm'), [mode])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      ...form,
      maxStaff: Number(form.maxStaff || 1),
      assignedCount: Number(form.assignedCount || 0),
      code: String(form.code || '').trim(),
      name: String(form.name || '').trim(),
      notes: String(form.notes || '').trim(),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Tên ca</span>
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
                placeholder="Ví dụ: Ca 1"
              />
              {errors.name ? <p className="text-xs text-rose-600">{errors.name}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Mã ca</span>
              <input
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
                placeholder="Ví dụ: CA_1_2026_03_23"
              />
              {errors.code ? <p className="text-xs text-rose-600">{errors.code}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Ngày làm</span>
              <input
                type="date"
                value={form.workDate}
                onChange={(e) => handleChange('workDate', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              />
              {errors.workDate ? <p className="text-xs text-rose-600">{errors.workDate}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Số lượng nhân viên tối đa</span>
              <input
                type="number"
                min="1"
                value={form.maxStaff}
                onChange={(e) => handleChange('maxStaff', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              />
              {errors.maxStaff ? <p className="text-xs text-rose-600">{errors.maxStaff}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Giờ bắt đầu</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              />
              {errors.startTime ? <p className="text-xs text-rose-600">{errors.startTime}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Giờ kết thúc</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              />
              {errors.endTime ? <p className="text-xs text-rose-600">{errors.endTime}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Trạng thái</span>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              >
                {SHIFT_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Đăng ký ca</span>
              <select
                value={form.allowRegistration ? 'true' : 'false'}
                onChange={(e) => handleChange('allowRegistration', e.target.value === 'true')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              >
                <option value="true">Cho phép đăng ký</option>
                <option value="false">Tạm khóa đăng ký</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Ghi chú</span>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30"
              placeholder="Thêm ghi chú cho ca làm (nếu có)"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" className="rounded-lg bg-[#1975d2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#155ea8]">
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
