const mongoose = require('mongoose');
const User = require('../../../../model/User.model');
const ChatbotError = require('../../utils/chatbotError');
const { getToolSearchConfig } = require('../../utils/tool-search.config');

const ALLOWED_SEARCH_FIELD_MAP = {
  _id: '_id',
  name: 'name',
  email: 'email',
  phone: 'phone',
};

const OUTPUT_FIELD_MAP = {
  _id: '_id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  role: 'role',
  status: 'status',
  address: 'address',
  gender: 'gender',
  createdat: 'createdAt',
  updatedat: 'updatedAt',
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeForMatch = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
};

const includesAny = (message, words) => {
  return words.some((word) => message.includes(word));
};

const isSelfProfileQuery = (query) => {
  const normalized = normalizeForMatch(query);
  const hasSelf = includesAny(normalized, ['cua toi', 'toi', 'my']);
  const hasUserDomain = includesAny(normalized, [
    'thong tin',
    'chi tiet',
    'ho so',
    'tai khoan',
    'profile',
    'account',
    'user',
  ]);

  return hasSelf && hasUserDomain;
};

const toSafeProjection = (configuredOutputFields) => {
  const fields = configuredOutputFields
    .map((field) => OUTPUT_FIELD_MAP[field])
    .filter(Boolean);

  const projection = {};
  fields.forEach((field) => {
    projection[field] = 1;
  });

  // Always include _id for stable references.
  projection._id = 1;

  return projection;
};

const mapUserOutput = (doc) => {
  return {
    id: String(doc._id),
    name: doc.name || '',
    email: doc.email || '',
    phone: doc.phone || '',
    role: doc.role || '',
    status: doc.status || '',
    address: doc.address || '',
    gender: doc.gender || null,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
};

const buildUserSearchQuery = ({ query, filters, actor, config }) => {
  const mongoQuery = {};
  const regex = new RegExp(escapeRegex(query), 'i');
  const customerSelfQuery = actor.role === 'customer' && isSelfProfileQuery(query);

  const allowedSearchFields = config.userSearchFields
    .map((field) => ALLOWED_SEARCH_FIELD_MAP[field])
    .filter(Boolean);

  if (!customerSelfQuery) {
    const orClauses = [];
    allowedSearchFields.forEach((field) => {
      if (field === '_id' && mongoose.Types.ObjectId.isValid(query)) {
        orClauses.push({ _id: query });
        return;
      }

      if (field !== '_id') {
        orClauses.push({ [field]: regex });
      }
    });

    if (orClauses.length > 0) {
      mongoQuery.$or = orClauses;
    }
  }

  if (filters.status) {
    if (!config.userAllowedStatus.includes(filters.status)) {
      throw new ChatbotError('Invalid user status filter', {
        statusCode: 400,
        code: 'INVALID_TOOL_USER_STATUS_FILTER',
        details: {
          status: filters.status,
          allowedStatus: config.userAllowedStatus,
        },
      });
    }

    mongoQuery.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    mongoQuery.createdAt = {};
    if (filters.dateFrom) {
      mongoQuery.createdAt.$gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      mongoQuery.createdAt.$lte = filters.dateTo;
    }
  }

  if (actor.role === 'customer') {
    mongoQuery._id = actor.id;
  }

  return mongoQuery;
};

const searchUserService = async ({ query, filters, actor }) => {
  const config = getToolSearchConfig();

  const mongoQuery = buildUserSearchQuery({ query, filters, actor, config });
  const projection = toSafeProjection(config.userOutputFields);
  const skip = (filters.page - 1) * filters.limit;

  const [records, total] = await Promise.all([
    User.find(mongoQuery)
      .select(projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    User.countDocuments(mongoQuery),
  ]);

  return {
    entity: 'user',
    page: filters.page,
    limit: filters.limit,
    total,
    records: records.map(mapUserOutput),
  };
};

module.exports = {
  searchUserService,
};
