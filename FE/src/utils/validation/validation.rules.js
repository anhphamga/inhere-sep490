export const EMAIL_REGEX =
  /^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
export const PHONE_REGEX_VN_INTL = /^(?:0\d{9}|\+84\d{9})$/;
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const normalizeUnicodeText = (value) =>
  String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();

export const required = (value) =>
  normalizeUnicodeText(value).length > 0;

export const isEmail = (value) =>
  EMAIL_REGEX.test(normalizeUnicodeText(value).toLowerCase());

export const isPhone = (value) =>
  PHONE_REGEX_VN_INTL.test(normalizePhone(value));

export const minLength = (value, min) =>
  normalizeUnicodeText(value).length >= Number(min || 0);

export const maxLength = (value, max) =>
  normalizeUnicodeText(value).length <= Number(max || 0);

export const nonNegativeNumber = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && normalizeUnicodeText(value) === "") return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
};

export const regexMatch = (value, regex) =>
  regex instanceof RegExp ? regex.test(normalizeUnicodeText(value)) : false;

export const toTrimmedText = (value) => normalizeUnicodeText(value);

export const normalizeText = (value) => normalizeUnicodeText(value);

export const normalizePhone = (value) =>
  (() => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const hasLeadingPlus = raw.startsWith("+");
    const digits = raw.replace(/\D+/g, "");
    return hasLeadingPlus ? `+${digits}` : digits;
  })();

export const isStrongPassword = (value) =>
  STRONG_PASSWORD_REGEX.test(String(value ?? ""));

export const isValidUrl = (value, options = {}) => {
  const text = normalizeUnicodeText(value);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    const allowedProtocols = Array.isArray(options.allowedProtocols) && options.allowedProtocols.length > 0
      ? options.allowedProtocols
      : ["http:", "https:"];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const isHtmlEmpty = (value) => {
  const plain = String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#8203;|\u200B/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length === 0;
};

export const mapZodErrors = (zodError) => {
  const issues = Array.isArray(zodError?.issues) ? zodError.issues : [];
  if (issues.length > 0) {
    return issues.reduce((acc, issue) => {
      const path = Array.isArray(issue?.path) ? issue.path : [];
      const key = path.length > 0 ? path.join(".") : "root";
      if (!acc[key] && issue?.message) acc[key] = issue.message;
      return acc;
    }, {});
  }

  const flattened = zodError?.flatten?.();
  const fieldErrors = flattened?.fieldErrors || {};
  return Object.keys(fieldErrors).reduce((acc, key) => {
    const message = Array.isArray(fieldErrors[key]) ? fieldErrors[key][0] : "";
    if (message) acc[key] = message;
    return acc;
  }, {});
};
