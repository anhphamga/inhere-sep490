const { sanitizeText } = require('../utils/sanitize');
const { getToolSearchConfig } = require('../utils/tool-search.config');

const normalizeForMatch = (value) => {
  return sanitizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const includesAnyKeyword = (message, keywords) => {
  return keywords.some((keyword) => message.includes(normalizeForMatch(keyword)));
};

const includesAny = (message, words) => {
  return words.some((word) => message.includes(word));
};

const hasOrderDomain = (message) => {
  return includesAny(message, [
    'don',
    'order',
    'don hang',
    'don thue',
    'don mua',
    'thue',
    'mua',
  ]);
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

const isProductIntent = (message) => {
  const hasProductWord = includesAny(message, [
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

  if (includesAnyKeyword(message, config.intentOrderKeywords)) {
    return {
      intent: 'ORDER',
      entity: 'order',
    };
  }

  if (isProductIntent(message) || includesAnyKeyword(message, config.intentProductKeywords || [])) {
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
