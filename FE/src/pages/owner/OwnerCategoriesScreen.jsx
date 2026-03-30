import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import {
    createOwnerCategoryApi,
    deleteOwnerCategoryApi,
    getOwnerCategoriesApi,
    updateOwnerCategoryApi,
} from '../../services/owner.service'
import { normalizeCategoryTree } from '../../utils/categoryTree'

const initialForm = {
    name: '',
    slug: '',
    parentId: '',
    sortOrder: '0',
    type: 'rent',
    isActive: true,
}

export default function OwnerCategoriesScreen() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [expanded, setExpanded] = useState({})
    const [editingId, setEditingId] = useState('')
    const [form, setForm] = useState(initialForm)

    const categoryTree = useMemo(() => normalizeCategoryTree(categories), [categories])

    const loadCategories = async () => {
        try {
            setLoading(true)
            setError('')
            const response = await getOwnerCategoriesApi()
            setCategories(Array.isArray(response?.categories) ? response.categories : [])
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh mục.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    useEffect(() => {
        const next = {}
        const visit = (items = []) => {
            items.forEach((item) => {
                if (item.children?.length) next[item.id] = true
                visit(item.children || [])
            })
        }
        visit(categoryTree)
        setExpanded((prev) => ({ ...next, ...prev }))
    }, [categoryTree])

    const resetForm = () => {
        setEditingId('')
        setForm(initialForm)
    }

    const startCreateChild = (node) => {
        setEditingId('')
        setForm({
            ...initialForm,
            parentId: node?.id || '',
        })
    }

    const startEdit = (node) => {
        setEditingId(node.id)
        setForm({
            name: node.name,
            slug: node.raw?.slug || '',
            parentId: node.raw?.parentId || '',
            sortOrder: String(node.raw?.sortOrder || 0),
            type: node.raw?.type || 'rent',
            isActive: node.raw?.isActive !== false,
        })
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        try {
            setSaving(true)
            setError('')
            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim(),
                parentId: form.parentId || null,
                sortOrder: Number(form.sortOrder || 0),
                type: form.type || 'rent',
                isActive: Boolean(form.isActive),
            }

            if (editingId) {
                await updateOwnerCategoryApi(editingId, payload)
            } else {
                await createOwnerCategoryApi(payload)
            }

            resetForm()
            await loadCategories()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không lưu được danh mục.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (node) => {
        if (!window.confirm(`Xóa danh mục "${node.name}"?`)) return
        try {
            await deleteOwnerCategoryApi(node.id)
            await loadCategories()
        } catch (apiError) {
            setError(apiError?.response?.data?.message || apiError?.message || 'Không xóa được danh mục.')
        }
    }

    const renderNode = (node) => {
        const hasChildren = Array.isArray(node.children) && node.children.length > 0
        const isOpen = expanded[node.id] !== false

        return (
            <div key={node.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="min-w-0 flex items-center gap-3">
                        <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                            disabled={!hasChildren}
                            onClick={() => setExpanded((prev) => ({ ...prev, [node.id]: !isOpen }))}
                        >
                            {hasChildren ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="text-xs">•</span>}
                        </button>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{node.name}</p>
                            <p className="truncate text-xs text-slate-500">{node.label}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{node.raw?.slug || 'no-slug'}</span>
                        <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs" onClick={() => startCreateChild(node)}>
                            <Plus className="h-3.5 w-3.5" />
                            Thêm con
                        </button>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600" onClick={() => startEdit(node)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 disabled:opacity-40" disabled={hasChildren} onClick={() => handleDelete(node)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {hasChildren && isOpen ? (
                    <div className="ml-8 space-y-3 border-l border-dashed border-slate-200 pl-4">
                        {node.children.map((child) => renderNode(child))}
                    </div>
                ) : null}
            </div>
        )
    }

    const parentOptions = useMemo(() => {
        const out = []
        const visit = (items = []) => {
            items.forEach((item) => {
                out.push({ value: item.id, label: item.label })
                visit(item.children || [])
            })
        }
        visit(categoryTree)
        return out
    }, [categoryTree])

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Sửa danh mục' : 'Tạo danh mục'}</h2>
                            <p className="text-sm text-slate-500">Có thể tạo danh mục con cho bất kỳ danh mục nào.</p>
                        </div>
                        {editingId || form.parentId ? <button type="button" className="text-sm text-slate-500" onClick={resetForm}>Bỏ chọn</button> : null}
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <Field label="Tên danh mục" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
                        <Field label="Slug" value={form.slug} onChange={(value) => setForm((prev) => ({ ...prev, slug: value }))} placeholder="de-trong-de-tu-tao" />
                        <Select label="Danh mục cha" value={form.parentId} onChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))} options={parentOptions} placeholder="Danh mục gốc" />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Thứ tự" type="number" value={form.sortOrder} onChange={(value) => setForm((prev) => ({ ...prev, sortOrder: value }))} />
                            <Select label="Loại" value={form.type} onChange={(value) => setForm((prev) => ({ ...prev, type: value }))} options={[{ value: 'rent', label: 'rent' }, { value: 'sale', label: 'sale' }, { value: 'service', label: 'service' }]} />
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
                            Đang hoạt động
                        </label>
                        <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1975d2] px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
                            {saving ? 'Đang lưu...' : editingId ? 'Cập nhật danh mục' : 'Tạo danh mục'}
                        </button>
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Cây danh mục</h2>
                            <p className="text-sm text-slate-500">Danh mục có thể lồng nhiều tầng.</p>
                        </div>
                        <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold" onClick={resetForm}>
                            <Plus className="h-4 w-4" />
                            Danh mục gốc
                        </button>
                    </div>

                    {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}
                    {loading ? <p className="text-sm text-slate-500">Đang tải danh mục...</p> : null}
                    {!loading && categoryTree.length === 0 ? <p className="text-sm text-slate-500">Chưa có danh mục nào.</p> : null}
                    <div className="space-y-3">
                        {categoryTree.map((node) => renderNode(node))}
                    </div>
                </section>
            </div>
        </div>
    )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1975d2]" />
        </div>
    )
}

function Select({ label, value, onChange, options = [], placeholder = 'Chọn' }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1975d2]">
                <option value="">{placeholder}</option>
                {options.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                ))}
            </select>
        </div>
    )
}
