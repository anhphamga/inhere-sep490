import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { INVENTORY_PAGE_SIZE } from '../../features/inventory/config/inventory.constants'
import { useInventoryProductDetailData } from '../../features/inventory/hooks/useInventoryProductDetailData'
import InventoryProductFilterBar from '../../features/inventory/components/InventoryProductFilterBar'
import InventoryProductInstancesTable from '../../features/inventory/components/InventoryProductInstancesTable'
import {
  normalizeLifecycleStatus,
  sortInstancesByStatusAndSize,
  toConditionLevel
} from '../../features/inventory/utils/inventory.transformers'
import {
  deleteInventoryInstanceApi,
  updateInventoryInstanceApi
} from '../../features/inventory/api/inventory.api'

export default function InventoryProductDetailPage() {
  const navigate = useNavigate()
  const { productId } = useParams()

  const {
    loading,
    error,
    instances,
    setInstances,
    product,
    productDefaults,
    reload
  } = useInventoryProductDetailData(productId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({
    lifecycleStatus: 'Available',
    conditionScore: 100,
    currentRentPrice: 0,
    currentSalePrice: 0
  })
  const [savingId, setSavingId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    reload()
  }, [reload])

  const filteredInstances = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = instances.filter((item) => {
      const matchesQuery = !query
        || item.id.toLowerCase().includes(query)
        || item.size.toLowerCase().includes(query)
        || item.note.toLowerCase().includes(query)

      const matchesStatus = !statusFilter || item.lifecycleStatus === statusFilter
      const matchesCondition = !conditionFilter || String(item.conditionScore) === conditionFilter

      return matchesQuery && matchesStatus && matchesCondition
    })

    return sortInstancesByStatusAndSize(filtered)
  }, [instances, search, statusFilter, conditionFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, conditionFilter])

  const totalItems = filteredInstances.length
  const totalPages = Math.max(1, Math.ceil(totalItems / INVENTORY_PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * INVENTORY_PAGE_SIZE
  const endIndex = Math.min(startIndex + INVENTORY_PAGE_SIZE, totalItems)
  const paginatedInstances = filteredInstances.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleEdit = (item) => {
    if (!item?.id) return
    if (item.lifecycleStatus === 'Sold') return
    setEditingId(item.id)
    setEditForm({
      lifecycleStatus: item.lifecycleStatus || 'Available',
      conditionScore: Number(item.conditionScore || 100),
      currentRentPrice: Number(item.currentRentPrice || 0),
      currentSalePrice: Number(item.currentSalePrice || 0)
    })
  }

  const handleCancelEdit = () => {
    setEditingId('')
    setEditForm({ lifecycleStatus: 'Available', conditionScore: 100, currentRentPrice: 0, currentSalePrice: 0 })
  }

  const handleSaveEdit = async (item) => {
    if (!item?.id) return
    if (item.lifecycleStatus === 'Sold') return
    try {
      setSavingId(item.id)

      const payload = {
        lifecycleStatus: editForm.lifecycleStatus || item.lifecycleStatus,
        conditionLevel: toConditionLevel(editForm.conditionScore),
        conditionScore: Number(editForm.conditionScore || 100),
        currentRentPrice: Number(editForm.currentRentPrice || 0),
        currentSalePrice: Number(editForm.currentSalePrice || 0),
        note: item.note || ''
      }

      const response = await updateInventoryInstanceApi(item.id, payload)
      const updated = response?.data

      setInstances((prev) => prev.map((row) => {
        if (row.id !== item.id) return row
        return {
          ...row,
          lifecycleStatus: normalizeLifecycleStatus(updated?.lifecycleStatus ?? updated?.status ?? payload.lifecycleStatus),
          conditionScore: Number(updated?.conditionScore ?? payload.conditionScore),
          currentRentPrice: Number(updated?.currentRentPrice ?? updated?.rentPrice ?? payload.currentRentPrice ?? productDefaults.baseRentPrice),
          currentSalePrice: Number(updated?.currentSalePrice ?? updated?.salePrice ?? payload.currentSalePrice ?? productDefaults.baseSalePrice)
        }
      }))

      setEditingId('')
      setEditForm({ lifecycleStatus: 'Available', conditionScore: 100, currentRentPrice: 0, currentSalePrice: 0 })
    } catch (apiError) {
      window.alert(
        apiError?.response?.data?.error
        || apiError?.response?.data?.message
        || apiError?.message
        || 'Không thể lưu thay đổi.'
      )
    } finally {
      setSavingId('')
    }
  }

  const handleDeleteInstance = async (item) => {
    if (!item?.id || deletingId) return
    if (item.lifecycleStatus !== 'Available') {
      window.alert('Chỉ xóa được phiên bản ở trạng thái Có sẵn.')
      return
    }
    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa phiên bản ${item.id} (size ${item.size || 'Không rõ'})?\nHành động này không thể hoàn tác.`
    )
    if (!confirmDelete) return

    try {
      setDeletingId(item.id)
      await deleteInventoryInstanceApi(item.id)
      setInstances((prev) => prev.filter((row) => row.id !== item.id))
      if (editingId === item.id) {
        setEditingId('')
        setEditForm({ lifecycleStatus: 'Available', conditionScore: 100, currentRentPrice: 0, currentSalePrice: 0 })
      }
      window.alert('Đã xóa phiên bản thành công.')
    } catch (apiError) {
      window.alert(
        apiError?.response?.data?.error
        || apiError?.response?.data?.message
        || apiError?.message
        || 'Không thể xóa phiên bản.'
      )
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/owner/inventory')}
          className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại kho
        </button>

        <div className="flex items-center gap-3">
          <img src={product.image} alt={product.name} className="h-14 w-14 rounded-xl object-cover bg-slate-100" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500">Tổng phiên bản: {instances.length}</p>
          </div>
        </div>
      </section>

      <InventoryProductFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        conditionFilter={conditionFilter}
        onConditionFilterChange={setConditionFilter}
        SearchIcon={Search}
      />

      {error ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {error}
        </section>
      ) : null}

      <InventoryProductInstancesTable
        loading={loading}
        items={paginatedInstances}
        product={product}
        editingId={editingId}
        editForm={editForm}
        setEditForm={setEditForm}
        savingId={savingId}
        deletingId={deletingId}
        onEdit={handleEdit}
        onDelete={handleDeleteInstance}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
      />

      {!loading ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            Hiển thị {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} trên tổng {totalItems} phiên bản
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
