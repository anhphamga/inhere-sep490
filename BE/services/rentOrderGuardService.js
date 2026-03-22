const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LATE_FEE_MULTIPLIER = Number(process.env.LATE_FEE_MULTIPLIER || 1);
const AUTO_PENALTY_LATE_DAYS = Number(process.env.AUTO_PENALTY_LATE_DAYS || 3);

const roundCurrency = (value) => Math.round(Number(value || 0) * 100) / 100;

const computeExpectedDeposit = (order) => roundCurrency(Number(order?.totalAmount || 0) * 0.5);

const computeLateDays = (rentEndDate, returnDate = new Date()) => {
  const expectedDate = new Date(rentEndDate);
  const actualDate = new Date(returnDate);

  if (Number.isNaN(expectedDate.getTime()) || Number.isNaN(actualDate.getTime())) {
    return 0;
  }

  const normalizedExpected = expectedDate.setHours(0, 0, 0, 0);
  const normalizedActual = actualDate.setHours(0, 0, 0, 0);
  const diff = normalizedActual - normalizedExpected;

  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_IN_MS);
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
    orderType: 'Rent',
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

  validateDeposit(order, heldDeposit.amount);

  const paidRemaining = await sumPayments(order._id, 'Remaining');
  const remainingAmount = Number(order.remainingAmount || 0);
  const willCollectRemaining = Boolean(options.collectRemaining);

  if (remainingAmount > 0 && !willCollectRemaining && paidRemaining < remainingAmount) {
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
  if (!['Renting', 'WaitingReturn'].includes(order?.status)) {
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
