const mongoose = require('mongoose');
const RentOrder = require('../../model/RentOrder.model');
const SaleOrder = require('../../model/SaleOrder.model');

const findByObjectId = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const [rentOrder, saleOrder] = await Promise.all([
    RentOrder.findById(id).lean(),
    SaleOrder.findById(id).lean(),
  ]);

  if (rentOrder) return { type: 'rent', row: rentOrder };
  if (saleOrder) return { type: 'sale', row: saleOrder };
  return null;
};

const myOrder = async ({ orderCode = '' } = {}) => {
  if (!orderCode) {
    return {
      answer: 'Bạn vui lòng cung cấp mã đơn để mình kiểm tra (ví dụ: RENT_0001 hoặc mã ObjectId).',
      confidence: 0.7,
      needsMoreInfo: true,
    };
  }

  const found = await findByObjectId(orderCode);
  if (!found) {
    return {
      answer: `Mình chưa tìm thấy đơn với mã "${orderCode}". Bạn kiểm tra lại mã đơn giúp mình nhé.`,
      confidence: 0.65,
      notFound: true,
    };
  }

  const { type, row } = found;
  const total = Number(row.totalAmount || 0).toLocaleString('vi-VN');

  if (type === 'rent') {
    return {
      answer:
        `Đơn thuê ${row._id}:\n` +
        `- Trạng thái: ${row.status}\n` +
        `- Ngày nhận: ${row.rentStartDate ? new Date(row.rentStartDate).toLocaleDateString('vi-VN') : 'N/A'}\n` +
        `- Ngày trả: ${row.rentEndDate ? new Date(row.rentEndDate).toLocaleDateString('vi-VN') : 'N/A'}\n` +
        `- Tổng tiền: ${total}đ`,
      confidence: 0.9,
      data: row,
    };
  }

  return {
    answer:
      `Đơn mua ${row._id}:\n` +
      `- Trạng thái: ${row.status}\n` +
      `- Phương thức thanh toán: ${row.paymentMethod}\n` +
      `- Tổng tiền: ${total}đ`,
    confidence: 0.9,
    data: row,
  };
};

module.exports = myOrder;

