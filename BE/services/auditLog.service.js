const AuditLog = require('../model/AuditLog.model');

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

const writeAuditLog = async ({
  req,
  user,
  action,
  resource,
  resourceId,
  before = null,
  after = null,
}) => {
  return AuditLog.create({
    userId: user?.id || user?._id || null,
    role: String(user?.role || ''),
    action,
    resource,
    resourceId: resourceId ? String(resourceId) : '',
    before,
    after,
    timestamp: new Date(),
    ip: getClientIp(req || {}),
    device: req?.headers?.['user-agent'] || '',
  });
};

module.exports = {
  writeAuditLog,
};
