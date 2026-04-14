import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCategory,
  fetchCategories,
  removeCategory,
  updateCategory,
} from '../services/categoryApi';
import { buildCategoryTree, collectDescendantIds, flattenTree } from '../utils/buildTree';

const initialForm = {
  name: '',
  parentId: '',
  isActive: true,
};

const slugifyVi = (value = '') =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const filterTreeByKeyword = (nodes = [], keyword = '') => {
  const q = String(keyword || '').trim().toLowerCase();
  if (!q) return nodes;

  const visit = (items) => {
    const output = [];
    items.forEach((item) => {
      const matches = String(item?.name || '').toLowerCase().includes(q);
      const nextChildren = visit(item.children || []);
      if (matches || nextChildren.length > 0) {
        output.push({
          ...item,
          children: nextChildren,
        });
      }
    });
    return output;
  };

  return visit(nodes);
};

export const useCategoryTree = () => {
  const [rawCategories, setRawCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [expandedIds, setExpandedIds] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [editingNode, setEditingNode] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const tree = useMemo(() => buildCategoryTree(rawCategories), [rawCategories]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);
  const nodeById = useMemo(() => new Map(flatNodes.map((item) => [item.id, item])), [flatNodes]);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = { ...prev };
      flatNodes.forEach((node) => {
        if ((node.children || []).length > 0 && typeof next[node.id] === 'undefined') {
          next[node.id] = true;
        }
      });
      return next;
    });
  }, [flatNodes]);

  const filteredTree = useMemo(
    () => filterTreeByKeyword(tree, searchKeyword),
    [tree, searchKeyword]
  );

  const excludedParentIds = useMemo(() => {
    if (!editingNode) return new Set();
    const ids = collectDescendantIds(editingNode);
    ids.add(editingNode.id);
    return ids;
  }, [editingNode]);

  const parentOptions = useMemo(() => {
    return flatNodes
      .filter((item) => !excludedParentIds.has(item.id))
      .map((item) => ({ value: item.id, label: item.label }));
  }, [flatNodes, excludedParentIds]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const categories = await fetchCategories();
      setRawCategories(categories);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không tải được danh mục.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setEditingNode(null);
    setForm(initialForm);
  }, []);

  const selectNode = useCallback((nodeId) => {
    setSelectedId(String(nodeId || ''));
  }, []);

  const toggleExpand = useCallback((nodeId) => {
    const key = String(nodeId || '');
    if (!key) return;
    setExpandedIds((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const startCreateRoot = useCallback(() => {
    setSelectedId('');
    setEditingNode(null);
    setForm(initialForm);
  }, []);

  const startCreateChild = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node;
    setSelectedId(String(resolved?.id || ''));
    setEditingNode(null);
    setForm({
      ...initialForm,
      parentId: String(resolved?.id || ''),
    });
    if (resolved?.id) {
      setExpandedIds((prev) => ({ ...prev, [resolved.id]: true }));
    }
  }, [nodeById]);

  const startEdit = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node;
    setSelectedId(String(resolved?.id || ''));
    setEditingNode(resolved || null);
    setForm({
      name: String(resolved?.name || ''),
      parentId: String(resolved?.parentId || ''),
      isActive: resolved?.isActive !== false,
    });
  }, [nodeById]);

  const requestDelete = useCallback((node) => {
    const resolved = nodeById.get(String(node?.id || '')) || node;
    setSelectedId(String(resolved?.id || ''));
    setDeleteTarget(resolved || null);
  }, [nodeById]);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const updateFormField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const submitForm = useCallback(async () => {
    const name = String(form.name || '').trim();
    if (!name) {
      setError('Tên danh mục là bắt buộc.');
      return false;
    }

    const payload = {
      name,
      slug: slugifyVi(name),
      parentId: form.parentId || null,
      sortOrder: 0,
      type: 'rent',
      isActive: Boolean(form.isActive),
    };

    try {
      setSaving(true);
      setError('');
      if (editingNode?.id) {
        await updateCategory(editingNode.id, payload);
      } else {
        await createCategory(payload);
      }
      resetForm();
      await load();
      return true;
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không lưu được danh mục.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [editingNode?.id, form.isActive, form.name, form.parentId, load, resetForm]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget?.id) return false;
    try {
      setSaving(true);
      setError('');
      await removeCategory(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) {
        setSelectedId('');
      }
      await load();
      return true;
    } catch (apiError) {
      setError(apiError?.response?.data?.message || apiError?.message || 'Không xóa được danh mục.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, load, selectedId]);

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

    editingNode,
    form,

    deleteTarget,

    setSearchKeyword,
    toggleExpand,
    selectNode,

    startCreateRoot,
    startCreateChild,
    startEdit,
    resetForm,

    updateFormField,
    submitForm,

    requestDelete,
    closeDeleteModal,
    confirmDelete,

    reload: load,
  };
};
