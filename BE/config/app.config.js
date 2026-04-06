const ensureNoTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');
const requireInProduction = (name, value) => {
  if (process.env.NODE_ENV === 'production' && !String(value || '').trim()) {
    throw new Error(`Missing required environment variable in production: ${name}`);
  }
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

requireInProduction('FRONTEND_URL', process.env.FRONTEND_URL);
requireInProduction('CHROMA_URL', process.env.CHROMA_URL);
requireInProduction('VIRTUAL_TRY_ON_API_URL', process.env.VIRTUAL_TRY_ON_API_URL);

const frontendUrl = ensureNoTrailingSlash(process.env.FRONTEND_URL || 'http://localhost:3000');
const chromaUrl = process.env.CHROMA_URL || 'http://127.0.0.1:8000';
const virtualTryOnApiUrl =
  process.env.VIRTUAL_TRY_ON_API_URL || 'https://demo.api4ai.cloud/virtual-try-on/v1/results';
const payosWebBaseUrl = process.env.PAYOS_WEB_BASE_URL || 'https://pay.payos.vn/web';
const orderMailImagePlaceholder =
  process.env.ORDER_MAIL_IMAGE_PLACEHOLDER || 'https://via.placeholder.com/70x70?text=INHERE';

const depositRatio = parseNumber(process.env.DEPOSIT_RATIO, 0.5);
const lateFeeMultiplier = parseNumber(process.env.LATE_FEE_MULTIPLIER, 50000);
const autoPenaltyLateDays = parseNumber(process.env.AUTO_PENALTY_LATE_DAYS, 3);
const pendingDepositHoldMinutes = parseNumber(process.env.PENDING_DEPOSIT_HOLD_MINUTES, 5);
const autoCancelIntervalMs = parseNumber(process.env.AUTO_CANCEL_INTERVAL_MS, 5 * 60 * 1000);

module.exports = {
  frontendUrl,
  chromaUrl,
  virtualTryOnApiUrl,
  payosWebBaseUrl,
  orderMailImagePlaceholder,
  depositRatio,
  lateFeeMultiplier,
  autoPenaltyLateDays,
  pendingDepositHoldMinutes,
  autoCancelIntervalMs,
};
