const RentOrder = require('../model/RentOrder.model');

const loadRentOrderAccessContext = async (req, res, next) => {
  try {
    const orderId = req.params.id || req.params.orderId;
    if (!orderId) {
      return next();
    }

    const order = await RentOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Khong tim thay don thue'
      });
    }

    req.order = order;
    req.accessContext = {};

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  loadRentOrderAccessContext,
};
