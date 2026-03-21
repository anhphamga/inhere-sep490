const formatPayload = (payload) => {
  if (payload === undefined || payload === null) {
    return '';
  }

  try {
    return ` ${JSON.stringify(payload)}`;
  } catch (error) {
    return ' [unserializable-payload]';
  }
};

const log = (level, message, payload) => {
  const timestamp = new Date().toISOString();
  const prefix = `[chatbot][${timestamp}][${level.toUpperCase()}]`;
  // eslint-disable-next-line no-console
  console.log(`${prefix} ${message}${formatPayload(payload)}`);
};

module.exports = {
  info: (message, payload) => log('info', message, payload),
  warn: (message, payload) => log('warn', message, payload),
  error: (message, payload) => log('error', message, payload),
};
