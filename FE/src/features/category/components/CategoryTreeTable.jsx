import { useCallback } from 'react'
import CategoryRow from './CategoryRow'

export default function CategoryTreeTable({
  nodes = [],
  expandedIds = {},
  selectedId = '',
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete
}) {
  const renderNodes = useCallback(
    (items = [], level = 0) =>
      items.map((node) => {
        const expanded = Boolean(expandedIds[node.id])
        const hasChildren = Array.isArray(node.children) && node.children.length > 0
        return (
          <div key={node.id} className="space-y-2">
            <CategoryRow
              node={node}
              level={level}
              isExpanded={expanded}
              isSelected={selectedId === node.id}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            {hasChildren && expanded ? renderNodes(node.children, level + 1) : null}
          </div>
        )
      }),
    [expandedIds, onAddChild, onDelete, onEdit, onSelect, onToggle, selectedId]
  )

  return (
    <section className="space-y-2">
      <div className="hidden grid-cols-12 gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
        <div className="lg:col-span-5">Danh mục</div>
        <div className="lg:col-span-2">Trạng thái</div>
        <div className="lg:col-span-2">Sản phẩm</div>
        <div className="lg:col-span-3 text-right">Thao tác</div>
      </div>
      {renderNodes(nodes, 0)}
    </section>
  )
}
