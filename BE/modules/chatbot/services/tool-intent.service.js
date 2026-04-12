const { sanitizeText } = require('../utils/sanitize');
const { getToolSearchConfig } = require('../utils/tool-search.config');

const normalizeForMatch = (value) => {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
};

const includesAnyKeyword = (message, keywords) => {
  return keywords.some((keyword) => message.includes(normalizeForMatch(keyword)));
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesAny = (message, words) => {
  return words.some((word) => {
    const normalizedWord = String(word || '').trim().toLowerCase();
    if (!normalizedWord) {
      return false;
    }

    // Single short tokens (e.g. "ao") should match whole words only.
    if (!normalizedWord.includes(' ') && normalizedWord.length <= 3) {
      const pattern = new RegExp(`\\b${escapeRegex(normalizedWord)}\\b`, 'i');
      return pattern.test(message);
    }

    return message.includes(normalizedWord);
  });
};

const hasOrderDomain = (message) => {
  return includesAny(message, [
    'don',
    'order',
    'don hang',
    'don thue',
    'don mua',
    'ma don',
    'trang thai don',
  ]);
};

const isRentalKnowledgeIntent = (message) => {
  const hasPolicyNoun = includesAny(message, [
    'quy tac thue',
    'quy dinh thue',
    'dieu kien thue',
    'chinh sach thue',
    'chinh sach',
    'chinh sach coc',
    'chinh sach boi thuong',
    'chinh sach tra tre',
    'dat coc',
    'tien coc',
    'hoan coc',
    'boi thuong',
    'hong mat',
    'hong do',
    'lam hong',
    'lam rach',
    'mat do',
    'mat ao',
    'that lac',
    'tra tre',
    'lay muon',
    'den lay muon',
    'khong den nhan',
    'no show',
    'noshow',
  ]);

  if (hasPolicyNoun) {
    return true;
  }

  const hasPolicyAction = includesAny(message, [
    'muon thue can',
    'can gi de thue',
    'thu tuc thue',
    'quy trinh thue',
    'luong thue',
    'huy don',
    'huy don thue',
    'xu ly sao',
    'co sao khong',
    'tinh phi sao',
  ]);

  const hasRentalContext = includesAny(message, [
    'thue',
    'don thue',
    'lay do',
    'tra do',
    'san pham thue',
    'trang phuc thue',
    'ao',
    'vay',
    'dam',
    'quan',
  ]);

  return hasPolicyAction && hasRentalContext;
};

const isSelfOrderIntent = (message) => {
  const hasSelf = includesAny(message, ['cua toi', 'toi', 'my']);
  const hasOrderNoun = includesAny(message, ['don', 'order']);
  const hasDomain = includesAny(message, ['don hang', 'don thue', 'thue', 'rent', 'mua', 'sale']);

  return hasSelf && (hasOrderNoun || hasDomain);
};

const isOrderDetailIntent = (message) => {
  const hasOrderRef = includesAny(message, [
    'don nay',
    'don do',
    'nhung don',
    'cac don',
    'don thu',
    'don gan nhat',
    'don moi nhat',
    'chi tiet don',
    'don hang',
    'don thue',
    'don mua',
    'order',
    'ma don',
  ]) || /[a-f0-9]{24}/.test(message);

  const hasDetailWords = includesAny(message, [
    'chi tiet',
    'co gi',
    'gom gi',
    'thue gi',
    'mua gi',
    'san pham gi',
    'nhung san pham',
    'cac san pham',
    'san pham trong don',
    'item',
    'mat hang',
  ]);

  return (hasOrderRef && hasDetailWords) || (hasOrderDomain(message) && hasDetailWords);
};

const isSelfUserIntent = (message) => {
  const hasSelf = includesAny(message, ['cua toi', 'toi', 'my']);
  const hasUserDomain = includesAny(message, ['thong tin', 'ho so', 'tai khoan', 'account', 'profile', 'user']);

  return hasSelf && hasUserDomain;
};

const isVoucherIntent = (message) => {
  const hasVoucherWord = includesAny(message, ['voucher', 'ma giam', 'giam gia', 'khuyen mai', 'uu dai']);
  const hasSelfOrList = includesAny(message, [
    'cua toi',
    'toi',
    'my',
    'co gi',
    'danh sach',
    'nhung',
    'hien co',
    'dang co',
    'xem',
    'liet ke',
  ]);
  const hasHowToWord = includesAny(message, [
    'cach',
    'huong dan',
    'su dung',
    'ap dung',
    'nhap ma',
    'nhu the nao',
    'the nao',
  ]);

  return hasVoucherWord && hasSelfOrList && !hasHowToWord;
};

const isVoucherKnowledgeIntent = (message) => {
  const hasVoucherWord = includesAny(message, ['voucher', 'ma giam', 'giam gia', 'khuyen mai', 'uu dai']);
  const hasHowToWord = includesAny(message, [
    'cach',
    'huong dan',
    'su dung',
    'ap dung',
    'nhap ma',
    'nhu the nao',
    'the nao',
  ]);

  return hasVoucherWord && hasHowToWord;
};

const isFittingBookingKnowledgeIntent = (message) => {
  const hasHowToWord = includesAny(message, ['cach', 'huong dan', 'lam sao', 'nhu the nao']);
  const hasBookingWord = includesAny(message, ['dat lich', 'booking', 'book lich', 'hen lich']);
  const hasFittingWord = includesAny(message, ['thu do', 'fitting']);
  const hasFittingTypoWord = /thu+\s*do/.test(message);

  return (hasHowToWord && hasFittingWord) || (hasHowToWord && hasBookingWord && (hasFittingWord || hasFittingTypoWord));
};

const isProductIntent = (message) => {
  if (isRentalKnowledgeIntent(message)) {
    return false;
  }

  const hasProductWord = includesAny(message, [
    'san pham',
    'trang phuc',
    'ao dai',
    'ao',
    'vay',
    'dam',
    'quan',
    'do',
    'phu kien',
    'voan',
    'cai toc',
    'non',
    'quat',
    'vong',
    'outfit',
    'do mac',
  ]);
  const hasSuggestWord = includesAny(message, ['goi y', 'tu van', 'de xuat', 'tham khao']);
  const hasSearchWord = includesAny(message, ['tim', 'loc', 'search', 'xem', 'co', 'hien thi']);
  const hasPriceWord = includesAny(message, [
    'gia',
    'duoi',
    'tren',
    'tu',
    'den',
    're',
    'dat',
    'k',
    'trieu',
    'vnd',
  ]);
  const hasSortWord = includesAny(message, [
    'sap xep',
    'tang dan',
    'giam dan',
    'cao den thap',
    'thap den cao',
    'dat den re',
    're den dat',
    'moi nhat',
  ]);
  const hasOrderContext = hasOrderDomain(message) || includesAny(message, ['don nay', 'don do', 'chi tiet don']);

  if (hasOrderContext) {
    return false;
  }

  if (hasProductWord && (hasSuggestWord || hasSearchWord || hasPriceWord || hasSortWord)) {
    return true;
  }

  return hasProductWord;
};

const isLikelyProductNameQuery = (message) => {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return false;
  }

  const hasQuestionSignal = includesAny(normalized, [
    '?',
    'la gi',
    'khi nao',
    'the nao',
    'tai sao',
    'vi sao',
    'co the',
    'hay khong',
    'khong',
  ]);

  if (hasQuestionSignal) {
    return false;
  }

  const hasProductLikeTokens = includesAny(normalized, [
    'voan',
    'cai toc',
    'co dau',
    'phu kien',
    'non',
    'quat',
    'vay',
    'ao',
    'dam',
    'quan',
    'viet phuc',
    'co phuc',
  ]);

  const tokenCount = normalized.split(/\s+/).filter(Boolean).length;
  return hasProductLikeTokens && tokenCount <= 8;
};

const isInventorySearchIntent = (message) => {
  const hasInventoryWord = includesAny(message, ['con hang', 'het hang', 'khong con hang', 'available', 'in stock']);
  const hasSearchWord = includesAny(message, ['tim', 'loc', 'search', 'xem', 'hien thi', 'goi y']);
  const hasProductDomain = includesAny(message, ['san pham', 'trang phuc', 'ao', 'vay', 'dam', 'quan', 'do']);
  return hasInventoryWord && hasSearchWord && hasProductDomain;
};

const hasProductContext = (message) => includesAny(message, [
  'san pham',
  'trang phuc',
  'ao dai',
  'ao',
  'vay',
  'dam',
  'quan',
  'outfit',
  'do mac',
]);

const detectChatIntent = (rawMessage) => {
  const message = normalizeForMatch(rawMessage);
  const config = getToolSearchConfig();

  const selfOrderKeywords = [
    'don hang cua toi',
    'don cua toi',
    'don thue cua toi',
    'thong tin don thue cua toi',
    'order cua toi',
    'rent order cua toi',
    'my order',
  ];

  const selfUserKeywords = [
    'thong tin cua toi',
    'thong tin toi',
    'ho so cua toi',
    'tai khoan cua toi',
    'my profile',
    'my account',
  ];

  const orderDetailKeywords = [
    'don nay co gi',
    'don nay gom gi',
    'don do co gi',
    'nhung don thue do co gi',
    'toi thue gi gan day',
    'chi tiet don',
    'chi tiet don hang',
    'chi tiet don thue',
    'what is in this order',
  ];

  if (includesAnyKeyword(message, config.intentOrderKeywords) && includesAny(message, ['chi tiet', 'co gi', 'thue gi', 'mua gi', 'san pham'])) {
    return {
      intent: 'ORDER_DETAIL',
      entity: 'order',
    };
  }

  if (isOrderDetailIntent(message) || includesAnyKeyword(message, orderDetailKeywords)) {
    return {
      intent: 'ORDER_DETAIL',
      entity: 'order',
    };
  }

  if (isSelfOrderIntent(message) || includesAnyKeyword(message, selfOrderKeywords)) {
    return {
      intent: 'ORDER',
      entity: 'order',
    };
  }

  if (isSelfUserIntent(message) || includesAnyKeyword(message, selfUserKeywords)) {
    return {
      intent: 'USER',
      entity: 'user',
    };
  }

  if (isVoucherKnowledgeIntent(message) || isFittingBookingKnowledgeIntent(message)) {
    return {
      intent: 'KNOWLEDGE',
      entity: null,
    };
  }

  if (isVoucherIntent(message)) {
    return {
      intent: 'VOUCHER',
      entity: null,
    };
  }

  if (isRentalKnowledgeIntent(message)) {
    return {
      intent: 'KNOWLEDGE',
      entity: null,
    };
  }

  if (hasOrderDomain(message)) {
    return {
      intent: 'ORDER',
      entity: 'order',
    };
  }

  if (includesAnyKeyword(message, config.intentOrderKeywords)) {
    return {
      intent: 'ORDER',
      entity: 'order',
    };
  }

  const productKeywordHit = includesAnyKeyword(message, config.intentProductKeywords || []);
  if (
    isInventorySearchIntent(message)
    || isProductIntent(message)
    || isLikelyProductNameQuery(message)
    || (productKeywordHit && hasProductContext(message))
  ) {
    return {
      intent: 'PRODUCT',
      entity: 'product',
    };
  }

  if (includesAnyKeyword(message, config.intentUserKeywords)) {
    return {
      intent: 'USER',
      entity: 'user',
    };
  }

  return {
    intent: 'KNOWLEDGE',
    entity: null,
  };
};

module.exports = {
  detectChatIntent,
};
