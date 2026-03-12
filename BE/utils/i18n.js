const SUPPORTED_LANGS = new Set(['vi', 'en']);

const normalizeText = (value) => String(value ?? '').trim();

const getRequestLang = (rawLang) => {
  const candidate = normalizeText(rawLang).toLowerCase();
  if (!candidate) return 'vi';
  if (candidate.startsWith('en')) return 'en';
  return 'vi';
};

const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
};

const pickLocalizedValue = (value, lang = 'vi') => {
  if (value === null || value === undefined) return '';

  const primitive = toText(value);
  if (primitive) return primitive;

  if (typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const safeLang = SUPPORTED_LANGS.has(lang) ? lang : 'vi';
  const fallbackLang = safeLang === 'en' ? 'vi' : 'en';

  const localized = toText(value[safeLang]);
  if (localized) return localized;

  const fallback = toText(value[fallbackLang]);
  if (fallback) return fallback;

  const semanticFallbackKeys = ['text', 'value', 'label', 'name', 'title', 'description', 'content'];
  for (const key of semanticFallbackKeys) {
    const candidate = toText(value[key]);
    if (candidate) return candidate;
  }

  return '';
};

const resolveLocalizedField = (record = {}, fieldName, lang = 'vi', fallback = '') => {
  const safeRecord = record && typeof record === 'object' ? record : {};
  const base = normalizeText(fieldName);
  if (!base) return normalizeText(fallback);

  const capField = `${base[0].toUpperCase()}${base.slice(1)}`;
  const primary = lang === 'en' ? 'En' : 'Vi';
  const secondary = lang === 'en' ? 'Vi' : 'En';
  const langCode = lang === 'en' ? 'en' : 'vi';
  const fallbackCode = lang === 'en' ? 'vi' : 'en';

  const candidates = [
    `${base}${primary}`,
    `${base}_${langCode}`,
    `${langCode}${capField}`,
    base,
    `${base}${secondary}`,
    `${base}_${fallbackCode}`,
    `${fallbackCode}${capField}`,
  ];

  for (const key of candidates) {
    if (!Object.prototype.hasOwnProperty.call(safeRecord, key)) continue;
    const resolved = pickLocalizedValue(safeRecord[key], lang);
    if (resolved) return resolved;
  }

  return normalizeText(fallback);
};

const normalizeLocalizedInput = (body = {}, fieldName) => {
  const base = normalizeText(fieldName);
  if (!base) return '';

  const capField = `${base[0].toUpperCase()}${base.slice(1)}`;
  const raw = body[base];
  const viFromSibling = body[`${base}Vi`] ?? body[`${base}_vi`] ?? body[`vi${capField}`];
  const enFromSibling = body[`${base}En`] ?? body[`${base}_en`] ?? body[`en${capField}`];

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const vi = pickLocalizedValue(raw.vi, 'vi') || pickLocalizedValue(raw, 'vi');
    const en = pickLocalizedValue(raw.en, 'en');
    if (vi || en) {
      return {
        vi: vi || en,
        en: en || vi,
      };
    }
  }

  const vi = normalizeText(viFromSibling !== undefined ? viFromSibling : raw);
  const en = normalizeText(enFromSibling);
  if (viFromSibling !== undefined || enFromSibling !== undefined || en) {
    return {
      vi: vi || en,
      en: en || vi,
    };
  }

  return vi;
};

const hasLocalizedText = (value) => Boolean(pickLocalizedValue(value, 'vi') || pickLocalizedValue(value, 'en'));

module.exports = {
  getRequestLang,
  pickLocalizedValue,
  resolveLocalizedField,
  normalizeLocalizedInput,
  hasLocalizedText,
};
