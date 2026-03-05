const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');

const readJson = (name) => {
  const filePath = path.join(DATA_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJson = (name, data) => {
  const filePath = path.join(DATA_DIR, name);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const toText = (value) => String(value ?? '').trim();

const toLocalized = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const vi = toText(value.vi);
    const en = toText(value.en);
    if (vi || en) return { vi: vi || en, en: en || vi };
  }

  const text = toText(value);
  if (!text) return value;
  return { vi: text, en: text };
};

const mapProducts = (rows) => rows.map((row) => ({
  ...row,
  name: toLocalized(row.name),
  category: toLocalized(row.category),
  description: toLocalized(row.description),
}));

const mapBlogs = (rows) => rows.map((row) => ({
  ...row,
  title: toLocalized(row.title),
  category: toLocalized(row.category),
  content: toLocalized(row.content),
}));

const mapBanners = (rows) => rows.map((row) => ({
  ...row,
  title: toLocalized(row.title),
  subtitle: toLocalized(row.subtitle),
}));

const run = () => {
  const products = readJson('products.json') || [];
  const blogs = readJson('blogs.json') || [];
  const banners = readJson('banners.json') || [];
  const seed = readJson('mongo_seed_data.json') || {};

  const productsI18n = mapProducts(products);
  const blogsI18n = mapBlogs(blogs);
  const bannersI18n = mapBanners(banners);

  writeJson('products_i18n.json', productsI18n);
  writeJson('blogs_i18n.json', blogsI18n);
  writeJson('banners_i18n.json', bannersI18n);

  const seedI18n = {
    ...seed,
    products: Array.isArray(seed.products) ? mapProducts(seed.products) : seed.products,
    blogs: Array.isArray(seed.blogs) ? mapBlogs(seed.blogs) : seed.blogs,
    banners: Array.isArray(seed.banners) ? mapBanners(seed.banners) : seed.banners,
  };

  writeJson('mongo_seed_data_i18n.json', seedI18n);

  console.log('Prepared data files:');
  console.log('- products_i18n.json');
  console.log('- blogs_i18n.json');
  console.log('- banners_i18n.json');
  console.log('- mongo_seed_data_i18n.json');
};

run();
