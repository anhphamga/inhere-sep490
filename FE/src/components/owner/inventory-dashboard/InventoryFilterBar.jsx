import { Search } from 'lucide-react'

const smartFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'low', label: 'Sắp hết hàng' },
  { value: 'out', label: 'Các sản phẩm hết hàng' },
  { value: 'hot', label: 'Bán chạy' },
  { value: 'slow', label: 'Ít bán' }
]

const InventoryFilterBar = ({
  search,
  onSearchChange,
  smartFilter,
  onSmartFilterChange,
  sizeFilter,
  onSizeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sizeOptions,
  categoryOptions
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm sản phẩm"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={smartFilter}
            onChange={(event) => onSmartFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          >
            {smartFilters.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={sizeFilter}
            onChange={(event) => onSizeFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          >
            <option value="">Theo size</option>
            {sizeOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={categoryFilter}
            onChange={(event) => onCategoryFilterChange(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          >
            <option value="">Theo danh mục</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

export default InventoryFilterBar
