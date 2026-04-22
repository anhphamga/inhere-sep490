import { useCallback } from 'react';
import CategoryItem from './CategoryItem';

export default function CategoryTree({
  nodes,
  expandedIds,
  selectedId,
  isSearchMode,
  onToggle,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}) {
  const renderNodes = useCallback(
    (items = [], level = 0) => {
      return items.map((node) => {
        const expanded = Boolean(expandedIds[node.id]);
        const shouldShowChildren = isSearchMode || expanded;

        return (
          <div key={node.id}>
            <CategoryItem
              node={node}
              level={level}
              isExpanded={expanded}
              isSelected={selectedId === node.id}
              forceExpanded={isSearchMode}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />

            {shouldShowChildren && Array.isArray(node.children) && node.children.length > 0 ? (
              <div className="mt-2 space-y-2">
                {renderNodes(node.children, level + 1)}
              </div>
            ) : null}
          </div>
        );
      });
    },
    [expandedIds, isSearchMode, onAddChild, onDelete, onEdit, onSelect, onToggle, selectedId]
  );

  return <div className="space-y-2">{renderNodes(nodes, 0)}</div>;
}
