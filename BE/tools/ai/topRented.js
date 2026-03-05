const Product = require('../../model/Product.model');
const { pickLocalizedValue } = require('../../utils/i18n');

const topRented = async ({ lang = 'vi' } = {}) => {
  const rows = await Product.find({})
    .sort({ rentedCount: -1, likeCount: -1, createdAt: -1 })
    .limit(8)
    .select('_id name likeCount baseRentPrice')
    .lean();

  if (rows.length === 0) {
    return {
      answer: 'Hiện chưa có dữ liệu sản phẩm nổi bật.',
      confidence: 0.65,
      data: [],
    };
  }

  const lines = rows.map((item, index) => {
    const name = pickLocalizedValue(item.name, lang) || 'San pham';
    const likes = Number(item.likeCount || 0);
    const rentPrice = Number(item.baseRentPrice || 0).toLocaleString('vi-VN');
    return `${index + 1}. ${name} | lượt thích: ${likes} | thuê từ ${rentPrice}đ | /products/${item._id}`;
  });

  return {
    answer: `Top sản phẩm nổi bật:\n${lines.join('\n')}`,
    confidence: 0.85,
    data: rows,
  };
};

module.exports = topRented;

