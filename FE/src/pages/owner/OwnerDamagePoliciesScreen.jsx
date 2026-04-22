import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, X, Save, AlertTriangle } from 'lucide-react'
import {
  listDamagePoliciesApi,
  createDamagePolicyApi,
  updateDamagePolicyApi,
  deleteDamagePolicyApi,
} from '../../services/damage-policy.service'
import { getOwnerCategoriesApi } from '../../services/owner.service'

const TRIGGER_OPTIONS = [
  { value: 'Washing', label: 'Washing (đi giặt)' },
  { value: 'Repair', label: 'Repair (đi sửa chữa)' },
  { value: 'Lost', label: 'Lost (coi như mất)' },
]

const CONDITION_OPTIONS = [
  { value: 'Normal', label: 'Bình thường' },
  { value: 'Dirty', label: 'Bẩn' },
  { value: 'Damaged', label: 'Hỏng' },
  { value: 'Lost', label: 'Mất' },
]

const flattenCategories = (nodes, depth = 0, out = []) => {
  (nodes || []).forEach((node) => {
    out.push({ id: String(node._id || node.id), label: `${'— '.repeat(depth)}${node.displayName || node.rawName || node.value}`, depth })
    if (Array.isArray(node.children) && node.children.length) {
      flattenCategories(node.children, depth + 1, out)
    }
  })
  return out
}

const emptyLevel = (idx = 0) => ({
  key: `level_${idx + 1}`,
  label: '',
  description: '',
  penaltyPercent: 0,
  triggerLifecycle: 'Repair',
  condition: 'Damaged',
  sortOrder: idx,
})

export default function OwnerDamagePoliciesScreen() {
  const [policies, setPolicies] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    scope: 'global',
    categoryId: '',
    isActive: true,
    levels: [emptyLevel(0)],
  })

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError('')
      const [policiesRes, catsRes] = await Promise.all([
        listDamagePoliciesApi(),
        getOwnerCategoriesApi().catch(() => ({ categories: [] })),
      ])
      setPolicies(policiesRes?.data || [])
      setCategories(catsRes?.categories || [])
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Không tải được danh sách chính sách')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      scope: 'global',
      categoryId: '',
      isActive: true,
      levels: [
        { key: 'dirty_light', label: 'Bẩn nhẹ', description: 'Vết bẩn có thể giặt sạch', penaltyPercent: 5, triggerLifecycle: 'Washing', condition: 'Dirty', sortOrder: 0 },
        { key: 'damaged_minor', label: 'Hỏng nhẹ', description: 'Rách nhỏ, tuột chỉ, đứt cúc', penaltyPercent: 20, triggerLifecycle: 'Repair', condition: 'Damaged', sortOrder: 1 },
        { key: 'damaged_major', label: 'Hỏng nặng', description: 'Rách lớn, không thể sửa', penaltyPercent: 60, triggerLifecycle: 'Repair', condition: 'Damaged', sortOrder: 2 },
        { key: 'lost', label: 'Mất sản phẩm', description: 'Sản phẩm không được trả lại', penaltyPercent: 100, triggerLifecycle: 'Lost', condition: 'Lost', sortOrder: 3 },
      ],
    })
    setShowForm(true)
  }

  const openEdit = (policy) => {
    setEditing(policy)
    setForm({
      name: policy.name || '',
      description: policy.description || '',
      scope: policy.scope || 'global',
      categoryId: policy.categoryId?._id || policy.categoryId || '',
      isActive: policy.isActive !== false,
      levels: (policy.levels || []).map((l, idx) => ({
        key: l.key || `level_${idx + 1}`,
        label: l.label || '',
        description: l.description || '',
        penaltyPercent: Number(l.penaltyPercent || 0),
        triggerLifecycle: l.triggerLifecycle || 'Repair',
        condition: l.condition || 'Damaged',
        sortOrder: Number(l.sortOrder ?? idx),
      })),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const handleLevelChange = (idx, field, value) => {
    setForm((prev) => {
      const next = [...prev.levels]
      next[idx] = { ...next[idx], [field]: value }
      return { ...prev, levels: next }
    })
  }

  const addLevel = () => {
    setForm((prev) => ({ ...prev, levels: [...prev.levels, emptyLevel(prev.levels.length)] }))
  }

  const removeLevel = (idx) => {
    setForm((prev) => ({ ...prev, levels: prev.levels.filter((_, i) => i !== idx) }))
  }

  const validateForm = () => {
    if (!form.name.trim()) return 'Vui lòng nhập tên chính sách'
    if (form.scope === 'category' && !form.categoryId) return 'Vui lòng chọn danh mục áp dụng'
    if (form.levels.length === 0) return 'Phải có ít nhất 1 mức hư hỏng'

    const keys = new Set()
    for (const lvl of form.levels) {
      if (!lvl.label.trim()) return 'Tất cả các mức đều phải có tên'
      if (!lvl.key.trim()) return 'Tất cả các mức đều phải có key'
      const k = lvl.key.trim().toLowerCase()
      if (keys.has(k)) return `Key "${lvl.key}" bị trùng, vui lòng đặt key duy nhất`
      keys.add(k)
      const p = Number(lvl.penaltyPercent)
      if (!Number.isFinite(p) || p < 0 || p > 100) return `Mức "${lvl.label}" có % không hợp lệ (0-100)`
    }
    return ''
  }

  const handleSubmit = async () => {
    const errMsg = validateForm()
    if (errMsg) {
      alert(errMsg)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        scope: form.scope,
        categoryId: form.scope === 'category' ? form.categoryId : null,
        isActive: form.isActive,
        levels: form.levels.map((l, idx) => ({
          ...l,
          penaltyPercent: Number(l.penaltyPercent),
          sortOrder: Number(l.sortOrder ?? idx),
        })),
      }
      if (editing) {
        await updateDamagePolicyApi(editing._id, payload)
      } else {
        await createDamagePolicyApi(payload)
      }
      await fetchAll()
      closeForm()
    } catch (err) {
      alert(err?.response?.data?.message || 'Không lưu được chính sách')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (policy) => {
    if (!confirm(`Vô hiệu hóa chính sách "${policy.name}"?`)) return
    try {
      await deleteDamagePolicyApi(policy._id)
      await fetchAll()
    } catch (err) {
      alert(err?.response?.data?.message || 'Không xóa được chính sách')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chính sách hư hỏng</h1>
          <p className="text-sm text-slate-500">
            Định nghĩa các mức đánh giá tình trạng sản phẩm khi khách trả. Staff sẽ áp dụng tự động theo % giá trị sản phẩm.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Tạo chính sách
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Phạm vi</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Số mức</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Đang tải...</td>
              </tr>
            )}
            {!loading && policies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Chưa có chính sách nào. Hãy tạo mới để staff có thể áp dụng khi trả đồ.
                </td>
              </tr>
            )}
            {policies.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  {p.description && <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    p.scope === 'global' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {p.scope === 'global' ? 'Toàn hệ thống' : 'Theo danh mục'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.scope === 'category'
                    ? (p.categoryId?.displayName?.vi || p.categoryId?.displayName?.en || p.categoryId?.name?.vi || p.categoryId?.name?.en || p.categoryId?.slug || '—')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.levels?.length || 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {p.isActive ? 'Đang áp dụng' : 'Đã tắt'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={14} /> Sửa
                    </button>
                    {p.isActive && (
                      <button
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} /> Tắt
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editing ? 'Chỉnh sửa chính sách' : 'Tạo chính sách mới'}
              </h3>
              <button onClick={closeForm} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tên chính sách *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="VD: Chính sách mặc định cho áo dài"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phạm vi áp dụng *</label>
                  <select
                    value={form.scope}
                    onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value, categoryId: '' }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="global">Toàn hệ thống (fallback)</option>
                    <option value="category">Theo danh mục cụ thể</option>
                  </select>
                </div>
              </div>

              {form.scope === 'category' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Danh mục *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Kích hoạt chính sách
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Các mức hư hỏng</h4>
                  <button
                    onClick={addLevel}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus size={14} /> Thêm mức
                  </button>
                </div>
                <div className="space-y-3">
                  {form.levels.map((lvl, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Mức #{idx + 1}</span>
                        <button
                          onClick={() => removeLevel(idx)}
                          className="rounded-md p-1 text-red-500 hover:bg-red-50"
                          disabled={form.levels.length <= 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Key *</label>
                          <input
                            type="text"
                            value={lvl.key}
                            onChange={(e) => handleLevelChange(idx, 'key', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                            placeholder="dirty_light"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tên hiển thị *</label>
                          <input
                            type="text"
                            value={lvl.label}
                            onChange={(e) => handleLevelChange(idx, 'label', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                            placeholder="Bẩn nhẹ"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">% giá trị sản phẩm *</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={lvl.penaltyPercent}
                            onChange={(e) => handleLevelChange(idx, 'penaltyPercent', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Trạng thái vòng đời sau trả</label>
                          <select
                            value={lvl.triggerLifecycle}
                            onChange={(e) => handleLevelChange(idx, 'triggerLifecycle', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                          >
                            {TRIGGER_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Tình trạng</label>
                          <select
                            value={lvl.condition}
                            onChange={(e) => handleLevelChange(idx, 'condition', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                          >
                            {CONDITION_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả chi tiết</label>
                          <input
                            type="text"
                            value={lvl.description}
                            onChange={(e) => handleLevelChange(idx, 'description', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                            placeholder="VD: Vết bẩn có thể giặt sạch"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-400"
              >
                <Save size={16} /> {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
