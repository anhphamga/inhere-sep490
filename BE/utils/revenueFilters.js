const SALE_REVENUE_STATUSES = ['Completed', 'COMPLETED'];
const RENT_REVENUE_STATUSES = ['Completed', 'COMPLETED'];

const isStatusInList = (status, allowedStatuses = []) => {
  const normalized = String(status || '').trim();
  if (!normalized) return false;
  return allowedStatuses.includes(normalized);
};

const isRevenueEligibleSaleOrder = (order = {}) => isStatusInList(order?.status, SALE_REVENUE_STATUSES);

const isRevenueEligibleRentOrder = (order = {}) => isStatusInList(order?.status, RENT_REVENUE_STATUSES);

const buildSaleRevenueMatch = (extraMatch = {}) => ({
  ...extraMatch,
  status: { $in: SALE_REVENUE_STATUSES },
});

const buildRentRevenueMatch = (extraMatch = {}) => ({
  ...extraMatch,
  status: { $in: RENT_REVENUE_STATUSES },
});

module.exports = {
  SALE_REVENUE_STATUSES,
  RENT_REVENUE_STATUSES,
  isRevenueEligibleSaleOrder,
  isRevenueEligibleRentOrder,
  buildSaleRevenueMatch,
  buildRentRevenueMatch,
};
