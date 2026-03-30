const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 2000;

const sessions = new Map();

const nowMs = () => Date.now();

const buildSessionKey = ({ actor = {}, requestId = '' }) => {
  const actorId = String(actor?.id || '').trim();
  if (actorId) {
    return `actor:${actorId}`;
  }

  const fallback = String(requestId || '').trim();
  return fallback ? `request:${fallback}` : 'anonymous';
};

const pruneExpiredSessions = () => {
  const current = nowMs();

  for (const [key, value] of sessions.entries()) {
    if ((current - value.updatedAt) > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }

  if (sessions.size <= MAX_SESSIONS) {
    return;
  }

  const ordered = [...sessions.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const removeCount = sessions.size - MAX_SESSIONS;
  for (let index = 0; index < removeCount; index += 1) {
    sessions.delete(ordered[index][0]);
  }
};

const getChatSession = ({ actor = {}, requestId = '' }) => {
  pruneExpiredSessions();

  const key = buildSessionKey({ actor, requestId });
  const existing = sessions.get(key);

  if (existing) {
    return existing.state;
  }

  const state = {
    lastOrderIds: [],
    lastOrderDetails: [],
    lastOrderType: null,
    lastProductQuery: null,
    lastProductFilters: null,
    lastProductPage: 0,
    lastProductLimit: null,
  };

  sessions.set(key, {
    state,
    updatedAt: nowMs(),
  });

  return state;
};

const saveChatSession = ({ actor = {}, requestId = '', state = {} }) => {
  pruneExpiredSessions();

  const key = buildSessionKey({ actor, requestId });
  const safeState = {
    lastOrderIds: Array.isArray(state.lastOrderIds) ? state.lastOrderIds.slice(0, 20) : [],
    lastOrderDetails: Array.isArray(state.lastOrderDetails) ? state.lastOrderDetails.slice(0, 20) : [],
    lastOrderType: state.lastOrderType || null,
    lastProductQuery: state.lastProductQuery || null,
    lastProductFilters: state.lastProductFilters && typeof state.lastProductFilters === 'object'
      ? { ...state.lastProductFilters }
      : null,
    lastProductPage: Number.isInteger(state.lastProductPage) && state.lastProductPage > 0
      ? state.lastProductPage
      : 0,
    lastProductLimit: Number.isInteger(state.lastProductLimit) && state.lastProductLimit > 0
      ? state.lastProductLimit
      : null,
  };

  sessions.set(key, {
    state: safeState,
    updatedAt: nowMs(),
  });
};

module.exports = {
  getChatSession,
  saveChatSession,
};
