const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const next = toText(item);
      if (next) return next;
    }
    return '';
  }
  if (typeof value === 'object') {
    return (
      toText(value.displayName) ||
      toText(value.name) ||
      toText(value.value) ||
      toText(value.label) ||
      ''
    );
  }
  return '';
};

const normalizeNode = (node = {}, ancestors = []) => {
  const name = toText(node?.displayName || node?.name || node?.value || node?.slug || '');
  const id = String(node?._id || node?.id || node?.value || name);
  const parentId = node?.parentId ? String(node.parentId) : null;
  const nextAncestors = [...ancestors, name].filter(Boolean);

  return {
    id,
    name,
    parentId,
    label: nextAncestors.join(' / '),
    depth: Math.max(nextAncestors.length - 1, 0),
    isActive: node?.isActive !== false,
    count: Number(node?.count || 0),
    raw: node,
    children: [],
  };
};

const fromNested = (items = [], ancestors = []) => {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const next = normalizeNode(item, ancestors);
      if (!next.id || !next.name) return null;
      next.children = fromNested(item?.children || [], [...ancestors, next.name]);
      return next;
    })
    .filter(Boolean);
};

const fromFlat = (items = []) => {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => normalizeNode(item, []))
    .filter((item) => item.id && item.name);

  const byId = new Map(normalized.map((item) => [item.id, { ...item, children: [] }]));
  const roots = [];

  byId.forEach((item) => {
    if (item.parentId && byId.has(item.parentId) && item.parentId !== item.id) {
      byId.get(item.parentId).children.push(item);
    } else {
      roots.push(item);
    }
  });

  const attachMeta = (nodes = [], ancestors = []) => {
    return nodes.map((node) => {
      const nextAncestors = [...ancestors, node.name];
      const next = {
        ...node,
        label: nextAncestors.join(' / '),
        depth: Math.max(nextAncestors.length - 1, 0),
      };
      next.children = attachMeta(node.children || [], nextAncestors);
      return next;
    });
  };

  return attachMeta(roots);
};

const sortTree = (nodes = []) => {
  const sorted = [...nodes].sort((a, b) => {
    const orderA = Number(a?.raw?.sortOrder || 0);
    const orderB = Number(b?.raw?.sortOrder || 0);
    if (orderA !== orderB) return orderA - orderB;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'vi');
  });

  return sorted.map((node) => ({
    ...node,
    children: sortTree(node.children || []),
  }));
};

export const buildCategoryTree = (categories = []) => {
  const list = Array.isArray(categories) ? categories : [];
  const hasNested = list.some((item) => Array.isArray(item?.children) && item.children.length > 0);
  const tree = hasNested ? fromNested(list) : fromFlat(list);
  return sortTree(tree);
};

export const flattenTree = (tree = []) => {
  const out = [];

  const visit = (nodes = []) => {
    nodes.forEach((node) => {
      out.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) {
        visit(node.children);
      }
    });
  };

  visit(tree);
  return out;
};

export const collectDescendantIds = (node) => {
  const ids = new Set();
  const walk = (current) => {
    if (!current || !Array.isArray(current.children)) return;
    current.children.forEach((child) => {
      ids.add(child.id);
      walk(child);
    });
  };
  walk(node);
  return ids;
};
