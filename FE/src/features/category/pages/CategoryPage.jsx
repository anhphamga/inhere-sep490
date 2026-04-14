import { Plus, RefreshCw, Search } from 'lucide-react';
import CategoryForm from '../components/CategoryForm';
import CategoryTree from '../components/CategoryTree';
import { useCategoryTree } from '../hooks/useCategoryTree';

function DeleteConfirmModal({ target, saving, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa danh mục</h3>
        <p className="mt-2 text-sm text-gray-600">
          Bạn chắc chắn muốn xóa danh mục <strong>{target.name}</strong>? Thao tác này không thể hoàn tác.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {saving ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    editingNode,
    form,
    deleteTarget,
    setSearchKeyword,
    toggleExpand,
    selectNode,
    startCreateRoot,
    startCreateChild,
    startEdit,
    resetForm,
    updateFormField,
    submitForm,
    requestDelete,
    closeDeleteModal,
    confirmDelete,
    reload,
  } = useCategoryTree();

  const isSearchMode = Boolean(String(searchKeyword || '').trim());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý danh mục</h1>
          <p className="text-sm text-gray-500">Cấu trúc cây danh mục cho toàn bộ hệ thống.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={startCreateRoot}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Danh mục gốc
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <CategoryForm
          form={form}
          parentOptions={parentOptions}
          saving={saving}
          isEditing={Boolean(editingNode)}
          onChangeName={(value) => updateFormField('name', value)}
          onChangeParent={(value) => updateFormField('parentId', value)}
          onChangeActive={(value) => updateFormField('isActive', value)}
          onSubmit={submitForm}
          onCancel={resetForm}
        />

        <section className="rounded-xl border border-gray-200 bg-slate-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cây danh mục</h2>
              <p className="text-sm text-gray-500">{flatNodes.length} danh mục trong hệ thống</p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="Tìm theo tên danh mục..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải danh mục...</div>
          ) : null}

          {!loading && filteredTree.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
              {isSearchMode ? 'Không tìm thấy danh mục phù hợp.' : 'Chưa có danh mục nào.'}
            </div>
          ) : null}

          {!loading && filteredTree.length > 0 ? (
            <CategoryTree
              nodes={filteredTree}
              expandedIds={expandedIds}
              selectedId={selectedId}
              isSearchMode={isSearchMode}
              onToggle={toggleExpand}
              onSelect={selectNode}
              onAddChild={startCreateChild}
              onEdit={startEdit}
              onDelete={requestDelete}
            />
          ) : null}
        </section>
      </div>

      <DeleteConfirmModal
        target={deleteTarget}
        saving={saving}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
