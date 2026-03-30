export const formatVND = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

export const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const normalizeToken = (value = '') =>
  normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const toCategoryNode = (item = {}) => ({
  value: String(item.value || item.rawName || item.displayName || '').trim(),
  displayName: String(item.displayName || item.name || item.value || '').trim(),
  count: Math.max(Number(item.count) || 0, 0),
  slug: String(item.slug || ''),
  children: Array.isArray(item.children)
    ? item.children.map((child) => toCategoryNode(child)).filter((child) => child.value)
    : [],
});

const mergeUniqueChildren = (children = []) => {
  const seen = new Set();
  return children.filter((child) => {
    if (!child?.value || seen.has(child.value)) return false;
    seen.add(child.value);
    return true;
  });
};

export const buildSidebarTree = (rawCategories = []) => {
  const categories = rawCategories.map((item) => toCategoryNode(item)).filter((item) => item.value);
  const hasChildrenFromApi = categories.some((category) => category.children.length > 0);
  if (hasChildrenFromApi) return categories;

  const isAoDai = (name) => normalizeText(name).startsWith('ao dai');
  const isAoDaiParent = (name) => {
    const normalized = normalizeText(name);
    return normalized === 'ao dai cho thue' || normalized === 'ao dai';
  };

  const children = [];
  const topLevel = [];

  categories.forEach((category) => {
    if (isAoDai(category.displayName) && !isAoDaiParent(category.displayName)) {
      children.push(category);
      return;
    }
    topLevel.push(category);
  });

  if (children.length === 0) return categories;

  const parentIndex = topLevel.findIndex((category) => isAoDaiParent(category.displayName));
  const parent = parentIndex >= 0 ? topLevel[parentIndex] : null;
  if (parentIndex >= 0) topLevel.splice(parentIndex, 1);

  const mergedChildren = mergeUniqueChildren([...(parent?.children || []), ...children]).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, 'vi')
  );

  const groupedParent = {
    value: parent?.value || '__ao_dai_group__',
    displayName: parent?.displayName || 'Áo Dài Cho Thuê',
    count: parent?.count || mergedChildren.reduce((sum, item) => sum + item.count, 0),
    slug: parent?.slug || '',
    children: mergedChildren,
  };

  return [groupedParent, ...topLevel];
};

export const flattenCategories = (nodes = []) => {
  const result = [];
  const visit = (items = []) => {
    items.forEach((node) => {
      result.push(node);
      if (Array.isArray(node.children) && node.children.length > 0) visit(node.children);
    });
  };
  visit(nodes);
  return result;
};

export const RENT_CATEGORY_ALIASES = {
  'co-phuc': ['co-phuc', 'trang-phuc-bieu-dien'],
  'phu-kien-chup-anh-cho-thue': ['phu-kien-chup-anh-cho-thue', 'phu-kien', 'phu-kien-di-kem'],
};

export const mapRentDisplayName = (name = '') => {
  const normalized = normalizeToken(name);
  if (
    ['co-phuc', 'trang-phuc-bieu-dien'].includes(normalized) ||
    normalized.startsWith('co-phuc-') ||
    normalized.startsWith('trang-phuc-bieu-dien-')
  ) {
    return 'Cổ phục';
  }
  if (
    ['phu-kien', 'phu-kien-di-kem', 'phu-kien-chup-anh-cho-thue'].includes(normalized) ||
    normalized.startsWith('phu-kien-')
  ) {
    return 'Phụ kiện chụp ảnh cho thuê';
  }
  return name;
};

const normalizeRentKeyword = (keyword = '') => {
  const normalized = normalizeToken(keyword);
  for (const [canonical, aliases] of Object.entries(RENT_CATEGORY_ALIASES)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized;
};

const expandRentCandidates = (candidates = []) => {
  const set = new Set(candidates.map((item) => normalizeToken(item)).filter(Boolean));
  const values = Array.from(set);

  for (const [canonical, aliases] of Object.entries(RENT_CATEGORY_ALIASES)) {
    const matchedAlias = aliases.some(
      (alias) => values.includes(alias) || values.some((item) => item.startsWith(`${alias}-`))
    );
    if (matchedAlias) {
      set.add(canonical);
      aliases.forEach((alias) => set.add(alias));
    }
  }
  return Array.from(set);
};

export const resolveCategoryValueFromKeyword = ({ keyword = '', nodes = [], mode = 'shop' }) => {
  if (!keyword || nodes.length === 0) return '';

  const normalizedKeyword = mode === 'rent' ? normalizeRentKeyword(keyword) : normalizeText(keyword);
  const matched = nodes.find((item) =>
    (
      mode === 'rent'
        ? expandRentCandidates([item.value, item.displayName, item.slug])
        : [item.value, item.displayName, item.slug].map((candidate) => normalizeText(candidate))
    ).some(
      (candidate) =>
        candidate === normalizedKeyword ||
        candidate.startsWith(`${normalizedKeyword}-`) ||
        normalizedKeyword.startsWith(`${candidate}-`)
    )
  );

  return matched?.value || '';
};

export const collectVariantOptions = (products = []) => {
  const sizeSet = new Set();
  const colorSet = new Set();

  products.forEach((product) => {
    if (Array.isArray(product?.sizes)) {
      product.sizes.forEach((size) => {
        const value = String(size || '').trim();
        if (value) sizeSet.add(value);
      });
    }

    if (Array.isArray(product?.colorVariants)) {
      product.colorVariants.forEach((variant) => {
        const color = String(variant?.name || variant?.color || '').trim();
        const size = String(variant?.size || '').trim();
        if (color) colorSet.add(color);
        if (size) sizeSet.add(size);
      });
    }

    const fallbackColor = String(product?.color || '').trim();
    const fallbackSize = String(product?.size || '').trim();
    if (fallbackColor) colorSet.add(fallbackColor);
    if (fallbackSize) sizeSet.add(fallbackSize);
  });

  return {
    sizes: Array.from(sizeSet).sort((a, b) => a.localeCompare(b, 'vi')),
    colors: Array.from(colorSet).sort((a, b) => a.localeCompare(b, 'vi')),
  };
};

export const hasDateOverlap = (startDate, endDate, blockedStart, blockedEnd) => {
  if (!startDate || !endDate || !blockedStart || !blockedEnd) return false;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const bStart = new Date(blockedStart).getTime();
  const bEnd = new Date(blockedEnd).getTime();
  if ([start, end, bStart, bEnd].some((value) => Number.isNaN(value))) return false;
  return start <= bEnd && bStart <= end;
};
