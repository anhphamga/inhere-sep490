require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const {
  Alert,
  Blog,
  Category,
  Collateral,
  Deposit,
  FittingBooking,
  InventoryHistory,
  Payment,
  PricingRule,
  Product,
  ProductInstance,
  RentOrder,
  RentOrderItem,
  ReturnRecord,
  SaleOrder,
  SaleOrderItem,
  Shift,
  User,
  Voucher,
} = require('../model');
const Banner = require('../model/Banner.model');

const DATA_DIR = path.resolve(__dirname, '../../data');

const COLLECTIONS = [
  { label: 'users', model: User, aggregateKey: 'users' },
  { label: 'alerts', model: Alert, fileName: 'alerts.json' },
  { label: 'banners', model: Banner, fileName: 'banners.json' },
  { label: 'blogs', model: Blog, fileName: 'blogs.json' },
  { label: 'categories', model: Category, fileName: 'categories.json' },
  { label: 'collaterals', model: Collateral, fileName: 'collaterals.json' },
  { label: 'deposits', model: Deposit, fileName: 'deposits.json' },
  { label: 'fittingbookings', model: FittingBooking, fileName: 'fittingbookings.json' },
  { label: 'inventoryhistories', model: InventoryHistory, fileName: 'inventoryhistories.json' },
  { label: 'payments', model: Payment, fileName: 'payments.json' },
  { label: 'pricingrules', model: PricingRule, fileName: 'pricingrules.json' },
  { label: 'productinstances', model: ProductInstance, fileName: 'productinstances.json' },
  { label: 'products', model: Product, fileName: 'products.json' },
  { label: 'rentorderitems', model: RentOrderItem, fileName: 'rentorderitems.json' },
  { label: 'rentorders', model: RentOrder, fileName: 'rentorders.json' },
  { label: 'returnrecords', model: ReturnRecord, fileName: 'returnrecords.json' },
  { label: 'saleorderitems', model: SaleOrderItem, fileName: 'saleorderitems.json' },
  { label: 'saleorders', model: SaleOrder, fileName: 'saleorders.json' },
  { label: 'shifts', model: Shift, fileName: 'shifts.json' },
  { label: 'vouchers', model: Voucher, fileName: 'vouchers.json' },
];

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const normalizeMongoExport = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeMongoExport);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if ('$oid' in value && typeof value.$oid === 'string') {
    return new mongoose.Types.ObjectId(value.$oid);
  }

  if ('$date' in value) {
    return new Date(value.$date);
  }

  const normalized = {};
  Object.entries(value).forEach(([key, nestedValue]) => {
    normalized[key] = normalizeMongoExport(nestedValue);
  });
  return normalized;
};

const aggregateSeed = readJson(path.join(DATA_DIR, 'mongo_seed_data.json')) || {};

const loadDocs = ({ fileName, aggregateKey }) => {
  if (fileName) {
    const data = readJson(path.join(DATA_DIR, fileName));
    if (Array.isArray(data)) return data;
  }

  if (aggregateKey && Array.isArray(aggregateSeed[aggregateKey])) {
    return aggregateSeed[aggregateKey];
  }

  return [];
};

const upsertDocs = async ({ label, model, docs }) => {
  if (docs.length === 0) {
    console.log(`[${label}] skipped (no docs)`);
    return;
  }

  const operations = docs.map((doc) => {
    const normalized = normalizeMongoExport(doc);
    const id = normalized._id;

    if (!id) {
      throw new Error(`[${label}] document is missing _id`);
    }

    const replacement = { ...normalized };
    delete replacement._id;

    const filter =
      label === 'users' && normalized.email && normalized.authProvider
        ? { email: normalized.email, authProvider: normalized.authProvider }
        : { _id: id };

    return {
      updateOne: {
        filter,
        update: {
          $set: replacement,
          $setOnInsert: { _id: id },
        },
        upsert: true,
      },
    };
  });

  const result = await model.bulkWrite(operations, { ordered: false });
  console.log(
    `[${label}] matched=${result.matchedCount || 0} modified=${result.modifiedCount || 0} upserted=${result.upsertedCount || 0}`
  );
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${process.env.MONGODB_URI}`);

  for (const collection of COLLECTIONS) {
    const docs = loadDocs(collection);
    await upsertDocs({ ...collection, docs });
  }

  await mongoose.disconnect();
  console.log('Import complete.');
};

run().catch(async (error) => {
  console.error(`importData failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
