import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
import CategoryActions from './CategoryActions';

const statusClassMap = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hidden: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusLabelMap = {
  active: 'Đang hoạt động',
  hidden: 'Đang ẩn',
};

export default function CategoryItem({
  node,
  level,
  isExpanded,
  isSelected,
  forceExpanded,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const expanded = forceExpanded ? true : isExpanded;
  const statusKey = node.isActive ? 'active' : 'hidden';

  return (
    <div className="space-y-2">
      <div
        className={`group flex items-center justify-between gap-3 rounded-xl border px-3 py-2 shadow-sm transition ${
          isSelected ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
            disabled={!hasChildren}
            onClick={() => onToggle(node.id)}
          >
            {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <Circle className="h-3 w-3" />}
          </button>

          <button
            type="button"
            className="min-w-0 text-left"
            onClick={() => onSelect(node.id)}
          >
            <p className="truncate text-sm font-semibold text-gray-900">{node.name}</p>
            <p className="truncate text-xs text-gray-500">{node.label}</p>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassMap[statusKey]}`}>
            {statusLabelMap[statusKey]}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {Number(node.count || 0)} sản phẩm
          </span>
          <CategoryActions
            onAddChild={() => onAddChild(node)}
            onEdit={() => onEdit(node)}
            onDelete={() => onDelete(node)}
          />
        </div>
      </div>
    </div>
  );
}
