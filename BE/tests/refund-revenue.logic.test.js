const {
  isRevenueEligibleSaleOrder,
  buildSaleRevenueMatch,
} = require('../utils/revenueFilters');
const {
  resolveSaleOrderUserStatus,
  normalizeSaleOrderStatusInput,
} = require('../utils/saleOrderStatus');

describe('refund and revenue logic', () => {
  test('completed order is counted in revenue', () => {
    expect(isRevenueEligibleSaleOrder({ status: 'Completed' })).toBe(true);
    expect(buildSaleRevenueMatch()).toEqual({
      status: { $in: ['Completed', 'COMPLETED'] },
    });
  });

  test('refunded order is not counted in revenue', () => {
    expect(isRevenueEligibleSaleOrder({ status: 'Refunded' })).toBe(false);
    expect(isRevenueEligibleSaleOrder({ status: 'REFUNDED' })).toBe(false);
  });

  test('refunded status maps to userStatus RETURNED', () => {
    const normalized = normalizeSaleOrderStatusInput('REFUNDED');
    expect(normalized).toBe('Refunded');
    expect(resolveSaleOrderUserStatus(normalized)).toBe('RETURNED');
  });
});
