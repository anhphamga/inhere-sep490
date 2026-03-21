const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const sanitizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(CONTROL_CHAR_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = {
  sanitizeText,
};
