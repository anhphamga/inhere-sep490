import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react'

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngừng hoạt động' }
]

export default function CategoryToolbar({
  searchKeyword,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCreate,
  onExpandAll,
  onCollapseAll
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Tìm theo tên danh mục..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none ring-emerald-200 focus:ring"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange?.(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-emerald-200 focus:ring"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onExpandAll}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ChevronDown className="h-4 w-4" />
          Mở tất cả
        </button>

        <button
          type="button"
          onClick={onCollapseAll}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ChevronUp className="h-4 w-4" />
          Thu gọn tất cả
        </button>

        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Thêm danh mục
        </button>
      </div>
    </section>
  )
}
