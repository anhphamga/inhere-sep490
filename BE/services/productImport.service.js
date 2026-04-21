const Papa = require('papaparse');
const XLSX = require('xlsx');
const Product = require('../model/Product.model');

const SIZE_COLUMNS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL'];

const normalizeText = (value) => String(value ?? '').trim();

const normalizeHeader = (value) => normalizeText(value).replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '');

const toFiniteNumber = (value) => {
  const text = normalizeText(value).replace(/,/g, '.');
  if (!text) return Number.NaN;
  const num = Number(text);
  return Number.isFinite(num) ? num : Number.NaN;
};

const toNonNegativeInteger = (value) => {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return Number.NaN;
  return num;
};

const parseList = (value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(/[|,;]/).map((item) => item.trim()).filter(Boolean);
};

const getFirst = (row, aliases = []) => {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      return row[alias];
    }
  }
  return '';
};

const normalizeRowKeys = (row = {}) => {
  const result = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const normalized = normalizeHeader(key);
    if (!normalized || Object.prototype.hasOwnProperty.call(result, normalized)) return;
    result[normalized] = value;
  });
  return result;
};

const detectSizeRows = (row = {}) => {
  const sizeRows = [];
  for (const size of SIZE_COLUMNS) {
    const key = size.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const quantity = toNonNegativeInteger(row[key]);
    if (Number.isNaN(quantity)) continue;
    if (quantity > 0) {
      sizeRows.push({ size, quantity });
    }
  }
  return sizeRows;
};

const parseCsvRows = (buffer) => {
  const text = Buffer.from(buffer).toString('utf8').replace(/^\uFEFF/, '');
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => normalizeHeader(header),
  });

  if (parsed.errors?.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error t?i dòng ${first.row || '?'}: ${first.message}`);
  }

  return Array.isArray(parsed.data) ? parsed.data : [];
};

const parseExcelRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false });
  const sheetName = workbook?.SheetNames?.[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
  });

  return Array.isArray(rows) ? rows : [];
};

const parseRowsFromFile = ({ buffer, originalname = '', mimetype = '' }) => {
  const fileName = normalizeText(originalname).toLowerCase();
  const mime = normalizeText(mimetype).toLowerCase();

  const isCsv = fileName.endsWith('.csv') || mime.includes('csv') || mime === 'text/plain';
  if (isCsv) {
    return parseCsvRows(buffer);
  }

  return parseExcelRows(buffer);
};

const buildProductFromRow = (rawRow = {}, rowNumber = 0) => {
  const row = normalizeRowKeys(rawRow);

  const name = normalizeText(getFirst(row, ['name', 'ten', 'productname']));
  const category = normalizeText(getFirst(row, ['category', 'danhmuc']));
  const color = normalizeText(getFirst(row, ['color', 'mau'])) || 'Mac dinh';
  const description = normalizeText(getFirst(row, ['description', 'mota']));

  const basePrice = toFiniteNumber(getFirst(row, ['price', 'gia']));
  const rentPriceRaw = toFiniteNumber(getFirst(row, ['rentalprice', 'rentprice', 'baserentprice', 'giathue']));
  const salePriceRaw = toFiniteNumber(getFirst(row, ['saleprice', 'basesaleprice', 'giaban']));

  const baseRentPrice = Number.isNaN(rentPriceRaw) ? basePrice : rentPriceRaw;
  const baseSalePrice = Number.isNaN(salePriceRaw) ? basePrice : salePriceRaw;

  if (!name) return { error: { row: rowNumber, message: 'Missing name' } };
  if (!category) return { error: { row: rowNumber, message: 'Missing category' } };

  if (Number.isNaN(baseRentPrice) || Number.isNaN(baseSalePrice)) {
    return { error: { row: rowNumber, message: 'Invalid price (price/rentPrice/salePrice)' } };
  }

  if (baseRentPrice < 0 || baseSalePrice < 0) {
    return { error: { row: rowNumber, message: 'Price must be >= 0' } };
  }

  const sizes = detectSizeRows(row);
  const quantityValue = toNonNegativeInteger(getFirst(row, ['quantity', 'soluong']));

  const hasSizes = sizes.length > 0;
  if (!hasSizes && Number.isNaN(quantityValue)) {
    return { error: { row: rowNumber, message: 'Missing quantity or size columns (S,M,L,...)' } };
  }

  const images = parseList(getFirst(row, ['images', 'image', 'hinhanh']));
  const depositRaw = toFiniteNumber(getFirst(row, ['depositamount', 'deposit', 'datcoc']));
  const buyoutRaw = toFiniteNumber(getFirst(row, ['buyoutvalue', 'buyout', 'giamua']));

  return {
    product: {
      name,
      category,
      categoryPath: { parent: '', child: category, ancestors: [] },
      hasSizes,
      sizes,
      quantity: hasSizes ? 0 : quantityValue,
      color,
      description,
      images,
      baseRentPrice,
      baseSalePrice,
      commonRentPrice: baseRentPrice,
      depositAmount: Number.isNaN(depositRaw) ? 0 : Math.max(depositRaw, 0),
      buyoutValue: Number.isNaN(buyoutRaw) ? baseSalePrice : Math.max(buyoutRaw, 0),
      pricingMode: 'common',
      isDraft: false,
    },
  };
};

const mapBulkWriteErrors = (error, validRows = []) => {
  const writeErrors = Array.isArray(error?.writeErrors)
    ? error.writeErrors
    : (Array.isArray(error?.result?.result?.writeErrors) ? error.result.result.writeErrors : []);

  return writeErrors.map((item) => {
    const index = Number(item?.index);
    const rowInfo = validRows[index];
    return {
      row: rowInfo?.row || 'N/A',
      message: item?.errmsg || item?.message || 'Database insert failed',
    };
  });
};

const importProductsFromFileBuffer = async ({ buffer, originalname, mimetype }) => {
  const rows = parseRowsFromFile({ buffer, originalname, mimetype });

  const validRows = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const mapped = buildProductFromRow(row, rowNumber);
    if (mapped?.error) {
      errors.push(mapped.error);
      return;
    }
    validRows.push({ row: rowNumber, product: mapped.product });
  });

  let successCount = 0;

  if (validRows.length > 0) {
    const docs = validRows.map((item) => item.product);
    try {
      const inserted = await Product.insertMany(docs, { ordered: false });
      successCount = Array.isArray(inserted) ? inserted.length : 0;
    } catch (error) {
      const insertedCount = Array.isArray(error?.insertedDocs) ? error.insertedDocs.length : 0;
      successCount = insertedCount;
      errors.push(...mapBulkWriteErrors(error, validRows));
    }
  }

  return {
    successCount,
    failedCount: Math.max(rows.length - successCount, 0),
    errors,
  };
};

const importProductsFromCsvBuffer = async (buffer) => importProductsFromFileBuffer({ buffer, originalname: 'import.csv', mimetype: 'text/csv' });

module.exports = {
  importProductsFromFileBuffer,
  importProductsFromCsvBuffer,
};
