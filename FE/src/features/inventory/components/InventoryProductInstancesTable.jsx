import { Edit2, Save, Trash2, X } from 'lucide-react'
import {
  INSTANCE_CONDITION_SCORE_OPTIONS,
  INSTANCE_STATUS_EDIT_OPTIONS,
  INSTANCE_STATUS_META
} from '../config/inventory.constants'
import { getConditionClass, getConditionLabel } from '../utils/inventory.transformers'

const InventoryProductInstancesTable = ({
  loading,
  items,
  product,
  editingId,
  editForm,
  setEditForm,
  savingId,
  deletingId,
  onEdit,
  onDelete,
  onCancelEdit,
  onSaveEdit
}) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Sản phẩm</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Kích cỡ</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Tình trạng</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Điểm</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Giá thuê</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Giá bán</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  Không có phiên bản phù hợp.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const status = INSTANCE_STATUS_META[item.lifecycleStatus] || { label: 'Không rõ', className: 'bg-slate-100 text-slate-700' }
                const isSold = item.lifecycleStatus === 'Sold'
                const canDelete = item.lifecycleStatus === 'Available'
                return (
                  <tr key={item.id} className={`transition ${isSold ? 'bg-slate-50/60' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
                        <div>
                          <p className="max-w-[260px] truncate font-semibold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.size}</td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <select
                          value={editForm.lifecycleStatus}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, lifecycleStatus: event.target.value }))}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
                        >
                          {INSTANCE_STATUS_EDIT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <select
                          value={editForm.conditionScore}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, conditionScore: Number(event.target.value) }))}
                          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm outline-none focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
                        >
                          {INSTANCE_CONDITION_SCORE_OPTIONS.map((score) => (
                            <option key={score} value={score}>{score}%</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConditionClass(item.conditionScore)}`}>
                          {getConditionLabel(item.conditionScore)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{Number.isFinite(Number(item.conditionScore)) ? `${item.conditionScore}%` : '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editForm.currentRentPrice}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, currentRentPrice: Number(event.target.value) }))}
                          className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
                        />
                      ) : (
                        `${Number(item.currentRentPrice || 0).toLocaleString('vi-VN')}đ`
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min={0}
                          value={editForm.currentSalePrice}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, currentSalePrice: Number(event.target.value) }))}
                          className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#1975d2] focus:ring-2 focus:ring-[#1975d2]/20"
                        />
                      ) : (
                        `${Number(item.currentSalePrice || 0).toLocaleString('vi-VN')}đ`
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.note || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {editingId === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSaveEdit(item)}
                            disabled={savingId === item.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            title="Lưu"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={onCancelEdit}
                            disabled={savingId === item.id}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            title="Hủy"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            disabled={isSold}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                              isSold ? 'cursor-not-allowed text-slate-300' : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title={isSold ? 'Sản phẩm đã bán không thể chỉnh sửa' : 'Sửa trạng thái, điểm và giá'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete?.(item)}
                            disabled={!canDelete || deletingId === item.id}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                              !canDelete ? 'cursor-not-allowed text-slate-300' : 'text-rose-600 hover:bg-rose-50'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            title={canDelete ? 'Xóa phiên bản' : 'Chỉ xóa được phiên bản ở trạng thái Có sẵn'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default InventoryProductInstancesTable
