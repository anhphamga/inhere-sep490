import { vi } from '../locales/vi';

const getByPath = (obj, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

export const useTranslate = () => {
  const t = (key, fallback = '') => {
    const value = getByPath(vi, key);
    if (value === undefined || value === null) return fallback || key;
    return value;
  };

  return { t };
};

