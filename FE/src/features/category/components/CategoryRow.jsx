import { ChevronDown, ChevronRight, Circle, Pencil, Plus, Trash2 } from 'lucide-react'

const statusClassMap = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200'
}

const statusLabelMap = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động'
}

export default function CategoryRow({
  node,
  level = 0,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  const statusKey = node.isActive ? 'active' : 'inactive'

  return (
    <div
      className={`grid grid-cols-12 items-center gap-2 rounded-xl border px-3 py-2 transition ${
        isSelected ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="col-span-12 min-w-0 lg:col-span-5">
        <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${level * 18}px` }}>
          <button
            type="button"
            className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
            disabled={!hasChildren}
            onClick={() => onToggle?.(node.id)}
          >
            {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <Circle className="h-3 w-3" />}
          </button>

          <button type="button" className="min-w-0 text-left" onClick={() => onSelect?.(node.id)}>
            <p className="truncate text-sm font-semibold text-slate-900">{node.name}</p>
            <p className="truncate text-xs text-slate-500">{node.label}</p>
          </button>
        </div>
      </div>

      <div className="col-span-6 lg:col-span-2">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassMap[statusKey]}`}>
          {statusLabelMap[statusKey]}
        </span>
      </div>

      <div className="col-span-6 text-right lg:col-span-2 lg:text-left">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {Number(node.count || 0)} sản phẩm
        </span>
      </div>

      <div className="col-span-12 flex items-center justify-end gap-1 lg:col-span-3">
        <button
          type="button"
          onClick={() => onAddChild?.(node)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm con
        </button>
        <button
          type="button"
          onClick={() => onEdit?.(node)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Sửa
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(node)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xóa
        </button>
      </div>
    </div>
  )
}
