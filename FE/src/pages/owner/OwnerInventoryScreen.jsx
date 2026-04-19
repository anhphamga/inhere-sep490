import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle
} from 'lucide-react'
import axiosClient from '../../config/axios'
import { formatConditionLabel, getConditionBadgeClass } from '../../utils/formatConditionLabel'

const conditionScoreOptions = [0, 25, 50, 75, 100]

const conditionLevelOptions = [
  { value: '', label: 'Tất cả tình trạng' },
  { value: 'New', label: formatConditionLabel(100) },
  { value: 'Used', label: formatConditionLabel(75) },
]

const lifecycleStatusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'Available', label: 'Có sẵn' },
  { value: 'Reserved', label: 'Đang giữ đồ' },
  { value: 'Rented', label: 'Đang thuê' },
  { value: 'Washing', label: 'Đang giặt' },
  { value: 'Repair', label: 'Đang sửa' },
  { value: 'Lost', label: 'Mất' },
  { value: 'Sold', label: 'Đã bán' }
]

const lifecycleStatusColors = {
  Available: 'bg-green-100 text-green-800',
  Reserved: 'bg-amber-100 text-amber-800',
  Rented: 'bg-purple-100 text-purple-800',
  Washing: 'bg-cyan-100 text-cyan-800',
  Repair: 'bg-orange-100 text-orange-800',
  Lost: 'bg-red-100 text-red-800',
  Sold: 'bg-slate-100 text-slate-700'
}

const sortInstancesBySoldLast = (list = []) =>
  [...list].sort((a, b) => {
    const aSold = a?.lifecycleStatus === 'Sold'
    const bSold = b?.lifecycleStatus === 'Sold'
    if (aSold === bSold) return 0
    return aSold ? 1 : -1
  })

export default function OwnerInventoryScreen() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })

  // Filter states
  const [conditionLevel, setConditionLevel] = useState(searchParams.get('conditionLevel') || '')
  const [lifecycleStatus, setLifecycleStatus] = useState(searchParams.get('lifecycleStatus') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const pageParam = searchParams.get('page') || '1'

  // Edit states
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Fetch data
  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      params.append('page', pageParam)
      params.append('limit', 20)
      if (conditionLevel) params.append('conditionLevel', conditionLevel)
      if (lifecycleStatus) params.append('lifecycleStatus', lifecycleStatus)
      if (search) params.append('search', search)

      const response = await axiosClient.get(`/products/instances?${params.toString()}`)
      const nextInstances = Array.isArray(response.data.data) ? response.data.data : []
      setInstances(sortInstancesBySoldLast(nextInstances))
      setPagination(response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 })
    } catch (err) {
      setError('Không thể tải dữ liệu tồn kho')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [conditionLevel, lifecycleStatus, search, pageParam])

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.set('page', 1) // Reset to page 1
    setSearchParams(params)
  }

  // Handle edit
  const handleEdit = (instance) => {
    if (instance?.lifecycleStatus === 'Sold') return

    const normalizedConditionScore = conditionScoreOptions.includes(instance.conditionScore)
      ? instance.conditionScore
      : 100

    setEditingId(instance._id)
    setEditForm({
      conditionScore: normalizedConditionScore,
      lifecycleStatus: instance.lifecycleStatus,
      currentRentPrice: instance.currentRentPrice,
      currentSalePrice: instance.currentSalePrice,
      note: instance.note || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (id) => {
    try {
      setLoading(true)
      const payload = {
        conditionScore: editForm.conditionScore,
        lifecycleStatus: editForm.lifecycleStatus,
        currentRentPrice: editForm.currentRentPrice,
        currentSalePrice: editForm.currentSalePrice,
        note: editForm.note
      }
      const response = await axiosClient.put(`/products/instances/${id}`, payload)

      if (response.data.success) {
        setInstances(prevInstances => 
          sortInstancesBySoldLast(prevInstances.map(inst =>
            inst._id === id ? response.data.data : inst
          ))
        )
        setEditingId(null)
        setEditForm({})
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return

    try {
      setLoading(true)
      await axiosClient.delete(`/products/instances/${id}`)
      setInstances(prevInstances => prevInstances.filter(inst => inst._id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa')
    } finally {
      setLoading(false)
    }
  }

  // Pagination
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage)
    setSearchParams(params)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tồn kho</h1>
          <p className="text-sm text-gray-500">Quản lý các sản phẩm vật lý (instances)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange({ search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Filter by Condition Level */}
          <select
            value={conditionLevel}
            onChange={(e) => {
              setConditionLevel(e.target.value)
              handleFilterChange({ conditionLevel: e.target.value })
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {conditionLevelOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.value === 'New' ? formatConditionLabel(100) : (opt.value === 'Used' ? formatConditionLabel(75) : opt.label)}</option>
            ))}
          </select>

          {/* Filter by Lifecycle Status */}
          <select
            value={lifecycleStatus}
            onChange={(e) => {
              setLifecycleStatus(e.target.value)
              handleFilterChange({ lifecycleStatus: e.target.value })
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {lifecycleStatusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tình trạng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá thuê</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá bán</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-pink-600 border-t-transparent"></div>
                    <p className="mt-2">Đang tải...</p>
                  </td>
                </tr>
              ) : instances.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>Không có sản phẩm nào</p>
                  </td>
                </tr>
              ) : (
                instances.map((instance) => (
                  <tr key={instance._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={instance.productId?.images?.[0] || '/placeholder.png'}
                          alt={instance.productId?.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{instance.productId?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{instance.productId?.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionBadgeClass(conditionScoreOptions.includes(instance.conditionScore) ? instance.conditionScore : 100)}`}>
                        {formatConditionLabel(conditionScoreOptions.includes(instance.conditionScore) ? instance.conditionScore : 100)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === instance._id ? (
                        <select
                          value={editForm.conditionScore}
                          onChange={(e) => setEditForm({ ...editForm, conditionScore: Number(e.target.value) })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {conditionScoreOptions.map((score) => (
                            <option key={score} value={score}>{score}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm">{conditionScoreOptions.includes(instance.conditionScore) ? instance.conditionScore : 100}/100</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === instance._id ? (
                        <select
                          value={editForm.lifecycleStatus}
                          onChange={(e) => setEditForm({ ...editForm, lifecycleStatus: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="Available">Có sẵn</option>
                          <option value="Reserved">Đang giữ đồ</option>
                          <option value="Rented">Đang thuê</option>
                          <option value="Washing">Đang giặt</option>
                          <option value="Repair">Đang sửa</option>
                          <option value="Lost">Mất</option>
                          <option value="Sold">Đã bán</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${lifecycleStatusColors[instance.lifecycleStatus] || 'bg-gray-100'}`}>
                          {instance.lifecycleStatus === 'Available' ? 'Có sẵn' :
                           instance.lifecycleStatus === 'Reserved' ? 'Đang giữ đồ' :
                           instance.lifecycleStatus === 'Rented' ? 'Đang thuê' :
                           instance.lifecycleStatus === 'Washing' ? 'Đang giặt' :
                           instance.lifecycleStatus === 'Repair' ? 'Đang sửa' :
                           instance.lifecycleStatus === 'Lost' ? 'Mất' :
                           instance.lifecycleStatus === 'Sold' ? 'Đã bán' : instance.lifecycleStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === instance._id ? (
                        <input
                          type="number"
                          value={editForm.currentRentPrice}
                          onChange={(e) => setEditForm({ ...editForm, currentRentPrice: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm font-medium">{instance.currentRentPrice?.toLocaleString('vi-VN')}đ</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === instance._id ? (
                        <input
                          type="number"
                          value={editForm.currentSalePrice}
                          onChange={(e) => setEditForm({ ...editForm, currentSalePrice: Number(e.target.value) })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm font-medium">{instance.currentSalePrice?.toLocaleString('vi-VN')}đ</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === instance._id ? (
                        <input
                          type="text"
                          value={editForm.note}
                          onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Ghi chú..."
                        />
                      ) : (
                        <span className="text-sm text-gray-500 truncate max-w-[150px] block">{instance.note || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === instance._id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(instance._id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Lưu"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(instance)}
                              className={`p-1 rounded ${instance.lifecycleStatus === 'Sold' ? 'cursor-not-allowed text-gray-400' : 'text-blue-600 hover:bg-blue-50'}`}
                              title={instance.lifecycleStatus === 'Sold' ? 'San pham da ban khong the chinh sua' : 'Sửa'}
                              disabled={instance.lifecycleStatus === 'Sold'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {instance.lifecycleStatus === 'Available' && (
                              <button
                                onClick={() => handleDelete(instance._id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <div className="text-sm text-gray-500">
              Trang {pagination.page} / {pagination.pages} ({pagination.total} sản phẩm)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
