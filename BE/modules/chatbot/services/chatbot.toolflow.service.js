const { searchContext } = require('./retrieval.service');
const { generateResponse } = require('./groq.service');
const { validateChatInput } = require('../utils/validators');
const { detectChatIntent } = require('./tool-intent.service');
const { buildToolPromptContext } = require('./tool-prompt-template.service');
const { callToolSearch } = require('./tool-api-client.service');
const { findFaqAnswer } = require('./faq.service');
const { getChatSession, saveChatSession } = require('./chat-session.service');
const { listMyVouchers } = require('../../../services/voucher.service');
const {
  getRecentSaleOrders,
  getRecentRentOrders,
  getRecentOrders,
  getOrderDetailsByOrderIds,
} = require('./order.service');

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

const normalizeSearchSemanticText = (value) => {
  let normalized = normalizeForMatch(value)
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize common shorthand/typos for money and color words.
  normalized = normalized
    .replace(/\b0vnd\b/g, '0 vnd')
    .replace(/\bovnd\b/g, '0 vnd')
    .replace(/\bo\s*vnd\b/g, '0 vnd')
    .replace(/\bo\s*d+\b/g, '0 d')
    .replace(/\bmien phi\b/g, '0 vnd')
    .replace(/\bfree\b/g, '0 vnd')
    .replace(/\bred\b/g, 'do')
    .replace(/\bblack\b/g, 'den')
    .replace(/\bwhite\b/g, 'trang')
    .replace(/\byellow\b/g, 'vang')
    .replace(/\bpink\b/g, 'hong')
    .replace(/\bgrey\b/g, 'xam')
    .replace(/\bgray\b/g, 'xam')
    .replace(/\bbrown\b/g, 'nau')
    .replace(/\bpurple\b/g, 'tim')
    .replace(/\bblue\b/g, 'xanh');

  return normalized;
};

const extractDateRangeFromMessage = (message) => {
  const matched = String(message || '').match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!matched) {
    return {};
  }

  const day = Number(matched[1]);
  const month = Number(matched[2]);
  const year = Number(matched[3]);
  const base = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(base.getTime())) {
    return {};
  }

  const dateFrom = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dateTo = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return {
    dateFrom,
    dateTo,
  };
};

const parseMoneyValue = (rawNumber, rawUnit = '') => {
  const normalizedNumber = String(rawNumber || '').replace(',', '.');
  const base = Number(normalizedNumber);

  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }

  const unit = normalizeForMatch(rawUnit);
  if (!unit) {
    return Math.round(base);
  }

  if (['k', 'nghin', 'ngan'].includes(unit)) {
    return Math.round(base * 1000);
  }

  if (['tr', 'trieu', 'm'].includes(unit)) {
    return Math.round(base * 1000000);
  }

  if (['ty', 't'].includes(unit)) {
    return Math.round(base * 1000000000);
  }

  if (['d', 'dd', 'dong', 'vnd'].includes(unit)) {
    return Math.round(base);
  }

  return Math.round(base);
};

const extractMoneyValues = (message) => {
  const normalizedInput = normalizeSearchSemanticText(message);
  const matched = String(normalizedInput || '').matchAll(/(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|trieu|tr|m|ty|t|vnd|dong|d+)?/gi);
  const values = [];

  for (const item of matched) {
    const parsed = parseMoneyValue(item[1], item[2]);
    if (parsed !== null) {
      values.push(parsed);
    }
  }

  return values;
};

const extractProductPriceFiltersFromMessage = (message) => {
  const normalized = normalizeSearchSemanticText(message);

  // Accept common zero-price variants: 0đ, 0d, 0dd, 0 vnd, 0 dong.
  if (/\b(?:0|o)+(?:[.,]0+)?\s*(?:d+|dong|vnd)?\b/i.test(normalized)) {
    return {
      priceMax: 0,
    };
  }

  const amounts = extractMoneyValues(message);

  const compactRangeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|trieu|tr|m|ty|t|vnd|dong|d+)?\s*[-~]\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|trieu|tr|m|ty|t|vnd|dong|d+)?/i);
  if (compactRangeMatch) {
    const first = parseMoneyValue(compactRangeMatch[1], compactRangeMatch[2]);
    const second = parseMoneyValue(compactRangeMatch[3], compactRangeMatch[4]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return {
        priceMin: Math.min(first, second),
        priceMax: Math.max(first, second),
      };
    }
  }

  if (!amounts.length) {
    return {};
  }

  const hasRangeWord = (normalized.includes('tu') && (normalized.includes('den') || normalized.includes('toi')))
    || normalized.includes('khoang')
    || normalized.includes('toi')
    || normalized.includes('trong khoang');

  if (hasRangeWord && amounts.length >= 2) {
    const min = Math.min(amounts[0], amounts[1]);
    const max = Math.max(amounts[0], amounts[1]);
    return {
      priceMin: min,
      priceMax: max,
    };
  }

  if (normalized.includes('duoi') || normalized.includes('nho hon') || normalized.includes('it hon') || normalized.includes('max')) {
    return {
      priceMax: amounts[0],
    };
  }

  if (normalized.includes('tren') || normalized.includes('lon hon') || normalized.includes('toi thieu') || normalized.includes('min')) {
    return {
      priceMin: amounts[0],
    };
  }

  // If user provides a bare amount like "ao 1500k", infer a near-price window.
  if (amounts.length === 1) {
    const center = amounts[0];
    const delta = Math.max(Math.round(center * 0.2), 50000);
    return {
      priceMin: Math.max(center - delta, 0),
      priceMax: center + delta,
    };
  }

  return {};
};

const extractProductSortFromMessage = (message) => {
  const normalized = normalizeSearchSemanticText(message);

  if (
    /(dat\s+den\s+re|cao\s+den\s+thap|gia\s+giam\s+dan|giam\s+dan|tu\s+cao\s+den\s+thap|desc)/i.test(normalized)
  ) {
    return {
      sortBy: 'price',
      sortOrder: 'desc',
    };
  }

  if (
    /(re\s+den\s+dat|thap\s+den\s+cao|gia\s+tang\s+dan|tang\s+dan|tu\s+thap\s+den\s+cao|asc)/i.test(normalized)
  ) {
    return {
      sortBy: 'price',
      sortOrder: 'asc',
    };
  }

  if (normalized.includes('moi nhat') || normalized.includes('newest')) {
    return {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
  }

  return {};
};

const extractProductAttributeFiltersFromMessage = (message) => {
  const normalized = normalizeSearchSemanticText(message);
  const result = {};

  const colorHints = ['do', 'xanh', 'trang', 'den', 'hong', 'vang', 'nau', 'xam', 'tim', 'cam'];

  const sizeMatched = normalized.match(/\b(?:size|sz)\s*[:=]?\s*(xs|s|m|l|xl|xxl|xxxl|\d{1,2})\b/i);
  if (sizeMatched) {
    result.size = String(sizeMatched[1]).toUpperCase();
  }

  const categoryMatched = normalized.match(/(?:danh muc|category)\s*(?::|=|la)\s*([a-z0-9\s]{2,40})/i);
  if (categoryMatched && categoryMatched[1]) {
    const categoryValue = String(categoryMatched[1]).trim();
    if (!/\b(nao|gi|bao nhieu)\b/.test(categoryValue)) {
      result.category = categoryValue;
    }
  }

  const colorByPhrase = normalized.match(/(?:mau|color)\s+(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\b/i);
  const colorByPhraseMulti = normalized.match(/(?:mau|color)\s+(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\s*(?:,|\/|hoac|va)\s*(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\b/i);
  const colorByImplicitProductPhrase = normalized.match(/(?:ao|vay|dam|quan|trang\s*phuc|do)\s+(?:\w+\s+){0,2}(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\b/i);
  const colorByImplicitProductPhraseMulti = normalized.match(/(?:ao|vay|dam|quan|trang\s*phuc|do)\s+(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\s*(?:,|\/|hoac|va)\s*(do|xanh|trang|den|hong|vang|tim|nau|xam|cam)\b/i);

  let colorByExplicitContains = null;
  for (const color of colorHints) {
    const explicitPattern = new RegExp(`\\b(?:mau|color)\\s+${color}\\b`, 'i');
    if (explicitPattern.test(normalized)) {
      colorByExplicitContains = color;
      break;
    }
  }

  const colorMatched = colorByPhrase
    ? String(colorByPhrase[1]).toLowerCase()
    : (colorByImplicitProductPhrase
      ? String(colorByImplicitProductPhrase[1]).toLowerCase()
      : colorByExplicitContains);
  const isComparativeDen = colorMatched === 'den' && /\bden\s+(dat|re|cao|thap)\b/i.test(normalized);

  const multiColors = [];
  if (colorByPhraseMulti) {
    multiColors.push(String(colorByPhraseMulti[1]).toLowerCase());
    multiColors.push(String(colorByPhraseMulti[2]).toLowerCase());
  }
  if (colorByImplicitProductPhraseMulti) {
    multiColors.push(String(colorByImplicitProductPhraseMulti[1]).toLowerCase());
    multiColors.push(String(colorByImplicitProductPhraseMulti[2]).toLowerCase());
  }
  const uniqueMultiColors = [...new Set(multiColors)].filter(Boolean);

  if (uniqueMultiColors.length >= 2) {
    result.color = uniqueMultiColors.join('|');
  } else if (colorMatched && !isComparativeDen) {
    result.color = colorMatched;
  }

  if (
    normalized.includes('con hang')
    || normalized.includes('san co')
    || normalized.includes('available')
    || normalized.includes('in stock')
  ) {
    result.inStock = true;
  }

  if (
    normalized.includes('het hang')
    || normalized.includes('out of stock')
    || normalized.includes('khong con hang')
  ) {
    result.inStock = false;
  }

  return result;
};

const isProductLoadMoreRequest = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('xem them')
    || normalized.includes('them nua')
    || normalized.includes('hien thi them')
    || normalized.includes('more');
};

const isProductCatalogOverviewIntent = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('loai trang phuc nao')
    || normalized.includes('nhung loai trang phuc')
    || normalized.includes('co nhung loai nao')
    || normalized.includes('danh muc trang phuc');
};

const getRentalPolicyKnowledgeAnswer = (message) => {
  const normalized = normalizeForMatch(message);

  const voucherUsageSignal = (
    (normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('giam gia') || normalized.includes('uu dai'))
    && (normalized.includes('cach')
      || normalized.includes('huong dan')
      || normalized.includes('su dung')
      || normalized.includes('ap dung')
      || normalized.includes('nhap ma')
      || normalized.includes('nhu the nao'))
  );

  if (voucherUsageSignal) {
    return 'De dung voucher: (1) Chon san pham va vao buoc thanh toan. (2) Nhap ma voucher vao o ma giam gia. (3) He thong se tu kiem tra dieu kien (han su dung, don toi thieu, so lan dung, loai don mua/thue) va tru gia neu hop le. (4) Neu khong ap dung duoc, ban se thay thong bao ly do de doi ma khac.';
  }

  const fittingGuideSignal = (
    (normalized.includes('cach') || normalized.includes('huong dan') || normalized.includes('lam sao') || normalized.includes('nhu the nao'))
    && ((normalized.includes('dat lich') || normalized.includes('booking') || normalized.includes('hen lich'))
      || normalized.includes('thu do')
      || /thu+\s*do/.test(normalized)
      || normalized.includes('fitting'))
  );

  if (fittingGuideSignal) {
    return 'De dat lich thu do: (1) Dang nhap tai khoan customer. (2) Chon ngay thu (`date`) va khung gio (`timeSlot`). (3) Gui yeu cau dat lich thu do. He thong tao lich voi trang thai Pending, shop se xac nhan sau. Ban co the ghi chu them neu can tu van size/mau.';
  }

  if (normalized.includes('huy don thue') || (normalized.includes('huy don') && normalized.includes('thue'))) {
    return 'Ban co the huy don thue theo moc thoi gian va dieu kien cua shop. Thong thuong, huy cang som thi phi cang thap; neu da sat lich hoac da nhan do, co the ap dung phi huy/khong hoan coc theo quy dinh don.';
  }

  if (normalized.includes('khac nhau giua thue va mua')) {
    return 'Thue phu hop khi ban can su dung ngan han, chi tra phi thue va hoan tra do sau khi dung. Mua phu hop khi ban muon so huu lau dai, thanh toan toan bo gia tri san pham va khong can tra lai.';
  }

  if (normalized.includes('muon thue can') || normalized.includes('can gi de thue')) {
    return 'De thue do, ban can co tai khoan, chon san pham va lich thue, dat coc theo huong dan, sau do den lay do dung hen. Khi tra do, he thong doi soat tinh trang de chot don.';
  }

  if (normalized.includes('quy tac thue') || normalized.includes('quy dinh thue') || normalized.includes('dieu kien thue') || normalized.includes('chinh sach thue')) {
    return 'Quy tac thue co 4 diem chinh: dat coc theo quy dinh, su dung va bao quan do dung cach, tra do dung lich, va phat sinh phi neu hong mat hoac tre hen theo muc do. Ban co the xem chi tiet tai trang chinh sach thue cua shop.';
  }

  if (normalized.includes('luong thue') || normalized.includes('quy trinh thue') || normalized.includes('thu tuc thue')) {
    return 'Luong thue gom: chon san pham -> chon thoi gian thue -> xac nhan don va dat coc -> lay do -> su dung -> tra do -> doi soat va hoan tat don.';
  }

  return null;
};

const buildVoucherAnswer = async ({ actor }) => {
  if (!actor?.id) {
    return {
      type: 'TEXT',
      answer: 'Ban can dang nhap de xem danh sach voucher cua minh.',
      usage: null,
      model: null,
      intent: 'VOUCHER',
      toolData: null,
      contexts: [],
    };
  }

  const result = await listMyVouchers({
    user: { id: actor.id },
    query: { page: 1, limit: 5 },
  });

  const vouchers = Array.isArray(result?.data) ? result.data : [];
  if (!vouchers.length) {
    return {
      type: 'TEXT',
      answer: 'Hien tai ban khong co voucher kha dung nao.',
      usage: null,
      model: null,
      intent: 'VOUCHER',
      toolData: null,
      contexts: [],
    };
  }

  const lines = vouchers.slice(0, 5).map((item, index) => {
    const endDate = item?.endDate ? new Date(item.endDate).toLocaleString('vi-VN', { hour12: false }) : '-';
    const value = item?.voucherType === 'percent'
      ? `${Number(item.value || 0)}%`
      : `${Number(item.value || 0).toLocaleString('vi-VN')} VND`;
    return `${index + 1}. ${item.code || '-'} - ${item.name || 'Voucher'} - Gia tri: ${value} - Han: ${endDate}`;
  });

  return {
    type: 'TEXT',
    answer: `Ban dang co ${vouchers.length} voucher kha dung:\n${lines.join('\n')}`,
    usage: null,
    model: null,
    intent: 'VOUCHER',
    toolData: null,
    contexts: [],
  };
};

const inferOrderType = (message) => {
  const normalized = normalizeForMatch(message);

  const hasRent = normalized.includes('don thue') || normalized.includes('thue') || normalized.includes('rent');
  const hasSale = normalized.includes('don mua') || normalized.includes('mua') || normalized.includes('sale');

  if (hasRent && hasSale) {
    return 'all';
  }

  if (hasRent) {
    return 'rent';
  }

  if (hasSale) {
    return 'sale';
  }

  return null;
};

const extractObjectId = (message) => {
  const matched = String(message || '').match(/[a-f0-9]{24}/ig);
  return matched || [];
};

const extractOrdinal = (message) => {
  const normalized = normalizeForMatch(message);
  const matched = normalized.match(/don thu\s*(\d{1,2})/);
  if (!matched) {
    return null;
  }

  const value = Number(matched[1]);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const isLatestOrderReference = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('don gan nhat') || normalized.includes('don moi nhat') || normalized.includes('don do') || normalized.includes('don nay');
};

const isPluralReference = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('nhung don') || normalized.includes('cac don') || normalized.includes('2 don') || normalized.includes('hai don');
};

const asksOrderItems = (message) => {
  const normalized = normalizeForMatch(message);
  const itemWords = ['co gi', 'gom gi', 'chi tiet', 'thue gi', 'mua gi', 'san pham', 'mat hang', 'item'];
  return itemWords.some((word) => normalized.includes(word));
};

const isLatestQuery = (message) => {
  const normalized = normalizeForMatch(message);
  return normalized.includes('gan nhat') || normalized.includes('moi nhat');
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const buildUserAnswer = ({ records }) => {
  if (!records.length) {
    return 'Khong tim thay thong tin phu hop.';
  }

  const user = records[0];
  return [
    `Ten: ${user.name || '-'}.`,
    `Email: ${user.email || '-'}.`,
    `So dien thoai: ${user.phone || '-'}, Vai tro: ${user.role || '-'}, Trang thai: ${user.status || '-'}.`,
  ].join(' ');
};

const buildOrderAnswer = ({ records, message }) => {
  if (!records.length) {
    return 'Khong tim thay thong tin phu hop.';
  }

  const source = isLatestQuery(message) ? [records[0]] : records;
  const first = source[0];
  const orderLabel = first.orderType === 'rent' ? 'don thue' : 'don mua';

  return [
    `${orderLabel.charAt(0).toUpperCase() + orderLabel.slice(1)}: ${first.id}.`,
    `Trang thai: ${first.status || '-'}, Tong tien: ${Number(first.totalAmount || 0)}.`,
    `Ngay tao: ${formatDate(first.createdAt) || '-'}.`,
  ].join(' ');
};

const buildDeterministicToolAnswer = ({ intent, toolData, message }) => {
  const records = Array.isArray(toolData?.records) ? toolData.records : [];

  if (intent === 'USER') {
    return buildUserAnswer({ records });
  }

  if (intent === 'ORDER') {
    return buildOrderAnswer({ records, message });
  }

  return null;
};

const buildOrderContext = (records) => {
  return JSON.stringify({
    total: records.length,
    records,
  }, null, 2);
};

const summarizeOrderByGroq = async ({ message, records, intent }) => {
  const llmResult = await generateResponse({
    question: [
      `Intent: ${intent}`,
      `User question: ${message}`,
      'Hay tra loi ngan gon bang tieng Viet, toi da 4 cau.',
      'Chi tom tat thong tin don hang tu context.',
      'Neu context la danh sach san pham trong don thi liet ke gon theo tung don.',
      'Tuyet doi khong noi ve API, backend, database.',
    ].join('\n'),
    contextBlocks: [buildOrderContext(records)],
  });

  return llmResult;
};

const buildOrderListMessage = ({ records, message }) => {
  const rentCount = records.filter((item) => item.orderType === 'rent').length;
  const saleCount = records.filter((item) => item.orderType === 'sale').length;
  const orderType = inferOrderType(message);
  const normalized = normalizeForMatch(message);
  const asksPolicyInSameQuery = normalized.includes('chinh sach') || normalized.includes('tra tre') || normalized.includes('huy don');
  const policyHint = asksPolicyInSameQuery
    ? ' Neu ban muon, toi co the giai thich nhanh chinh sach tra tre/huy don o tin nhan tiep theo.'
    : '';

  if (orderType === 'rent') {
    return `Tim thay ${rentCount} don thue gan day. Bam "Xem chi tiet" de mo trang don.${policyHint}`;
  }

  if (orderType === 'sale') {
    return `Tim thay ${saleCount} don mua gan day. Bam "Xem chi tiet" o don ho tro de mo trang don.${policyHint}`;
  }

  return `Tim thay ${records.length} don gan day. Bam "Xem chi tiet" de mo trang don.${policyHint}`;
};

const buildProductListMessage = ({ records, message }) => {
  if (!records.length) {
    return 'Khong tim thay san pham phu hop.';
  }

  const normalized = normalizeForMatch(message);
  if (isProductCatalogOverviewIntent(message)) {
    const categories = [...new Set(
      records
        .map((item) => String(item?.category || '').trim())
        .filter(Boolean)
    )];

    if (categories.length > 0) {
      return `Shop hien co cac nhom trang phuc: ${categories.slice(0, 8).join(', ')}.`;
    }
  }

  if (normalized.includes('size nao') || normalized.includes('nhung size') || normalized.includes('size gi')) {
    const sizes = [...new Set(
      records
        .flatMap((item) => (Array.isArray(item?.sizes) ? item.sizes : []))
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )];

    if (sizes.length > 0) {
      return `Co ${sizes.length} size phu hop: ${sizes.join(', ')}.`;
    }
  }

  if (normalized.includes('dat den re') || normalized.includes('giam dan') || normalized.includes('cao den thap')) {
    return `Tim thay ${records.length} san pham (sap xep gia tu cao den thap).`;
  }

  if (normalized.includes('re den dat') || normalized.includes('tang dan') || normalized.includes('thap den cao')) {
    return `Tim thay ${records.length} san pham (sap xep gia tu thap den cao).`;
  }

  return `Tim thay ${records.length} san pham phu hop.`;
};

const formatAppliedProductFilters = (filters = {}) => {
  const lines = [];

  if (filters.category) {
    lines.push(`Danh muc: ${filters.category}`);
  }

  if (filters.size) {
    lines.push(`Size: ${filters.size}`);
  }

  if (filters.color) {
    lines.push(`Mau: ${filters.color}`);
  }

  if (typeof filters.inStock === 'boolean') {
    lines.push(`Tinh trang: ${filters.inStock ? 'Con hang' : 'Het hang'}`);
  }

  if (Number.isFinite(filters.priceMin) || Number.isFinite(filters.priceMax)) {
    const min = Number.isFinite(filters.priceMin) ? Number(filters.priceMin).toLocaleString('vi-VN') : null;
    const max = Number.isFinite(filters.priceMax) ? Number(filters.priceMax).toLocaleString('vi-VN') : null;
    if (min && max) {
      lines.push(`Gia: ${min} - ${max} VND`);
    } else if (min) {
      lines.push(`Gia tu: ${min} VND`);
    } else if (max) {
      lines.push(`Gia den: ${max} VND`);
    }
  }

  return lines;
};

const getOrdersByType = async ({ actorId, orderType, topK }) => {
  if (orderType === 'sale') {
    return getRecentSaleOrders(actorId, { limit: topK });
  }

  if (orderType === 'rent') {
    return getRecentRentOrders(actorId, { limit: topK });
  }

  return getRecentOrders(actorId, { limit: topK });
};

const resolveTargetOrderIds = async ({ actorId, message, topK, sessionState }) => {
  const explicitIds = extractObjectId(message).filter((id) => id.length === 24);
  if (explicitIds.length > 0) {
    return explicitIds;
  }

  const rememberedIds = Array.isArray(sessionState?.lastOrderIds) ? sessionState.lastOrderIds : [];
  const orderType = inferOrderType(message);

  if (rememberedIds.length > 0) {
    const ordinal = extractOrdinal(message);
    if (ordinal && rememberedIds[ordinal - 1]) {
      return [rememberedIds[ordinal - 1]];
    }

    if (isLatestOrderReference(message)) {
      return [rememberedIds[0]];
    }

    if (isPluralReference(message)) {
      return rememberedIds.slice(0, topK);
    }

    if (asksOrderItems(message)) {
      return rememberedIds.slice(0, Math.min(2, topK));
    }
  }

  const recentOrders = await getOrdersByType({
    actorId,
    orderType,
    topK,
  });

  if (!recentOrders.length) {
    return [];
  }

  const ordinal = extractOrdinal(message);
  if (ordinal && recentOrders[ordinal - 1]) {
    return [recentOrders[ordinal - 1].id];
  }

  if (isPluralReference(message)) {
    return recentOrders.slice(0, topK).map((item) => item.id);
  }

  return [recentOrders[0].id];
};

const buildOrderDetailData = async ({ actorId, message, topK, sessionState }) => {
  const orderIds = await resolveTargetOrderIds({
    actorId,
    message,
    topK,
    sessionState,
  });

  if (!orderIds.length) {
    return [];
  }

  const details = await getOrderDetailsByOrderIds(orderIds, actorId);
  return details;
};

const mapToolResponseToContext = (toolData) => {
  const records = Array.isArray(toolData?.records) ? toolData.records : [];
  const summary = {
    entity: toolData?.entity || null,
    total: toolData?.total || 0,
    page: toolData?.page || 1,
    limit: toolData?.limit || records.length,
    records,
  };

  return JSON.stringify(summary, null, 2);
};

const buildReadableKnowledgeFallback = (contexts = []) => {
  const raw = contexts
    .map((item) => String(item?.text || ''))
    .find((text) => text.trim().length > 0);

  if (!raw) {
    return '';
  }

  const cleaned = raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\-\*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = cleaned
    .split(/(?<=[\.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.toLowerCase().startsWith('##'));

  return sentences.slice(0, 2).join(' ');
};

const buildToolPayload = ({ entity, message, requestId, topK, page = 1, forcedFilters = null, queryOverride = null }) => {
  const dateFilters = extractDateRangeFromMessage(message);
  const orderType = entity === 'order' ? inferOrderType(message) : null;
  const productPriceFilters = entity === 'product'
    ? extractProductPriceFiltersFromMessage(message)
    : {};
  const parsedProductSortFilters = entity === 'product'
    ? extractProductSortFromMessage(message)
    : {};
  const productSortFilters = entity === 'product'
    ? ((parsedProductSortFilters.sortBy || parsedProductSortFilters.sortOrder)
      ? parsedProductSortFilters
      : { sortBy: 'price', sortOrder: 'desc' })
    : {};
  const productAttributeFilters = entity === 'product'
    ? extractProductAttributeFiltersFromMessage(message)
    : {};

  const productLimit = entity === 'product' && isProductCatalogOverviewIntent(message)
    ? Math.max(topK, 20)
    : topK;

  const baseFilters = {
    ...dateFilters,
    ...(orderType ? { orderType } : {}),
    ...productPriceFilters,
    ...productSortFilters,
    ...productAttributeFilters,
    page,
    limit: productLimit,
  };

  return {
    entity,
    query: queryOverride || message,
    filters: {
      ...baseFilters,
      ...(forcedFilters && typeof forcedFilters === 'object' ? forcedFilters : {}),
    },
    requestId,
  };
};

const chatWithTools = async ({ payload = {}, actor = {}, requestId }) => {
  const { message, topK } = validateChatInput(payload);
  const intentInfo = detectChatIntent(message);
  const sessionState = getChatSession({ actor, requestId });
  const isLoadMoreProducts = isProductLoadMoreRequest(message) && Boolean(sessionState.lastProductQuery);

  if (intentInfo.intent === 'KNOWLEDGE') {
    const rentalPolicyAnswer = getRentalPolicyKnowledgeAnswer(message);
    if (rentalPolicyAnswer) {
      return {
        type: 'TEXT',
        answer: rentalPolicyAnswer,
        usage: null,
        model: 'policy-direct',
        intent: 'KNOWLEDGE',
        toolData: null,
        contexts: [],
      };
    }
  }

  if (intentInfo.intent === 'KNOWLEDGE' && !isLoadMoreProducts) {
    const faq = findFaqAnswer(message);
    if (faq) {
      return {
        type: 'TEXT',
        answer: faq.answer,
        usage: null,
        model: 'faq-direct',
        intent: 'FAQ',
        toolData: null,
        contexts: [
          {
            id: 'faq-direct',
            score: faq.score,
            metadata: {
              source: 'customer-faq-50-qa.md',
              matchedQuestion: faq.question,
            },
            preview: faq.question,
          },
        ],
      };
    }
  }

  if (intentInfo.intent === 'ORDER' || intentInfo.intent === 'ORDER_DETAIL') {
    const orderType = inferOrderType(message);
    let orderData = [];

    if (intentInfo.intent === 'ORDER') {
      orderData = await getOrdersByType({
        actorId: actor.id,
        orderType,
        topK,
      });

      saveChatSession({
        actor,
        requestId,
        state: {
          ...sessionState,
          lastOrderIds: orderData.map((item) => item.id),
          lastOrderDetails: [],
          lastOrderType: orderType || null,
        },
      });
    } else {
      orderData = await buildOrderDetailData({
        actorId: actor.id,
        message,
        topK,
        sessionState,
      });

      saveChatSession({
        actor,
        requestId,
        state: {
          ...sessionState,
          lastOrderIds: orderData.map((item) => item.id),
          lastOrderDetails: orderData,
          lastOrderType: orderType || sessionState.lastOrderType || null,
        },
      });
    }

    if (!Array.isArray(orderData) || orderData.length === 0) {
      return {
        type: 'ORDER',
        message: 'Khong tim thay thong tin phu hop.',
        answer: 'Khong tim thay thong tin phu hop.',
        data: [],
        usage: null,
        model: null,
        intent: intentInfo.intent,
        toolData: null,
        contexts: [],
      };
    }

    const isOrderListIntent = intentInfo.intent === 'ORDER';
    const llmResult = isOrderListIntent
      ? {
        answer: buildOrderListMessage({ records: orderData, message }),
        usage: null,
        model: null,
      }
      : await summarizeOrderByGroq({
        message,
        records: orderData,
        intent: intentInfo.intent,
      });

    return {
      type: 'ORDER',
      message: llmResult.answer,
      answer: llmResult.answer,
      data: orderData,
      usage: llmResult.usage,
      model: llmResult.model,
      intent: intentInfo.intent,
      toolData: null,
      contexts: [],
    };
  }

  if (intentInfo.intent === 'VOUCHER') {
    return buildVoucherAnswer({ actor });
  }

  let toolData = null;
  if (intentInfo.entity || isLoadMoreProducts) {
    const isProductFlow = intentInfo.intent === 'PRODUCT' || isLoadMoreProducts;
    const nextPage = isLoadMoreProducts
      ? Math.max(Number(sessionState.lastProductPage || 1) + 1, 1)
      : 1;
    const persistedLimit = Number(sessionState.lastProductLimit || topK);

    toolData = await callToolSearch({
      payload: buildToolPayload({
        entity: isProductFlow ? 'product' : intentInfo.entity,
        message,
        requestId,
        topK: isProductFlow && isLoadMoreProducts ? persistedLimit : topK,
        page: isProductFlow ? nextPage : 1,
        forcedFilters: isProductFlow && isLoadMoreProducts ? sessionState.lastProductFilters : null,
        queryOverride: isProductFlow && isLoadMoreProducts ? sessionState.lastProductQuery : null,
      }),
      actor,
      requestId,
    });
  }

  if (intentInfo.intent === 'PRODUCT' || isLoadMoreProducts) {
    const records = Array.isArray(toolData?.records) ? toolData.records : [];
    const page = Number(toolData?.page || 1);
    const limit = Number(toolData?.limit || topK);
    const total = Number(toolData?.total || records.length);
    const canLoadMore = (page * limit) < total;
    const appliedFilters = toolData?.appliedFilters && typeof toolData.appliedFilters === 'object'
      ? toolData.appliedFilters
      : {};
    const summaryLines = formatAppliedProductFilters(appliedFilters);

    saveChatSession({
      actor,
      requestId,
      state: {
        ...sessionState,
        lastProductQuery: isLoadMoreProducts ? sessionState.lastProductQuery : message,
        lastProductFilters: appliedFilters,
        lastProductPage: page,
        lastProductLimit: limit,
      },
    });

    const baseMessage = buildProductListMessage({ records, message });
    const messageWithFilter = summaryLines.length > 0
      ? `${baseMessage}\nBo loc dang ap dung: ${summaryLines.join(' | ')}`
      : baseMessage;

    return {
      type: 'PRODUCT_LIST',
      message: messageWithFilter,
      data: records,
      meta: {
        page,
        limit,
        total,
        canLoadMore,
        appliedFilters,
        loadMorePrompt: 'xem them san pham',
      },
      usage: null,
      model: null,
      intent: isLoadMoreProducts ? 'PRODUCT' : intentInfo.intent,
      toolData,
      contexts: [],
    };
  }

  if (intentInfo.entity && toolData && Array.isArray(toolData.records) && toolData.records.length === 0) {
    return {
      type: 'TEXT',
      answer: 'Khong tim thay thong tin phu hop.',
      usage: null,
      model: null,
      intent: intentInfo.intent,
      toolData,
      contexts: [],
    };
  }

  const contexts = await searchContext({ query: message, topK });
  const contextBlocks = contexts.map((item) => item.text);

  if (intentInfo.entity) {
    return {
      type: 'TEXT',
      answer: buildDeterministicToolAnswer({
        intent: intentInfo.intent,
        toolData,
        message,
      }) || 'Khong tim thay thong tin phu hop.',
      usage: null,
      model: null,
      intent: intentInfo.intent,
      toolData,
      contexts: [],
    };
  }

  const mergedContext = [
    ...contextBlocks,
    toolData ? `ToolData:\n${mapToolResponseToContext(toolData)}` : '',
  ].filter(Boolean);

  let llmResult;
  try {
    llmResult = await generateResponse({
      question: buildToolPromptContext({
        context: mergedContext.join('\n\n'),
        question: message,
      }),
      contextBlocks: mergedContext,
    });
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('groq_api_key is missing')) {
      const fallbackKnowledge = buildReadableKnowledgeFallback(contexts);

      return {
        type: 'TEXT',
        answer: fallbackKnowledge || 'Tinh nang tri thuc nang cao dang tam tat do thieu cau hinh LLM. Ban co the hoi ve don hang, voucher, hoac tim san pham de chatbot xu ly truc tiep.',
        usage: null,
        model: null,
        intent: intentInfo.intent,
        toolData,
        contexts: [],
      };
    }

    throw error;
  }

  return {
    type: 'TEXT',
    answer: llmResult.answer,
    usage: llmResult.usage,
    model: llmResult.model,
    intent: intentInfo.intent,
    toolData,
    contexts: contexts.map((item) => ({
      id: item.id,
      score: Number(item.score.toFixed(4)),
      metadata: item.metadata,
      preview: item.text.slice(0, 200),
    })),
  };
};

module.exports = {
  chatWithTools,
};

