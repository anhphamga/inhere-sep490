export default function CategoryForm({
  form,
  parentOptions,
  saving,
  isEditing,
  onChangeName,
  onChangeParent,
  onChangeActive,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Sửa danh mục' : 'Tạo danh mục'}
          </h2>
          <p className="text-sm text-gray-500">Hệ thống tự tạo slug theo tên danh mục.</p>
        </div>
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={onCancel}
        >
          Bỏ chọn
        </button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Tên danh mục</label>
          <input
            type="text"
            value={form.name}
            onChange={(event) => onChangeName(event.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
            placeholder="Ví dụ: Áo dài cách tân"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Danh mục cha</label>
          <select
            value={form.parentId}
            onChange={(event) => onChangeParent(event.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Danh mục gốc</option>
            {parentOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChangeActive(event.target.checked)}
          />
          Đang hoạt động
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật danh mục' : 'Tạo danh mục'}
        </button>
      </form>
    </section>
  );
}
