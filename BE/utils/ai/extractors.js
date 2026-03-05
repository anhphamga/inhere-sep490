const ORDER_CODE_REGEX = /\b(?:RENT|SALE|ORD)[-_]?[A-Z0-9]{3,}\b/i;
const OBJECT_ID_REGEX = /\b[a-f0-9]{24}\b/i;

const extractOrderCode = (text) => {
  const raw = String(text ?? '');
  const codeMatch = raw.match(ORDER_CODE_REGEX);
  if (codeMatch) return codeMatch[0].toUpperCase();

  const objectIdMatch = raw.match(OBJECT_ID_REGEX);
  if (objectIdMatch) return objectIdMatch[0];

  return '';
};

module.exports = {
  extractOrderCode,
};

