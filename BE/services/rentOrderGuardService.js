const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');
const { ORDER_TYPE } = require('../constants/order.constants');
const {
  depositRatio,
  lateFeeMultiplier,
  autoPenaltyLateDays,
} = require('../config/app.config');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LATE_FEE_MULTIPLIER = lateFeeMultiplier;
const AUTO_PENALTY_LATE_DAYS = autoPenaltyLateDays;

const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const computeExpectedDeposit = (order) => roundCurrency(Number(order?.totalAmount || 0) * depositRatio);

// Vietnam timezone offset: UTC+7
const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Tính số ngày trễ theo lịch Việt Nam (UTC+7).
 * Trả về ngày dương nếu trả trễ, 0 nếu đúng hạn hoặc sớm.
 */
const computeLateDays = (rentEndDate, returnDate = new Date()) => {
  const expectedDate = new Date(rentEndDate);
  const actualDate = new Date(returnDate);

  if (Number.isNaN(expectedDate.getTime()) || Number.isNaN(actualDate.getTime())) {
    return 0;
  }

  // Shift về UTC+7 rồi lấy ngày UTC → thực chất là ngày theo lịch VN
  const toVnCalendarDay = (d) => Math.floor((d.getTime() + VN_TZ_OFFSET_MS) / DAY_IN_MS);

  const diff = toVnCalendarDay(actualDate) - toVnCalendarDay(expectedDate);
  if (diff <= 0) return 0;
  return diff;
};

const validateDeposit = (order, amount = order?.depositAmount) => {
  const expectedAmount = computeExpectedDeposit(order);
  const actualAmount = roundCurrency(amount);

  if (actualAmount !== expectedAmount) {
    const error = new Error('Deposit must be exactly 50% of the rental total.');
    error.statusCode = 400;
    error.code = 'INVALID_DEPOSIT_AMOUNT';
    error.details = {
      expectedAmount,
      actualAmount,
    };
    throw error;
  }

  return {
    valid: true,
    expectedAmount,
  };
};

const sumPayments = async (orderId, purpose) => {
  const payments = await Payment.find({
    orderId,
    orderType: ORDER_TYPE.RENT,
    status: 'Paid',
    ...(purpose ? { purpose } : {}),
  }).lean();

  return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
};

const validatePickup = async (order, options = {}) => {
  if (!['Deposited', 'Confirmed', 'WaitingPickup'].includes(order?.status)) {
    const error = new Error(`Cannot complete pickup when order status is "${order?.status}".`);
    error.statusCode = 400;
    error.code = 'INVALID_PICKUP_STATUS';
    throw error;
  }

  const heldDeposit = await Deposit.findOne({ orderId: order._id, status: 'Held' }).lean();
  if (!heldDeposit) {
    const error = new Error('Pickup requires a confirmed held deposit.');
    error.statusCode = 400;
    error.code = 'DEPOSIT_REQUIRED';
    throw error;
  }

  // Pickup should not fail when order total changes after swap/upgrade.
  // Strict 50% check is enforced at deposit payment time (PendingDeposit flow),
  // while pickup only requires that a held deposit exists and is positive.
  const heldDepositAmount = roundCurrency(Number(heldDeposit.amount || 0));
  if (heldDepositAmount <= 0) {
    const error = new Error('Pickup requires a valid held deposit amount.');
    error.statusCode = 400;
    error.code = 'INVALID_HELD_DEPOSIT';
    error.details = {
      heldDepositAmount,
      expectedAmount: computeExpectedDeposit(order),
    };
    throw error;
  }

  const paidRemaining = await sumPayments(order._id, 'Remaining');
  const remainingAmount = Number(order.remainingAmount || 0);
  const enforceFullPayment = Boolean(options.enforceFullPaymentAtPickup);

  // Default pickup flow allows collateral without forcing immediate full remaining payment.
  // Only enforce this when explicitly requested by caller.
  if (enforceFullPayment && remainingAmount > 0 && paidRemaining < remainingAmount) {
    const error = new Error('Pickup requires full payment of the remaining balance.');
    error.statusCode = 400;
    error.code = 'FULL_PAYMENT_REQUIRED';
    error.details = {
      remainingAmount,
      paidRemaining,
    };
    throw error;
  }

  return {
    valid: true,
    heldDeposit,
    paidRemaining,
  };
};

const applyLatePenalty = (order, lateDays) => {
  const normalizedLateDays = Number(lateDays || 0);
  if (normalizedLateDays < AUTO_PENALTY_LATE_DAYS) {
    return {
      applied: false,
      lateDays: normalizedLateDays,
      lateFee: Number(order?.lateFee || 0),
    };
  }

  const lateFee = roundCurrency(normalizedLateDays * DEFAULT_LATE_FEE_MULTIPLIER);
  order.lateDays = normalizedLateDays;
  order.lateFee = lateFee;
  order.status = 'Late';

  return {
    applied: true,
    lateDays: normalizedLateDays,
    lateFee,
  };
};

const validateReturn = async (order, returnDate = new Date()) => {
  if (!['Renting', 'WaitingReturn', 'Late'].includes(order?.status)) {
    const error = new Error('Return can only be processed for renting orders.');
    error.statusCode = 400;
    error.code = 'INVALID_RETURN_STATUS';
    throw error;
  }

  const lateDays = computeLateDays(order?.rentEndDate, returnDate);
  const latePenalty = applyLatePenalty(order, lateDays);

  if (!latePenalty.applied) {
    order.lateDays = lateDays;
    order.lateFee = roundCurrency(lateDays * DEFAULT_LATE_FEE_MULTIPLIER);
  }

  return {
    valid: true,
    lateDays,
    lateFee: Number(order.lateFee || 0),
    penaltyApplied: latePenalty.applied,
  };
};

const handleNoShow = async (order) => {
  const heldDeposits = await Deposit.find({ orderId: order._id, status: 'Held' });

  order.status = 'NoShow';
  order.noShowAt = new Date();
  order.depositForfeited = true;

  heldDeposits.forEach((deposit) => {
    deposit.status = 'Forfeited';
  });

  await Promise.all([
    order.save(),
    ...heldDeposits.map((deposit) => deposit.save()),
  ]);

  return {
    valid: true,
    forfeitedDepositCount: heldDeposits.length,
  };
};

module.exports = {
  applyLatePenalty,
  computeExpectedDeposit,
  computeLateDays,
  handleNoShow,
  validateDeposit,
  validatePickup,
  validateReturn,
};
