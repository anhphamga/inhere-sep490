require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Product = require('../model/Product.model');
const Blog = require('../model/Blog.model');
const Banner = require('../model/Banner.model');

const DATA_DIR = path.resolve(__dirname, '../../data');

const readJson = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[skip] cannot parse ${filename}: ${error.message}`);
    return null;
  }
};

const toText = (value) => String(value ?? '').trim();
const hasText = (value) => toText(value).length > 0;

const toLocalized = (doc, baseField) => {
  const direct = doc?.[baseField];
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const vi = toText(direct.vi);
    const en = toText(direct.en);
    if (vi || en) {
      return { vi: vi || en, en: en || vi };
    }
  }

  const cap = `${baseField[0].toUpperCase()}${baseField.slice(1)}`;
  const vi = toText(doc?.[`${baseField}Vi`] ?? doc?.[`${baseField}_vi`] ?? doc?.[`vi${cap}`] ?? direct);
  const en = toText(doc?.[`${baseField}En`] ?? doc?.[`${baseField}_en`] ?? doc?.[`en${cap}`]);

  if (vi || en) {
    return { vi: vi || en, en: en || vi };
  }

  return null;
};

const extractId = (doc) => {
  const raw = doc?._id;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && raw.$oid) return String(raw.$oid);
  return '';
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const collectDocs = (primaryFile, seedKey) => {
  const primary = readJson(primaryFile);
  if (Array.isArray(primary)) return primary;

  const seed = readJson('mongo_seed_data_i18n.json') || readJson('mongo_seed_data.json');
  if (seed && Array.isArray(seed[seedKey])) return seed[seedKey];

  return [];
};

const syncCollection = async ({ docs, model, fieldMap, label }) => {
  const ops = [];

  docs.forEach((doc) => {
    const id = extractId(doc);
    if (!id) return;

    const $set = {};
    Object.entries(fieldMap).forEach(([dbField, sourceField]) => {
      const localized = toLocalized(doc, sourceField);
      if (localized && (hasText(localized.vi) || hasText(localized.en))) {
        $set[dbField] = localized;
      }
    });

    if (Object.keys($set).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set },
          upsert: false,
        },
      });
    }
  });

  if (ops.length === 0) {
    console.log(`[${label}] no updates`);
    return;
  }

  const result = await model.bulkWrite(ops, { ordered: false });
  const changed = (result.modifiedCount || 0) + (result.upsertedCount || 0);
  console.log(`[${label}] matched=${result.matchedCount || 0} changed=${changed} ops=${ops.length}`);
};

const promoteExistingStrings = async () => {
  const productRows = await Product.find({
    $or: [
      { name: { $type: 'string' } },
      { category: { $type: 'string' } },
      { description: { $type: 'string' } },
    ],
  }).lean();

  if (productRows.length > 0) {
    const ops = productRows.map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            ...(typeof row.name === 'string' ? { name: { vi: row.name, en: row.name } } : {}),
            ...(typeof row.category === 'string' ? { category: { vi: row.category, en: row.category } } : {}),
            ...(typeof row.description === 'string'
              ? { description: { vi: row.description, en: row.description } }
              : {}),
          },
        },
      },
    }));
    await Product.bulkWrite(ops, { ordered: false });
    console.log(`[products] promoted ${ops.length} records from string -> {vi,en}`);
  }

  const blogRows = await Blog.find({
    $or: [
      { title: { $type: 'string' } },
      { category: { $type: 'string' } },
      { content: { $type: 'string' } },
    ],
  }).lean();
  if (blogRows.length > 0) {
    const ops = blogRows.map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            ...(typeof row.title === 'string' ? { title: { vi: row.title, en: row.title } } : {}),
            ...(typeof row.category === 'string' ? { category: { vi: row.category, en: row.category } } : {}),
            ...(typeof row.content === 'string' ? { content: { vi: row.content, en: row.content } } : {}),
          },
        },
      },
    }));
    await Blog.bulkWrite(ops, { ordered: false });
    console.log(`[blogs] promoted ${ops.length} records from string -> {vi,en}`);
  }

  const bannerRows = await Banner.find({
    $or: [{ title: { $type: 'string' } }, { subtitle: { $type: 'string' } }],
  }).lean();
  if (bannerRows.length > 0) {
    const ops = bannerRows.map((row) => ({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            ...(typeof row.title === 'string' ? { title: { vi: row.title, en: row.title } } : {}),
            ...(typeof row.subtitle === 'string' ? { subtitle: { vi: row.subtitle, en: row.subtitle } } : {}),
          },
        },
      },
    }));
    await Banner.bulkWrite(ops, { ordered: false });
    console.log(`[banners] promoted ${ops.length} records from string -> {vi,en}`);
  }
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const productDocs = collectDocs('products_i18n.json', 'products');
  const blogDocs = collectDocs('blogs_i18n.json', 'blogs');
  const bannerDocs = collectDocs('banners_i18n.json', 'banners');

  await syncCollection({
    docs: productDocs,
    model: Product,
    fieldMap: { name: 'name', category: 'category', description: 'description' },
    label: 'products',
  });

  await syncCollection({
    docs: blogDocs,
    model: Blog,
    fieldMap: { title: 'title', category: 'category', content: 'content' },
    label: 'blogs',
  });

  await syncCollection({
    docs: bannerDocs,
    model: Banner,
    fieldMap: { title: 'title', subtitle: 'subtitle' },
    label: 'banners',
  });

  await promoteExistingStrings();
  await mongoose.disconnect();
  console.log('Done.');
};

run().catch(async (error) => {
  console.error('syncI18nData failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
