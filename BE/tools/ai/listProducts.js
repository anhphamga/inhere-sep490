const Product = require('../../model/Product.model');
const { pickLocalizedValue } = require('../../utils/i18n');

const listProducts = async ({ lang = 'vi' } = {}) => {
  const rows = await Product.find({})
    .sort({ createdAt: -1 })
    .limit(8)
    .select('_id name baseSalePrice baseRentPrice')
    .lean();

  if (rows.length === 0) {
    return {
      answer: 'Hiện chưa có sản phẩm để gợi ý.',
      confidence: 0.7,
      data: [],
    };
  }

  const lines = rows.map((item) => {
    const name = pickLocalizedValue(item.name, lang) || 'San pham';
    const rentPrice = Number(item.baseRentPrice || 0).toLocaleString('vi-VN');
    const salePrice = Number(item.baseSalePrice || 0).toLocaleString('vi-VN');
    return `- ${name}: thuê ${rentPrice}đ | mua ${salePrice}đ | /products/${item._id}`;
  });

  return {
    answer: `Shop đang có các sản phẩm:\n${lines.join('\n')}`,
    confidence: 0.9,
    data: rows,
  };
};

module.exports = listProducts;

