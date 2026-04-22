import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  fetchCategories,
  removeCategory,
  updateCategory
} from '../services/categoryApi'
import { buildCategoryTree, collectDescendantIds, flattenTree } from '../utils/buildTree'

const initialForm = {
  name: '',
  parentId: '',
  isActive: true
}

const MAX_CATEGORY_NAME = 120

const slugifyVi = (value = '') =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeText = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .trim()

const matchesKeyword = (text = '', keyword = '') => {
  const q = normalizeText(keyword)
  if (!q) return true
  return normalizeText(text).includes(q)
}

const filterTree = (nodes = [], { keyword = '', status = 'all' } = {}) => {
  const visit = (items = []) => {
    const output = []
    items.forEach((item) => {
      const children = visit(item.children || [])
      const statusMatch = status === 'all'
        ? true
        : status === 'active'
          ? item.isActive !== false
          : item.isActive === false
      const keywordMatch = matchesKeyword(item.name, keyword)
      const selfMatch = statusMatch && keywordMatch

      if (selfMatch || children.length > 0) {
        output.push({
          ...item,
          children
        })
      }
    })
    return output
  }

  return visit(nodes)
}

export const useCategoryTree = () => {
  const [rawCategories, setRawCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [expandedIds, setExpandedIds] = useState({})
  const [selectedId, setSelectedId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingNode, setEditingNode] = useState(null)
  const [form, setForm] = useState(initialForm)

  const [deleteTarget, setDeleteTarget] = useState(null)

  const tree = useMemo(() => buildCategoryTree(rawCategories), [rawCategories])
  const flatNodes = useMemo(() => flattenTree(tree), [tree])
  const nodeById = useMemo(() => new Map(flatNodes.map((item) => [item.id, item])), [flatNodes])

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = { ...prev }
      flatNodes.forEach((node) => {
        if ((node.children || []).length > 0 && typeof next[node.id] === 'undefined') {
          next[node.id] = true
        }
      })
      return next
    })
  }, [flatNodes])

  const filteredTree = useMemo(
    () => filterTree(tree, { keyword: searchKeyword, status: statusFilter }),
    [tree, searchKeyword, statusFilter]
  )

  const excludedParentIds = useMemo(() => {
    if (!editingNode) return new Set()
    const ids = collectDescendantIds(editingNode)
    ids.add(editingNode.id)
    return ids
  }, [editingNode])

  const parentOptions = useMemo(() => {
    return flatNodes
      .filter((item) => !excludedParentIds.has(item.id))
      .map((item) => ({ value: item.id, label: item.label }))
  }, [flatNodes, excludedParentIds])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const categories = await fetchCategories()
      setRawCategories(categories)
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh mục.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setEditingNode(null)
    setForm(initialForm)
  }, [])

  const selectNode = useCallback((nodeId) => {
    setSelectedId(String(nodeId || ''))
  }, [])

  const toggleExpand = useCallback((nodeId) => {
    const key = String(nodeId || '')
    if (!key) return
    setExpandedIds((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const expandAll = useCallback(() => {
    const next = {}
    flatNodes.forEach((node) => {
      if ((node.children || []).length > 0) next[node.id] = true
    })
    setExpandedIds(next)
  }, [flatNodes])

  const collapseAll = useCallback(() => {
    const next = {}
    flatNodes.forEach((node) => {
      if ((node.children || []).length > 0) next[node.id] = false
    })
    setExpandedIds(next)
  }, [flatNodes])

  const startCreateRoot = useCallback(() => {
    setSelectedId('')
    setEditingNode(null)
    setForm(initialForm)
    setIsDrawerOpen(true)
    setError('')
  }, [])

  const startCreateChild = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node
    setSelectedId(String(resolved?.id || ''))
    setEditingNode(null)
    setForm({
      ...initialForm,
      parentId: String(resolved?.id || '')
    })
    setIsDrawerOpen(true)
    setError('')
    if (resolved?.id) {
      setExpandedIds((prev) => ({ ...prev, [resolved.id]: true }))
    }
  }, [nodeById])

  const startEdit = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node
    setSelectedId(String(resolved?.id || ''))
    setEditingNode(resolved || null)
    setForm({
      name: String(resolved?.name || ''),
      parentId: String(resolved?.parentId || ''),
      isActive: resolved?.isActive !== false
    })
    setIsDrawerOpen(true)
    setError('')
  }, [nodeById])

  const requestDelete = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node
    if (!resolved?.id) return

    if (Array.isArray(resolved.children) && resolved.children.length > 0) {
      setError('Không thể xóa danh mục cha khi vẫn còn danh mục con.')
      return
    }

    if (Number(resolved.count || 0) > 0) {
      setError('Không thể xóa danh mục đang chứa sản phẩm.')
      return
    }

    setError('')
    setSelectedId(String(resolved.id))
    setDeleteTarget(resolved)
  }, [nodeById])

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null)
  }, [])

  const updateFormField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const validateForm = useCallback(() => {
    const name = String(form.name || '').trim()
    if (!name) return 'Vui lòng nhập tên danh mục.'
    if (name.length > MAX_CATEGORY_NAME) {
      return `Tên danh mục không được quá ${MAX_CATEGORY_NAME} ký tự.`
    }

    const normalizedName = normalizeText(name)
    const duplicated = flatNodes.some((node) => {
      if (editingNode?.id && node.id === editingNode.id) return false
      return normalizeText(node.name) === normalizedName
    })
    if (duplicated) return 'Danh mục đã tồn tại.'

    if (editingNode?.id && form.parentId && String(form.parentId) === String(editingNode.id)) {
      return 'Danh mục cha không hợp lệ.'
    }

    if (form.parentId && excludedParentIds.has(String(form.parentId))) {
      return 'Không thể chọn danh mục con của chính nó làm danh mục cha.'
    }

    return ''
  }, [editingNode?.id, excludedParentIds, flatNodes, form.name, form.parentId])

  const submitForm = useCallback(async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setError(validationMessage)
      return false
    }

    const name = String(form.name || '').trim()
    const payload = {
      name,
      slug: slugifyVi(name),
      parentId: form.parentId || null,
      sortOrder: 0,
      type: 'rent',
      isActive: Boolean(form.isActive)
    }

    try {
      setSaving(true)
      setError('')
      if (editingNode?.id) {
        await updateCategory(editingNode.id, payload)
      } else {
        await createCategory(payload)
      }
      closeDrawer()
      await load()
      return true
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không lưu được danh mục.')
      return false
    } finally {
      setSaving(false)
    }
  }, [closeDrawer, editingNode?.id, form.isActive, form.name, form.parentId, load, validateForm])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return false
    try {
      setSaving(true)
      setError('')
      await removeCategory(deleteTarget.id)
      setDeleteTarget(null)
      if (selectedId === deleteTarget.id) {
        setSelectedId('')
      }
      await load()
      return true
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không xóa được danh mục.')
      return false
    } finally {
      setSaving(false)
    }
  }, [deleteTarget, load, selectedId])

  return {
    filteredTree,
    flatNodes,
    parentOptions,

    loading,
    saving,
    error,

    expandedIds,
    selectedId,
    searchKeyword,
    statusFilter,

    editingNode,
    form,
    isDrawerOpen,

    deleteTarget,

    setSearchKeyword,
    setStatusFilter,
    toggleExpand,
    expandAll,
    collapseAll,
    selectNode,

    startCreateRoot,
    startCreateChild,
    startEdit,
    closeDrawer,

    updateFormField,
    submitForm,

    requestDelete,
    closeDeleteModal,
    confirmDelete,

    reload: load
  }
}
