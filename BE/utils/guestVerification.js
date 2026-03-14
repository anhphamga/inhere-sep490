const crypto = require('crypto');

const CODE_TTL_MINUTES = 5;
const MAX_RESEND_COUNT = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const CODE_LENGTH = 6;

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (value = '') => String(value).replace(/\s+/g, '').trim();
const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const isValidPhone = (value = '') => PHONE_REGEX.test(normalizePhone(value));
const isValidEmail = (value = '') => EMAIL_REGEX.test(normalizeEmail(value));

const generateVerificationCode = () => {
  const max = 10 ** CODE_LENGTH;
  const min = 10 ** (CODE_LENGTH - 1);
  return String(Math.floor(Math.random() * (max - min)) + min);
};

const hashVerificationCode = (code = '') =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

const getExpiresAt = () => new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

module.exports = {
  CODE_TTL_MINUTES,
  MAX_RESEND_COUNT,
  MAX_VERIFY_ATTEMPTS,
  generateVerificationCode,
  getExpiresAt,
  hashVerificationCode,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
};
