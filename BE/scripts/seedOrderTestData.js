require('dotenv').config();

const mongoose = require('mongoose');
const SaleOrder = require('../model/SaleOrder.model');
const RentOrder = require('../model/RentOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const User = require('../model/User.model');

const toObjectId = (value) => {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
};

const resolveCustomerId = async () => {
  const fromEnv = toObjectId(process.env.SEED_ORDER_CUSTOMER_ID);
  if (fromEnv) {
    return fromEnv;
  }

  const existingCustomer = await User.findOne({ role: 'customer' }).select('_id').lean();
  if (existingCustomer?._id) {
    return existingCustomer._id;
  }

  return new mongoose.Types.ObjectId();
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const customerId = await resolveCustomerId();
  const now = Date.now();

  const saleOrder1Id = new mongoose.Types.ObjectId();
  const saleOrder2Id = new mongoose.Types.ObjectId();
  const rentOrderId = new mongoose.Types.ObjectId();

  const productId = new mongoose.Types.ObjectId();
  const productInstanceId = new mongoose.Types.ObjectId();

  const saleOrders = [
    {
      _id: saleOrder1Id,
      customerId,
      status: 'PendingPayment',
      paymentMethod: 'COD',
      orderType: 'Buy',
      totalAmount: 1250000,
      shippingAddress: '79 Nguyen Hue, Q1, TP HCM',
      shippingPhone: '0900000001',
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      _id: saleOrder2Id,
      customerId,
      status: 'Shipping',
      paymentMethod: 'Online',
      orderType: 'Buy',
      totalAmount: 980000,
      shippingAddress: '12 Le Loi, Q1, TP HCM',
      shippingPhone: '0900000002',
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const rentOrders = [
    {
      _id: rentOrderId,
      customerId,
      status: 'Renting',
      rentStartDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      rentEndDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
      depositAmount: 700000,
      remainingAmount: 450000,
      totalAmount: 1150000,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const saleItems = [
    {
      _id: new mongoose.Types.ObjectId(),
      orderId: saleOrder1Id,
      productId,
      unitPrice: 1250000,
      quantity: 1,
      size: 'M',
      color: 'Xanh',
      note: 'seed test item',
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  const rentItems = [
    {
      _id: new mongoose.Types.ObjectId(),
      orderId: rentOrderId,
      productInstanceId,
      baseRentPrice: 600000,
      finalPrice: 450000,
      rentStartDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      rentEndDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
      size: 'L',
      color: 'Do',
      note: 'seed test item',
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  await Promise.all([
    SaleOrder.insertMany(saleOrders, { ordered: true }),
    RentOrder.insertMany(rentOrders, { ordered: true }),
    SaleOrderItem.insertMany(saleItems, { ordered: true }),
    RentOrderItem.insertMany(rentItems, { ordered: true }),
  ]);

  const insertedCount = saleOrders.length + rentOrders.length + saleItems.length + rentItems.length;

  console.log('Seed ORDER test data done');
  console.log('customerId:', String(customerId));
  console.log('saleOrder1Id:', String(saleOrder1Id));
  console.log('saleOrder2Id:', String(saleOrder2Id));
  console.log('rentOrderId:', String(rentOrderId));
  console.log('insertedDocuments:', insertedCount);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('seedOrderTestData failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
