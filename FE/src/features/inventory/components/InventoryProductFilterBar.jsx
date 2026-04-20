import {
  INSTANCE_CONDITION_FILTER_OPTIONS,
  INSTANCE_STATUS_FILTER_OPTIONS
} from '../config/inventory.constants'

const InventoryProductFilterBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  conditionFilter,
  onConditionFilterChange,
  SearchIcon
}) => {
  const SearchInputIcon = SearchIcon
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-6">
          <SearchInputIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          >
            {INSTANCE_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={`${opt.value}-${opt.label}`} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <select
            value={conditionFilter}
            onChange={(event) => onConditionFilterChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
          >
            {INSTANCE_CONDITION_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}

export default InventoryProductFilterBar
