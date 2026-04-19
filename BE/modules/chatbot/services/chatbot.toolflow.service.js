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

  // Expand compact million shorthand used in Vietnamese chats (e.g., 1m5 => 1.5m, 1tr5 => 1.5tr).
  normalized = normalized.replace(/\b(\d+)\s*(m|tr|trieu)\s*(\d{1,3})\b/gi, (_, major, unit, minor) => {
    const majorNumber = Number(major);
    const minorDigits = String(minor || '').trim();

    if (!Number.isFinite(majorNumber) || !minorDigits) {
      return `${major} ${unit}`;
    }

    const minorNumber = Number(minorDigits);
    if (!Number.isFinite(minorNumber)) {
      return `${major} ${unit}`;
    }

    const divisor = minorDigits.length === 3
      ? 1000
      : Math.pow(10, minorDigits.length);
    const merged = majorNumber + (minorNumber / divisor);

    return `${String(merged).replace(/\.0+$/, '')} ${unit}`;
  });

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

  const hasInStockSignal = /(con\s+hang|san\s+co|con\s+ton|ton\s+kho|available|in\s+stock)/i.test(normalized)
    || /khong\s+het\s+hang/i.test(normalized);
  const hasOutOfStockSignal = /(het\s+hang|khong\s+con\s+hang|chay\s+hang|out\s+of\s+stock)/i.test(normalized)
    && !/khong\s+het\s+hang/i.test(normalized);

  if (hasInStockSignal && !hasOutOfStockSignal) {
    result.inStock = true;
  }

  if (hasOutOfStockSignal) {
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

  const asksLostItem = normalized.includes('lam mat')
    || normalized.includes('mat do')
    || normalized.includes('mat ao')
    || normalized.includes('that lac');
  const asksDamagedItem = normalized.includes('lam hong')
    || normalized.includes('hu hong')
    || normalized.includes('rach')
    || normalized.includes('bung nut');
  const asksLatePickup = normalized.includes('den lay muon')
    || normalized.includes('lay muon')
    || normalized.includes('tre gio lay');
  const asksNoShow = normalized.includes('khong den nhan')
    || normalized.includes('no show')
    || normalized.includes('noshow');
  const asksDepositPolicy = normalized.includes('dat coc')
    || normalized.includes('tien coc')
    || normalized.includes('coc bao nhieu')
    || normalized.includes('hoan coc');
  const asksLateReturn = normalized.includes('tra tre')
    || normalized.includes('tre han')
    || normalized.includes('muon han tra');

  const asksPurchaseFlow = normalized.includes('quy trinh mua')
    || normalized.includes('thu tuc mua')
    || normalized.includes('luong mua')
    || normalized.includes('cac buoc mua')
    || normalized.includes('cac buoc de mua')
    || normalized.includes('huong dan mua')
    || normalized.includes('mua can gi')
    || normalized.includes('can gi de mua')
    || /cac\s+buoc.*mua/.test(normalized)
    || /huong\s+dan.*mua/.test(normalized);

  if (asksLostItem) {
    return 'Nếu bạn làm mất đồ thuê, bạn hãy báo shop ngay để khóa xử lý đơn và đối soát. Tiền cọc sẽ được dùng để bù trừ trước, nếu còn thiếu thì bổ sung theo giá trị bồi thường của sản phẩm. Shop sẽ thông báo rõ từng khoản trước khi chốt.';
  }

  if (asksDamagedItem) {
    return 'Nếu đồ bị hỏng trong thời gian thuê, bạn hãy báo sớm để shop hướng dẫn cách xử lý phù hợp. Phí bồi thường được tính theo mức độ hư hỏng thực tế và kết quả kiểm tra lúc trả đồ. Shop ưu tiên đối soát minh bạch để bạn nắm rõ.';
  }

  if (asksLatePickup) {
    return 'Bạn đến lấy đồ muộn vẫn có thể được hỗ trợ nếu shop còn giữ được lịch đơn. Bạn nên nhắn tin sớm để shop cập nhật khung giờ nhận. Nếu quá mốc giữ chỗ của đơn, đơn có thể bị xử lý theo chính sách no-show.';
  }

  if (asksNoShow) {
    return 'No-show là trường hợp đặt đơn nhưng không đến nhận đồ đúng hẹn và không thông báo trước. Khi đó, đơn có thể bị đóng và tiền cọc có thể bị xử lý theo quy định của shop. Để tránh mất quyền lợi, bạn vui lòng báo sớm nếu cần đổi lịch.';
  }

  if (asksDepositPolicy) {
    return 'Đơn thuê thường cần đặt cọc để giữ lịch và giữ sản phẩm, mức cọc phổ biến khoảng 50% tổng tiền thuê. Sau khi trả đồ, hệ thống đối soát cọc với các phí phát sinh (nếu có): cọc dư thì hoàn, cọc thiếu thì bổ sung. Mọi khoản đều được thông báo rõ trước khi kết đơn.';
  }

  if (asksLateReturn) {
    return 'Khi trả đồ trễ, hệ thống ghi nhận số ngày trễ và áp dụng phí theo quy định nếu vượt ngưỡng tính phí. Bạn nên báo trước cho shop nếu có nguy cơ trễ hẹn để được hướng dẫn sớm và giảm phát sinh không cần thiết.';
  }

  if (asksPurchaseFlow) {
    return 'Quy trình mua gồm: chọn sản phẩm trong giỏ mua -> điền thông tin nhận hàng (tên, điện thoại, email, địa chỉ) -> chọn phương thức thanh toán -> xác nhận đơn. Nếu bạn mua với tư cách khách vãng lai, hệ thống sẽ yêu cầu xác minh OTP hoặc email trước khi tạo đơn. Sau khi đặt thành công, đơn thường ở trạng thái chờ xác nhận và bạn có thể theo dõi trong lịch sử đơn hàng.';
  }

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
    return 'Để dùng voucher: (1) Chọn sản phẩm và vào bước thanh toán. (2) Nhập mã voucher vào ô mã giảm giá. (3) Hệ thống sẽ tự kiểm tra điều kiện (hạn sử dụng, đơn tối thiểu, số lần dùng, loại đơn mua/thuê) và trừ giá nếu hợp lệ. (4) Nếu không áp dụng được, bạn sẽ thấy thông báo lý do để đổi mã khác.';
  }

  if (normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('giam gia') || normalized.includes('uu dai')) {
    return 'Voucher là mã ưu đãi giúp giảm chi phí khi thanh toán nếu thỏa điều kiện áp dụng. Bạn có thể nhập voucher ở bước thanh toán để hệ thống kiểm tra tự động. Nếu bạn muốn, mình có thể hướng dẫn chi tiết cách dùng hoặc kiểm tra danh sách voucher hiện có của bạn.';
  }

  const fittingGuideSignal = (
    (normalized.includes('cach') || normalized.includes('huong dan') || normalized.includes('lam sao') || normalized.includes('nhu the nao'))
    && ((normalized.includes('dat lich') || normalized.includes('booking') || normalized.includes('hen lich'))
      || normalized.includes('thu do')
      || /thu+\s*do/.test(normalized)
      || normalized.includes('fitting'))
  );

  if (fittingGuideSignal) {
    return 'Để đặt lịch thử đồ: (1) Đăng nhập tài khoản khách hàng. (2) Chọn ngày thử và khung giờ phù hợp. (3) Gửi yêu cầu đặt lịch thử đồ. Hệ thống tạo lịch ở trạng thái chờ xác nhận, shop sẽ phản hồi sau. Bạn có thể ghi chú thêm nếu cần tư vấn size hoặc màu.';
  }

  if (normalized.includes('huy don thue') || (normalized.includes('huy don') && normalized.includes('thue'))) {
    return 'Bạn có thể hủy đơn thuê theo mốc thời gian và điều kiện của shop. Thông thường, hủy càng sớm thì phí càng thấp; nếu đã sát lịch hoặc đã nhận đồ, có thể áp dụng phí hủy hoặc không hoàn cọc theo quy định của đơn.';
  }

  if (normalized.includes('khac nhau giua thue va mua')) {
    return 'Thuê phù hợp khi bạn cần sử dụng ngắn hạn, chỉ trả phí thuê và hoàn trả đồ sau khi dùng. Mua phù hợp khi bạn muốn sở hữu lâu dài, thanh toán toàn bộ giá trị sản phẩm và không cần trả lại.';
  }

  if (normalized.includes('muon thue can') || normalized.includes('can gi de thue')) {
    return 'Để thuê đồ, bạn cần có tài khoản, chọn sản phẩm và lịch thuê, đặt cọc theo hướng dẫn, sau đó đến lấy đồ đúng hẹn. Khi trả đồ, hệ thống sẽ đối soát tình trạng để chốt đơn.';
  }

  if (normalized.includes('quy tac thue') || normalized.includes('quy dinh thue') || normalized.includes('dieu kien thue') || normalized.includes('chinh sach thue')) {
    return 'Quy tắc thuê có 4 điểm chính: đặt cọc theo quy định, sử dụng và bảo quản đồ đúng cách, trả đồ đúng lịch, và phát sinh phí nếu hỏng mất hoặc trễ hẹn theo mức độ. Bạn có thể xem chi tiết tại trang chính sách thuê của shop.';
  }

  if (normalized.includes('luong thue')
    || normalized.includes('quy trinh thue')
    || normalized.includes('thu tuc thue')
    || normalized.includes('cac buoc thue')
    || normalized.includes('cac buoc de thue')
    || normalized.includes('huong dan thue')
    || /cac\s+buoc.*thue/.test(normalized)
    || /huong\s+dan.*thue/.test(normalized)) {
    return 'Luồng thuê gồm: chọn sản phẩm -> chọn thời gian thuê -> xác nhận đơn và đặt cọc -> lấy đồ -> sử dụng -> trả đồ -> đối soát và hoàn tất đơn.';
  }

  return null;
};

const buildVoucherAnswer = async ({ actor }) => {
  if (!actor?.id) {
    return {
      type: 'TEXT',
      answer: 'Bạn cần đăng nhập để xem danh sách voucher của mình.',
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
      answer: 'Hiện tại bạn không có voucher khả dụng nào.',
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
    return `${index + 1}. ${item.code || '-'} - ${item.name || 'Voucher'} - Giá trị: ${value} - Hạn: ${endDate}`;
  });

  return {
    type: 'TEXT',
    answer: `Bạn đang có ${vouchers.length} voucher khả dụng:\n${lines.join('\n')}`,
    usage: null,
    model: null,
    intent: 'VOUCHER',
    toolData: null,
    contexts: [],
  };
};

const LOGIN_REQUIRED_FOR_PERSONAL_INFO_MESSAGE = 'Bạn nên đăng nhập để có thể tra cứu thông tin của mình.';

const requiresLoginForIntent = (intent) => {
  return intent === 'USER' || intent === 'ORDER' || intent === 'ORDER_DETAIL';
};

const buildLoginRequiredResponse = (intent) => {
  if (intent === 'ORDER' || intent === 'ORDER_DETAIL') {
    return {
      type: 'ORDER',
      message: LOGIN_REQUIRED_FOR_PERSONAL_INFO_MESSAGE,
      answer: LOGIN_REQUIRED_FOR_PERSONAL_INFO_MESSAGE,
      data: [],
      usage: null,
      model: null,
      intent,
      toolData: null,
      contexts: [],
    };
  }

  return {
    type: 'TEXT',
    answer: LOGIN_REQUIRED_FOR_PERSONAL_INFO_MESSAGE,
    usage: null,
    model: null,
    intent,
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

const USER_ROLE_LABEL = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  owner: 'Chủ cửa hàng',
};

const USER_STATUS_LABEL = {
  active: 'Đang hoạt động',
  locked: 'Đã khóa',
  inactive: 'Ngừng hoạt động',
};

const ORDER_STATUS_LABEL = {
  Draft: 'Nháp',
  PendingDeposit: 'Chờ đặt cọc',
  Deposited: 'Đã đặt cọc',
  Confirmed: 'Đã xác nhận',
  WaitingPickup: 'Chờ nhận đồ',
  Renting: 'Đang thuê',
  WaitingReturn: 'Chờ trả đồ',
  Returned: 'Đã trả đồ',
  Completed: 'Hoàn tất',
  NoShow: 'Không đến nhận',
  Late: 'Trễ hạn',
  Compensation: 'Bồi thường',
  Cancelled: 'Đã hủy',
  PendingPayment: 'Chờ thanh toán',
  PendingConfirmation: 'Chờ xác nhận',
  Paid: 'Đã thanh toán',
  Shipping: 'Đang giao hàng',
  Refunded: 'Đã hoàn tiền',
};

const toUserRoleLabel = (role) => USER_ROLE_LABEL[String(role || '').toLowerCase()] || role || '-';
const toUserStatusLabel = (status) => USER_STATUS_LABEL[String(status || '').toLowerCase()] || status || '-';
const toOrderStatusLabel = (status) => ORDER_STATUS_LABEL[String(status || '')] || status || '-';

const buildUserAnswer = ({ records }) => {
  if (!records.length) {
    return 'Không tìm thấy thông tin phù hợp.';
  }

  const user = records[0];
  return [
    `Tên: ${user.name || '-'}.`,
    `Email: ${user.email || '-'}.`,
    `Số điện thoại: ${user.phone || '-'}, Vai trò: ${toUserRoleLabel(user.role)}, Trạng thái: ${toUserStatusLabel(user.status)}.`,
  ].join(' ');
};

const buildOrderAnswer = ({ records, message }) => {
  if (!records.length) {
    return 'Không tìm thấy thông tin phù hợp.';
  }

  const source = isLatestQuery(message) ? [records[0]] : records;
  const first = source[0];
  const orderLabel = first.orderType === 'rent' ? 'đơn thuê' : 'đơn mua';

  return [
    `${orderLabel.charAt(0).toUpperCase() + orderLabel.slice(1)}: ${first.id}.`,
    `Trạng thái: ${toOrderStatusLabel(first.status)}, Tổng tiền: ${Number(first.totalAmount || 0)}.`,
    `Ngày tạo: ${formatDate(first.createdAt) || '-'}.`,
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
      `Ý định: ${intent}`,
      `Câu hỏi người dùng: ${message}`,
      'Hãy trả lời ngắn gọn bằng tiếng Việt có dấu, tối đa 4 câu.',
      'Chỉ tóm tắt thông tin đơn hàng từ context.',
      'Nếu context là danh sách sản phẩm trong đơn thì liệt kê gọn theo từng đơn.',
      'Tuyệt đối không nói về API, backend, database.',
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
    ? ' Nếu bạn muốn, tôi có thể giải thích nhanh chính sách trả trễ/hủy đơn ở tin nhắn tiếp theo.'
    : '';

  if (orderType === 'rent') {
    return `Tìm thấy ${rentCount} đơn thuê gần đây. Bấm "Xem chi tiết" để mở trang đơn.${policyHint}`;
  }

  if (orderType === 'sale') {
    return `Tìm thấy ${saleCount} đơn mua gần đây. Bấm "Xem chi tiết" ở đơn hỗ trợ để mở trang đơn.${policyHint}`;
  }

  return `Tìm thấy ${records.length} đơn gần đây. Bấm "Xem chi tiết" để mở trang đơn.${policyHint}`;
};

const buildProductListMessage = ({ records, message }) => {
  if (!records.length) {
    return 'Không tìm thấy sản phẩm phù hợp.';
  }

  const normalized = normalizeForMatch(message);
  if (isProductCatalogOverviewIntent(message)) {
    const categories = [...new Set(
      records
        .map((item) => String(item?.category || '').trim())
        .filter(Boolean)
    )];

    if (categories.length > 0) {
      return `Shop hiện có các nhóm trang phục: ${categories.slice(0, 8).join(', ')}.`;
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
      return `Có ${sizes.length} size phù hợp: ${sizes.join(', ')}.`;
    }
  }

  if (normalized.includes('dat den re') || normalized.includes('giam dan') || normalized.includes('cao den thap')) {
    return `Tìm thấy ${records.length} sản phẩm (sắp xếp giá từ cao đến thấp).`;
  }

  if (normalized.includes('re den dat') || normalized.includes('tang dan') || normalized.includes('thap den cao')) {
    return `Tìm thấy ${records.length} sản phẩm (sắp xếp giá từ thấp đến cao).`;
  }

  return `Tìm thấy ${records.length} sản phẩm phù hợp.`;
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

const resolveSessionRequestId = ({ payload, requestId }) => {
  const candidate = String(payload?.sessionId || '').trim();
  if (!candidate) {
    return requestId;
  }

  const sanitized = candidate.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120);
  return sanitized || requestId;
};

const chatWithTools = async ({ payload = {}, actor = {}, requestId }) => {
  const { message, topK } = validateChatInput(payload);
  const intentInfo = detectChatIntent(message);
  const sessionRequestId = resolveSessionRequestId({ payload, requestId });
  const sessionState = getChatSession({ actor, requestId: sessionRequestId });
  const isLoadMoreProducts = isProductLoadMoreRequest(message) && Boolean(sessionState.lastProductQuery);

  if (!actor?.id && requiresLoginForIntent(intentInfo.intent)) {
    return buildLoginRequiredResponse(intentInfo.intent);
  }

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
        requestId: sessionRequestId,
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
        requestId: sessionRequestId,
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
        message: 'Không tìm thấy thông tin phù hợp.',
        answer: 'Không tìm thấy thông tin phù hợp.',
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

    saveChatSession({
      actor,
      requestId: sessionRequestId,
      state: {
        ...sessionState,
        lastProductQuery: isLoadMoreProducts ? sessionState.lastProductQuery : message,
        lastProductFilters: appliedFilters,
        lastProductPage: page,
        lastProductLimit: limit,
      },
    });

    if (!records.length) {
      const rentalPolicyAnswer = getRentalPolicyKnowledgeAnswer(message);
      if (rentalPolicyAnswer) {
        return {
          type: 'TEXT',
          answer: rentalPolicyAnswer,
          usage: null,
          model: 'policy-direct',
          intent: 'KNOWLEDGE',
          toolData,
          contexts: [],
        };
      }

      const faq = findFaqAnswer(message);
      if (faq) {
        return {
          type: 'TEXT',
          answer: faq.answer,
          usage: null,
          model: 'faq-direct',
          intent: 'FAQ',
          toolData,
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

    const baseMessage = buildProductListMessage({ records, message });

    return {
      type: 'PRODUCT_LIST',
      message: baseMessage,
      data: records,
      meta: {
        page,
        limit,
        total,
        canLoadMore,
        loadMorePrompt: 'xem thêm sản phẩm',
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
      answer: 'Không tìm thấy thông tin phù hợp.',
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
      }) || 'Không tìm thấy thông tin phù hợp.',
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
        answer: fallbackKnowledge || 'Tính năng tri thức nâng cao đang tạm tắt do thiếu cấu hình LLM. Bạn có thể hỏi về đơn hàng, voucher, hoặc tìm sản phẩm để chatbot xử lý trực tiếp.',
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

