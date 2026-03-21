const ChatbotError = require('./chatbotError');
const logger = require('./logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const calculateBackoff = (attempt, baseDelayMs) => {
  const jitter = Math.floor(Math.random() * 200);
  return (baseDelayMs * 2 ** (attempt - 1)) + jitter;
};

const requestWithRetry = async ({
  url,
  method = 'GET',
  headers,
  body,
  timeoutMs = 15000,
  maxRetries = 3,
  retryOnStatus = [429, 500, 502, 503, 504],
  baseDelayMs = 800,
  requestName = 'external-request',
}) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.info('HTTP request started', { requestName, url, method, attempt });
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const payload = await parseJsonResponse(response);

      if (response.ok) {
        logger.info('HTTP request success', {
          requestName,
          status: response.status,
          attempt,
        });

        clearTimeout(timeoutId);
        return payload;
      }

      const shouldRetry = retryOnStatus.includes(response.status) && attempt <= maxRetries;

      logger.warn('HTTP request non-2xx response', {
        requestName,
        status: response.status,
        attempt,
        shouldRetry,
      });

      if (!shouldRetry) {
        clearTimeout(timeoutId);
        throw new ChatbotError('External service returned non-success status', {
          statusCode: 502,
          code: 'UPSTREAM_ERROR',
          details: {
            requestName,
            status: response.status,
            payload,
          },
        });
      }

      clearTimeout(timeoutId);
      await sleep(calculateBackoff(attempt, baseDelayMs));
    } catch (error) {
      clearTimeout(timeoutId);

      const isAbort = error.name === 'AbortError';
      const shouldRetry = attempt <= maxRetries;

      if (isAbort) {
        lastError = new ChatbotError('External service timeout', {
          statusCode: 504,
          code: 'UPSTREAM_TIMEOUT',
          details: { requestName, timeoutMs },
        });
      } else {
        lastError = error;
      }

      logger.error('HTTP request failed', {
        requestName,
        attempt,
        message: lastError.message,
        isAbort,
        shouldRetry,
      });

      if (!shouldRetry) {
        throw lastError;
      }

      await sleep(calculateBackoff(attempt, baseDelayMs));
    }
  }

  throw lastError || new ChatbotError('External service request failed', {
    statusCode: 502,
    code: 'UPSTREAM_UNREACHABLE',
  });
};

module.exports = {
  requestWithRetry,
};
