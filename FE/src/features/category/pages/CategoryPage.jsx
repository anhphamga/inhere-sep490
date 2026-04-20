import CategoryDeleteDialog from '../components/CategoryDeleteDialog'
import CategoryDrawerForm from '../components/CategoryDrawerForm'
import CategoryEmptyState from '../components/CategoryEmptyState'
import CategoryToolbar from '../components/CategoryToolbar'
import CategoryTreeTable from '../components/CategoryTreeTable'
import { useCategoryTree } from '../hooks/useCategoryTree'

export default function CategoryPage() {
  const {
    filteredTree,
    flatNodes,
    parentOptions,

    loading,
    saving,
    error,

    expandedIds,
    selectedId,
    searchKeyword,
    statusFilter,

    editingNode,
    form,
    isDrawerOpen,
    deleteTarget,

    setSearchKeyword,
    setStatusFilter,
    toggleExpand,
    expandAll,
    collapseAll,
    selectNode,
    startCreateRoot,
    startCreateChild,
    startEdit,
    closeDrawer,
    updateFormField,
    submitForm,
    requestDelete,
    closeDeleteModal,
    confirmDelete
  } = useCategoryTree()

  const isSearchMode = Boolean(String(searchKeyword || '').trim()) || statusFilter !== 'all'

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý danh mục</h1>
        <p className="text-sm text-slate-500">Quản lý cây danh mục cha - con, dễ mở rộng và dễ thao tác.</p>
      </div>

      <CategoryToolbar
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onCreate={startCreateRoot}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-600">{flatNodes.length} danh mục trong hệ thống</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : null}

        {!loading && filteredTree.length === 0 ? (
          <CategoryEmptyState isSearchMode={isSearchMode} />
        ) : null}

        {!loading && filteredTree.length > 0 ? (
          <CategoryTreeTable
            nodes={filteredTree}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onToggle={toggleExpand}
            onSelect={selectNode}
            onAddChild={startCreateChild}
            onEdit={startEdit}
            onDelete={requestDelete}
          />
        ) : null}
      </section>

      <CategoryDrawerForm
        open={isDrawerOpen}
        form={form}
        parentOptions={parentOptions}
        saving={saving}
        isEditing={Boolean(editingNode)}
        onClose={closeDrawer}
        onChangeName={(value) => updateFormField('name', value)}
        onChangeParent={(value) => updateFormField('parentId', value)}
        onChangeActive={(value) => updateFormField('isActive', value)}
        onSubmit={submitForm}
      />

      <CategoryDeleteDialog
        target={deleteTarget}
        saving={saving}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
