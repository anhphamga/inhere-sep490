const normalizeIdempotencyKey = (req) => {
  const headerValue = req.headers['idempotency-key'];
  const bodyValue = req.body?.idempotencyKey;
  const rawValue = typeof headerValue === 'string' && headerValue.trim()
    ? headerValue
    : bodyValue;

  const normalized = String(rawValue || '').trim();
  return normalized || null;
};

const isDuplicateIdempotencyError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const duplicatedFields = Object.keys(error?.keyPattern || {});

  return (
    Number(error?.code) === 11000 &&
    (
      duplicatedFields.includes('idempotencyKey') ||
      message.includes('idempotencykey')
    )
  );
};

module.exports = {
  normalizeIdempotencyKey,
  isDuplicateIdempotencyError,
};
