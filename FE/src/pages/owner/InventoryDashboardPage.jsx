import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, Flame, Layers } from 'lucide-react'
import InventoryFilterBar from '../../components/owner/inventory-dashboard/InventoryFilterBar'
import InventoryKPI from '../../components/owner/inventory-dashboard/InventoryKPI'
import InventoryTable from '../../components/owner/inventory-dashboard/InventoryTable'
import { numberFormatter } from '../../utils/owner.utils'
import { INVENTORY_PAGE_SIZE } from '../../features/inventory/config/inventory.constants'
import { useInventoryDashboardData } from '../../features/inventory/hooks/useInventoryDashboardData'

const InventoryDashboardPage = () => {
  const navigate = useNavigate()
  const { rows, loading, error } = useInventoryDashboardData()

  const [search, setSearch] = useState('')
  const [smartFilter, setSmartFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const sizeOptions = useMemo(() => {
    const set = new Set()
    rows.forEach((item) => {
      item.sizeRows.forEach((sizeItem) => {
        if (sizeItem.size) set.add(sizeItem.size)
      })
    })
    return Array.from(set)
  }, [rows])

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(rows.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((item) => {
      const matchesSearch = !query
        || item.name.toLowerCase().includes(query)
        || item.category.toLowerCase().includes(query)

      const matchesSize = !sizeFilter || item.sizeRows.some((sizeItem) => sizeItem.size === sizeFilter)
      const matchesCategory = !categoryFilter || item.category === categoryFilter

      let matchesSmart = true
      if (smartFilter === 'low') matchesSmart = item.status === 'low'
      if (smartFilter === 'out') matchesSmart = item.status === 'out'
      if (smartFilter === 'hot') matchesSmart = item.status === 'hot'
      if (smartFilter === 'slow') matchesSmart = item.soldTotal <= 1
      if (smartFilter === 'stable') matchesSmart = item.status === 'stable'

      return matchesSearch && matchesSize && matchesCategory && matchesSmart
    })
  }, [rows, search, sizeFilter, categoryFilter, smartFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, smartFilter, sizeFilter, categoryFilter])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / INVENTORY_PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * INVENTORY_PAGE_SIZE
  const endIndex = Math.min(startIndex + INVENTORY_PAGE_SIZE, totalItems)
  const paginatedRows = filteredRows.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const totalStock = useMemo(() => rows.reduce((sum, item) => sum + item.stock, 0), [rows])
  const lowCount = useMemo(() => rows.filter((item) => item.status === 'low').length, [rows])
  const outCount = useMemo(() => rows.filter((item) => item.status === 'out').length, [rows])
  const hotCount = useMemo(() => rows.filter((item) => item.status === 'hot').length, [rows])

  const kpiItems = useMemo(() => ([
    { key: 'tong', label: 'Tổng tồn kho', value: numberFormatter.format(totalStock), icon: Layers },
    { key: 'low', label: 'Sắp hết hàng', value: numberFormatter.format(lowCount), icon: AlertTriangle },
    { key: 'out', label: 'Hết hàng', value: numberFormatter.format(outCount), icon: AlertTriangle },
    { key: 'hot', label: 'Bán chạy', value: numberFormatter.format(hotCount), icon: Flame }
  ]), [totalStock, lowCount, outCount, hotCount])

  const activeKpiKey = useMemo(() => {
    if (smartFilter === 'low') return 'low'
    if (smartFilter === 'out') return 'out'
    if (smartFilter === 'hot') return 'hot'
    return 'tong'
  }, [smartFilter])

  return (
    <div className="grid grid-cols-12 gap-4">
      <header className="col-span-12 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Quản lý kho</h2>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tồn kho, cảnh báo sớm và dự đoán hết hàng
        </p>
      </header>

      <div className="col-span-12">
        <InventoryFilterBar
          search={search}
          onSearchChange={setSearch}
          smartFilter={smartFilter}
          onSmartFilterChange={setSmartFilter}
          sizeFilter={sizeFilter}
          onSizeFilterChange={setSizeFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          sizeOptions={sizeOptions}
          categoryOptions={categoryOptions}
        />
      </div>

      {error ? (
        <section className="col-span-12 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {error}
        </section>
      ) : null}

      <div className="col-span-12">
        <InventoryKPI
          items={kpiItems}
          activeKey={activeKpiKey}
          onCardClick={(key) => {
            if (key === 'tong') {
              setSmartFilter('all')
              return
            }
            setSmartFilter((prev) => (prev === key ? 'all' : key))
          }}
        />
      </div>

      <div className="col-span-12">
        <InventoryTable
          rows={paginatedRows}
          loading={loading}
          onRowClick={(row) => navigate(`/owner/inventory/${row.id}`)}
        />
      </div>

      {!loading ? (
        <section className="col-span-12 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            Hiển thị {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} trên tổng {totalItems} sản phẩm
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              Trang {safeCurrentPage}/{totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : null}

    </div>
  )
}

export default InventoryDashboardPage
