import { X } from 'lucide-react'

export default function CategoryDrawerForm({
  open,
  form,
  parentOptions = [],
  saving,
  isEditing,
  onClose,
  onChangeName,
  onChangeParent,
  onChangeActive,
  onSubmit
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isEditing ? 'Cập nhật danh mục' : 'Thêm danh mục'}
            </h3>
            <p className="text-sm text-slate-500">Điền thông tin danh mục và lưu thay đổi.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.()
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tên danh mục</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChangeName?.(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none ring-emerald-200 focus:ring"
              placeholder="Ví dụ: Áo dài cưới"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Danh mục cha</label>
            <select
              value={form.parentId}
              onChange={(event) => onChangeParent?.(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-emerald-200 focus:ring"
            >
              <option value="">Danh mục gốc</option>
              {parentOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onChangeActive?.(event.target.checked)}
            />
            Đang hoạt động
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
