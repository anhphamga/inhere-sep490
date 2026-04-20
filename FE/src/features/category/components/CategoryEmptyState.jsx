export default function CategoryEmptyState({ isSearchMode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-medium text-slate-700">
        {isSearchMode ? 'Chưa có danh mục phù hợp' : 'Chưa có danh mục nào'}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {isSearchMode ? 'Hãy thử từ khóa khác hoặc đổi bộ lọc trạng thái.' : 'Bắt đầu bằng cách tạo danh mục đầu tiên.'}
      </p>
    </div>
  )
}
