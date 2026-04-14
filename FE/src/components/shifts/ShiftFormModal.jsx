import { useEffect, useMemo, useState } from 'react'
import { SHIFT_STATUS_OPTIONS } from '../../constants/shiftStatus'
import { DEFAULT_SHIFT_PRESET, SHIFT_PRESETS } from '../../constants/shiftManagement'
import { formatLocalDateInput } from '../../utils/localDate'

const getTodayDate = () => formatLocalDateInput(new Date())

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

const generateShiftCode = (workDate, startTime, endTime) => {
  const datePart = String(workDate || '').replaceAll('-', '') || 'AUTO'
  const startPart = String(startTime || '00:00').replace(':', '')
  const endPart = String(endTime || '00:00').replace(':', '')
  return `CA_${datePart}_${startPart}_${endPart}`
}

const withAutoCode = (form) => ({
  ...form,
  code: generateShiftCode(form.workDate, form.startTime, form.endTime),
})

const validateForm = (form) => {
  const nextErrors = {}
  const today = getTodayDate()
  const normalizedDate = String(form.workDate || '').trim()

  if (!String(form.name || '').trim()) nextErrors.name = 'Vui lòng nhập tên ca'
  if (!String(form.code || '').trim()) nextErrors.code = 'Không thể tạo mã ca'
  if (!normalizedDate) nextErrors.workDate = 'Vui lòng chọn ngày làm'
  if (normalizedDate && normalizedDate < today) nextErrors.workDate = 'Không thể chọn ngày trong quá khứ'
  if (!String(form.startTime || '').trim()) nextErrors.startTime = 'Vui lòng chọn giờ bắt đầu'
  if (!String(form.endTime || '').trim()) nextErrors.endTime = 'Vui lòng chọn giờ kết thúc'
  if (Number(form.maxStaff || 0) < 1) nextErrors.maxStaff = 'Số lượng tối đa phải lớn hơn hoặc bằng 1'
  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    nextErrors.endTime = 'Giờ kết thúc phải lớn hơn giờ bắt đầu'
  }
  if (Number(form.assignedCount || 0) > Number(form.maxStaff || 0)) {
    nextErrors.maxStaff = 'Số lượng tối đa không được nhỏ hơn số nhân viên đã đăng ký'
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
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    const base = initialData
      ? { ...DEFAULT_FORM, ...initialData }
      : {
        ...DEFAULT_FORM,
        workDate: getTodayDate(),
        startTime: DEFAULT_SHIFT_PRESET.startTime,
        endTime: DEFAULT_SHIFT_PRESET.endTime,
      }
    setForm(withAutoCode(base))
    setTouched({})
    setSubmitted(false)
  }, [initialData, open])

  const title = useMemo(() => (mode === 'edit' ? 'Sửa ca làm' : 'Tạo ca mới'), [mode])
  const submitText = useMemo(() => (mode === 'edit' ? 'Lưu thay đổi' : 'Lưu ca làm'), [mode])
  const errors = useMemo(() => validateForm(form), [form])

  const fieldError = (field) => ((submitted || touched[field]) ? errors[field] : '')
  const fieldClassName = (field, extra = '') => {
    const hasError = Boolean(fieldError(field))
    return `w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#1975d2]/30 ${
      hasError ? 'border-rose-400' : 'border-slate-200'
    } ${extra}`.trim()
  }

  const handleChange = (key, value) => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setForm((prev) => withAutoCode({ ...prev, [key]: value }))
  }

  const handleBlur = (key) => setTouched((prev) => ({ ...prev, [key]: true }))

  const applyPreset = (presetKey) => {
    const selectedPreset = SHIFT_PRESETS.find((item) => item.key === presetKey)
    if (!selectedPreset) return
    const next = {
      ...form,
      name: String(form.name || '').trim() ? form.name : selectedPreset.defaultName,
      startTime: selectedPreset.startTime,
      endTime: selectedPreset.endTime,
    }
    setTouched((prev) => ({
      ...prev,
      name: true,
      startTime: true,
      endTime: true,
    }))
    setForm(withAutoCode(next))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    const nextErrors = validateForm(form)
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

  const assignedCount = Number(form.assignedCount || 0)
  const maxStaff = Math.max(Number(form.maxStaff || 0), 0)
  const remainingSlots = Math.max(maxStaff - assignedCount, 0)

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Tên ca</span>
              <input
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={fieldClassName('name')}
                placeholder="Ví dụ: Ca 1"
              />
              {fieldError('name') ? <p className="text-xs text-rose-600">{fieldError('name')}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Mã ca (tự tạo)</span>
              <input
                value={form.code}
                readOnly
                disabled
                className={fieldClassName('code', 'cursor-not-allowed bg-slate-100 text-slate-500')}
                placeholder="Hệ thống tự tạo"
              />
              {fieldError('code') ? <p className="text-xs text-rose-600">{fieldError('code')}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Ngày làm</span>
              <input
                type="date"
                min={getTodayDate()}
                value={form.workDate}
                onChange={(e) => handleChange('workDate', e.target.value)}
                onBlur={() => handleBlur('workDate')}
                className={fieldClassName('workDate')}
              />
              {fieldError('workDate') ? <p className="text-xs text-rose-600">{fieldError('workDate')}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Số lượng nhân viên tối đa</span>
              <input
                type="number"
                min="1"
                value={form.maxStaff}
                onChange={(e) => handleChange('maxStaff', e.target.value)}
                onBlur={() => handleBlur('maxStaff')}
                className={fieldClassName('maxStaff')}
              />
              <p className="text-xs text-slate-500">
                Đã đăng ký {assignedCount}/{maxStaff || 0}, còn trống {remainingSlots} vị trí.
              </p>
              {fieldError('maxStaff') ? <p className="text-xs text-rose-600">{fieldError('maxStaff')}</p> : null}
            </label>

            <div className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Mẫu ca nhanh</span>
              <div className="flex flex-wrap gap-2">
                {SHIFT_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset.key)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {preset.buttonLabel}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Giờ bắt đầu</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                onBlur={() => handleBlur('startTime')}
                className={fieldClassName('startTime')}
              />
              {fieldError('startTime') ? <p className="text-xs text-rose-600">{fieldError('startTime')}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Giờ kết thúc</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                onBlur={() => handleBlur('endTime')}
                className={fieldClassName('endTime')}
              />
              {fieldError('endTime') ? <p className="text-xs text-rose-600">{fieldError('endTime')}</p> : null}
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Trạng thái</span>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={fieldClassName('status')}
              >
                {SHIFT_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Trạng thái nhận đăng ký</span>
              <select
                value={form.allowRegistration ? 'true' : 'false'}
                onChange={(e) => handleChange('allowRegistration', e.target.value === 'true')}
                className={fieldClassName('allowRegistration')}
              >
                <option value="true">Mở nhận đăng ký nhân viên</option>
                <option value="false">Tạm dừng nhận đăng ký</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Ghi chú</span>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              className={fieldClassName('notes')}
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
