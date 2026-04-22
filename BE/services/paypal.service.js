const https = require('https');

const PAYPAL_MODE = String(process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
const PAYPAL_CLIENT_ID = String(process.env.PAYPAL_CLIENT_ID || '').trim();
const PAYPAL_CLIENT_SECRET = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
const PAYPAL_CURRENCY = String(process.env.PAYPAL_CURRENCY || 'USD').trim().toUpperCase();
const PAYPAL_VND_EXCHANGE_RATE = Number(process.env.PAYPAL_VND_EXCHANGE_RATE || 26000);
const PAYPAL_VND_VERIFY_TOLERANCE = Number(process.env.PAYPAL_VND_VERIFY_TOLERANCE || 2000);

const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);

const ensureCredentials = () => {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error('Thiếu cấu hình PayPal (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET).');
    }
};

const ensureExchangeRate = () => {
    if (!Number.isFinite(PAYPAL_VND_EXCHANGE_RATE) || PAYPAL_VND_EXCHANGE_RATE <= 0) {
        throw new Error('PAYPAL_VND_EXCHANGE_RATE không hợp lệ.');
    }
};

const formatAmountValue = (amount, currency) => {
    const normalizedAmount = Number(amount || 0);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error('Số tiền thanh toán PayPal không hợp lệ.');
    }

    if (ZERO_DECIMAL_CURRENCIES.has(currency)) {
        return String(Math.round(normalizedAmount));
    }

    return normalizedAmount.toFixed(2);
};

const convertVndToPayPalAmount = (amountVnd, currency = PAYPAL_CURRENCY) => {
    ensureExchangeRate();
    const currencyCode = String(currency || PAYPAL_CURRENCY).trim().toUpperCase();
    const normalizedVnd = Math.round(Number(amountVnd || 0));
    if (!Number.isFinite(normalizedVnd) || normalizedVnd <= 0) {
        throw new Error('Số tiền VND không hợp lệ để quy đổi PayPal.');
    }

    if (currencyCode === 'VND') {
        return {
            currencyCode,
            value: formatAmountValue(normalizedVnd, currencyCode),
            rate: 1,
            amountVnd: normalizedVnd,
        };
    }

    const converted = normalizedVnd / PAYPAL_VND_EXCHANGE_RATE;
    const minAmount = ZERO_DECIMAL_CURRENCIES.has(currencyCode) ? 1 : 0.01;
    const payable = Math.max(converted, minAmount);

    return {
        currencyCode,
        value: formatAmountValue(payable, currencyCode),
        rate: PAYPAL_VND_EXCHANGE_RATE,
        amountVnd: normalizedVnd,
    };
};

const convertPayPalAmountToVnd = ({ currencyCode, value }) => {
    ensureExchangeRate();
    const normalizedCurrency = String(currencyCode || PAYPAL_CURRENCY).trim().toUpperCase();
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw new Error('Giá trị tiền PayPal không hợp lệ để quy đổi về VND.');
    }

    if (normalizedCurrency === 'VND') {
        return Math.round(numericValue);
    }
    return Math.round(numericValue * PAYPAL_VND_EXCHANGE_RATE);
};

const extractPayPalPaidAmount = (payload = {}) => {
    const units = Array.isArray(payload?.purchase_units) ? payload.purchase_units : [];
    for (const unit of units) {
        const captures = Array.isArray(unit?.payments?.captures) ? unit.payments.captures : [];
        const completedCapture = captures.find((capture) => String(capture?.status || '').toUpperCase() === 'COMPLETED');
        if (completedCapture?.amount?.value) {
            return {
                currencyCode: completedCapture.amount.currency_code,
                value: completedCapture.amount.value,
            };
        }

        if (unit?.amount?.value) {
            return {
                currencyCode: unit.amount.currency_code,
                value: unit.amount.value,
            };
        }
    }

    return null;
};

const isEquivalentVndAmount = (expectedVnd, actualVnd) => {
    const expected = Math.round(Number(expectedVnd || 0));
    const actual = Math.round(Number(actualVnd || 0));
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) return false;
    const tolerance = Math.max(0, Math.round(PAYPAL_VND_VERIFY_TOLERANCE));
    return Math.abs(expected - actual) <= tolerance;
};

const requestPayPal = ({ method, path, headers = {}, body = null }) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = https.request(
            `${PAYPAL_BASE_URL}${path}`,
            {
                method,
                headers: {
                    ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
                    ...headers,
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    let parsed = {};
                    try {
                        parsed = raw ? JSON.parse(raw) : {};
                    } catch {
                        parsed = { raw };
                    }

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                        return;
                    }

                    const detail = parsed?.message || parsed?.error_description || parsed?.details?.[0]?.issue || raw;
                    reject(new Error(`PayPal API error (${res.statusCode}): ${detail}`));
                });
            }
        );

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
};

const getAccessToken = async () => {
    ensureCredentials();
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    return new Promise((resolve, reject) => {
        const body = 'grant_type=client_credentials';
        const req = https.request(
            `${PAYPAL_BASE_URL}/v1/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    let parsed = {};
                    try {
                        parsed = raw ? JSON.parse(raw) : {};
                    } catch {
                        parsed = { raw };
                    }

                    if (res.statusCode >= 200 && res.statusCode < 300 && parsed.access_token) {
                        resolve(parsed.access_token);
                        return;
                    }

                    const detail = parsed?.error_description || parsed?.error || raw;
                    reject(new Error(`Không lấy được access token PayPal: ${detail}`));
                });
            }
        );

        req.on('error', reject);
        req.write(body);
        req.end();
    });
};

const extractApproveUrl = (orderPayload) => {
    const links = Array.isArray(orderPayload?.links) ? orderPayload.links : [];
    const approve = links.find((item) => item?.rel === 'approve');
    return approve?.href || '';
};

const createOrder = async ({ amount, amountVnd, description, cancelUrl, returnUrl, currency = PAYPAL_CURRENCY, referenceId = '', customId = '' }) => {
    const accessToken = await getAccessToken();
    const sourceAmount = Number.isFinite(Number(amountVnd)) ? amountVnd : amount;
    const converted = convertVndToPayPalAmount(sourceAmount, currency);

    return requestPayPal({
        method: 'POST',
        path: '/v2/checkout/orders',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
        },
        body: {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    // PayPal v2 từ chối empty string cho optional fields → chỉ include khi có giá trị
                    ...(referenceId ? { reference_id: String(referenceId).slice(0, 256) } : {}),
                    ...(customId ? { custom_id: String(customId).slice(0, 127) } : {}),
                    ...(description ? { description: String(description).slice(0, 127) } : {}),
                    amount: {
                        currency_code: converted.currencyCode,
                        value: converted.value,
                    },
                },
            ],
            application_context: {
                user_action: 'PAY_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl,
                shipping_preference: 'NO_SHIPPING',
            },
        },
    });
};

const getOrder = async (paypalOrderId) => {
    const accessToken = await getAccessToken();
    return requestPayPal({
        method: 'GET',
        path: `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
};

const captureOrder = async (paypalOrderId) => {
    const accessToken = await getAccessToken();
    return requestPayPal({
        method: 'POST',
        path: `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
        },
        body: {},
    });
};

module.exports = {
    createOrder,
    getOrder,
    captureOrder,
    extractApproveUrl,
    convertVndToPayPalAmount,
    convertPayPalAmountToVnd,
    extractPayPalPaidAmount,
    isEquivalentVndAmount,
};
