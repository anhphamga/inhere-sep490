const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');
const Deposit = require('../model/Deposit.model');
const Payment = require('../model/Payment.model');

// Tạo đơn thuê mới (Draft)
exports.createRentOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      rentStartDate,
      rentEndDate,
      items,
      depositAmount,
      remainingAmount,
      totalAmount
    } = req.body;

    // Validate required fields
    if (!rentStartDate || !rentEndDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin thuê'
      });
    }

    // Kiểm tra các sản phẩm có available không
    for (const item of items) {
      let instance;
      
      if (item.productInstanceId) {
        // Nếu có productInstanceId, tìm theo ID
        instance = await ProductInstance.findById(item.productInstanceId);
      } else if (item.productId) {
        // Nếu không có productInstanceId, tự động chọn instance available đầu tiên
        instance = await ProductInstance.findOne({
          productId: item.productId,
          lifecycleStatus: 'Available'
        }).sort({ conditionScore: -1 });
      }
      
      if (!instance) {
        return res.status(400).json({
          success: false,
          message: item.productInstanceId 
            ? `Không tìm thấy sản phẩm với ID: ${item.productInstanceId}`
            : `Không có sản phẩm nào available cho sản phẩm: ${item.productId}`
        });
      }
      if (instance.lifecycleStatus !== 'Available') {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${instance._id}" không có sẵn để thuê`
        });
      }
    }

    // Tạo đơn thuê
    const rentOrder = new RentOrder({
      customerId: userId || req.body.customerId,
      staffId: null,
      status: 'Draft',
      rentStartDate,
      rentEndDate,
      depositAmount: depositAmount || 0,
      remainingAmount: remainingAmount || 0,
      washingFee: 0,
      damageFee: 0,
      totalAmount: totalAmount || 0
    });

    await rentOrder.save();

    // Tạo các RentOrderItem - lưu instance đã được xác nhận available
    const orderItems = [];
    for (const item of items) {
      let instance;
      
      if (item.productInstanceId) {
        instance = await ProductInstance.findById(item.productInstanceId);
      } else if (item.productId) {
        instance = await ProductInstance.findOne({
          productId: item.productId,
          lifecycleStatus: 'Available'
        }).sort({ conditionScore: -1 });
      }
      
      orderItems.push({
        orderId: rentOrder._id,
        productInstanceId: instance._id,
        baseRentPrice: item.baseRentPrice || instance.currentRentPrice,
        finalPrice: item.finalPrice || instance.currentRentPrice,
        // Lưu ngày thuê của sản phẩm này
        rentStartDate: item.rentStartDate,
        rentEndDate: item.rentEndDate,
        condition: instance.conditionLevel,
        appliedRuleIds: item.appliedRuleIds || [],
        selectLevel: item.selectLevel,
        size: item.size,
        color: item.color,
        note: item.note || ''
      });
    }

    await RentOrderItem.insertMany(orderItems);

    // Cập nhật status sang PendingDeposit
    rentOrder.status = 'PendingDeposit';
    await rentOrder.save();

    // Populate để trả về (xử lý null productInstanceId)
    let populatedOrder = null;
    try {
      populatedOrder = await RentOrder.findById(rentOrder._id)
        .populate('customerId', 'name phone email')
        .populate({
          path: 'items',
          populate: { path: 'productInstanceId', populate: 'productId' }
        })
        .lean();
    } catch (populateErr) {
      console.error('Populate error:', populateErr);
      populatedOrder = await RentOrder.findById(rentOrder._id)
        .populate('customerId', 'name phone email')
        .lean();
    }

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    console.error('Create rent order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo đơn thuê',
      error: error.message
    });
  }
};

// Lấy danh sách đơn thuê của customer
exports.getMyRentOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customerId: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      RentOrder.find(query)
        .populate('customerId', 'name phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RentOrder.countDocuments(query)
    ]);

    // Lấy items cho mỗi order (xử lý null productInstanceId)
    const orderIds = orders.map(o => o._id);
    let items = [];
    try {
      items = await RentOrderItem.find({ orderId: { $in: orderIds } })
        .populate({
          path: 'productInstanceId',
          populate: { path: 'productId' }
        })
        .lean();
    } catch (populateErr) {
      console.error('Populate items error:', populateErr);
      items = await RentOrderItem.find({ orderId: { $in: orderIds } }).lean();
    }

    const itemsMap = items.reduce((acc, item) => {
      if (!acc[item.orderId]) acc[item.orderId] = [];
      acc[item.orderId].push(item);
      return acc;
    }, {});

    const ordersWithItems = orders.map(order => ({
      ...order.toObject(),
      items: itemsMap[order._id] || []
    }));

    res.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my rent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đơn thuê',
      error: error.message
    });
  }
};

// Lấy chi tiết đơn thuê
exports.getRentOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const order = await RentOrder.findById(id)
      .populate('customerId', 'name phone email')
      .populate('staffId', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê'
      });
    }

    // Kiểm tra quyền xem (customer chỉ xem được đơn của mình)
    if (order.customerId._id.toString() !== userId && userRole !== 'owner' && userRole !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn thuê này'
      });
    }

    // Lấy items (xử lý null productInstanceId)
    let items = [];
    try {
      items = await RentOrderItem.find({ orderId: id })
        .populate({
          path: 'productInstanceId',
          populate: { path: 'productId' }
        })
        .lean();
    } catch (populateErr) {
      console.error('Populate items error:', populateErr);
      items = await RentOrderItem.find({ orderId: id }).lean();
    }

    // Lấy deposits
    const deposits = await Deposit.find({ orderId: id });

    // Lấy payments
    const payments = await Payment.find({ orderId: id, orderType: 'Rent' });

    res.json({
      success: true,
      data: {
        ...order.toObject(),
        items,
        deposits,
        payments
      }
    });
  } catch (error) {
    console.error('Get rent order by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết đơn thuê',
      error: error.message
    });
  }
};

// Thanh toán đặt cọc
exports.payDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'Cash' } = req.body;
    const userId = req.user?.id;

    const order = await RentOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê'
      });
    }

    // Kiểm tra quyền
    if (order.customerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thanh toán đơn thuê này'
      });
    }

    // Kiểm tra trạng thái đơn
    if (order.status !== 'PendingDeposit') {
      return res.status(400).json({
        success: false,
        message: `Không thể thanh toán đặt cọc với trạng thái "${order.status}". Trạng thái phải là "Chờ đặt cọc"`
      });
    }

    // Kiểm tra đơn đã có deposit chưa
    const existingDeposit = await Deposit.findOne({ orderId: id, status: 'Held' });
    if (existingDeposit) {
      return res.status(400).json({
        success: false,
        message: 'Đơn thuê này đã có đặt cọc'
      });
    }

    // Tạo deposit
    const deposit = new Deposit({
      orderId: id,
      amount: order.depositAmount,
      method,
      status: 'Held',
      paidAt: new Date()
    });

    await deposit.save();

    // Tạo payment record
    const payment = new Payment({
      orderType: 'Rent',
      orderId: id,
      amount: order.depositAmount,
      method,
      status: 'Paid',
      transactionCode: `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paidAt: new Date()
    });

    await payment.save();

    // Cập nhật trạng thái đơn
    order.status = 'Deposited';
    await order.save();

    // === BƯỚC 2: Chuyển ProductInstance: Available → Reserved ===
    const items = await RentOrderItem.find({ orderId: id });
    const instanceIds = items
      .filter(i => i.productInstanceId)
      .map(i => i.productInstanceId);
    
    if (instanceIds.length > 0) {
      await ProductInstance.updateMany(
        { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
        { lifecycleStatus: 'Reserved' }
      );
    }

    // Populate để trả về (xử lý null productInstanceId)
    let populatedOrder = null;
    try {
      populatedOrder = await RentOrder.findById(id)
        .populate('customerId', 'name phone email')
        .populate({
          path: 'items',
          populate: [
            { path: 'productInstanceId', match: { _id: { $ne: null } }, populate: 'productId' }
          ]
        })
        .lean();
    } catch (populateErr) {
      console.error('Populate error:', populateErr);
      // Nếu populate lỗi, lấy order không populate
      populatedOrder = await RentOrder.findById(id)
        .populate('customerId', 'name phone email')
        .lean();
    }

    if (!populatedOrder) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tải thông tin đơn thuê'
      });
    }

    res.json({
      success: true,
      message: 'Thanh toán đặt cọc thành công',
      data: {
        order: populatedOrder,
        deposit,
        payment
      }
    });
  } catch (error) {
    console.error('Pay deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi thanh toán đặt cọc',
      error: error.message
    });
  }
};

// Hủy đơn thuê
exports.cancelRentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await RentOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê'
      });
    }

    // Kiểm tra quyền
    if (order.customerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn thuê này'
      });
    }

    // Chỉ được hủy khi chưa thanh toán hoặc đã thanh toán đặt cọc
    if (!['Draft', 'PendingDeposit', 'Deposited'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn thuê với trạng thái "${order.status}"`
      });
    }

    // Cập nhật trạng thái
    order.status = 'Cancelled';
    await order.save();

    // Hoàn các sản phẩm về available
    const items = await RentOrderItem.find({ orderId: id });
    const instanceIds = items.map(i => i.productInstanceId);
    await ProductInstance.updateMany(
      { _id: { $in: instanceIds } },
      { lifecycleStatus: 'Available' }
    );

    // Nếu đã đặt cọc, tạo refund deposit
    if (order.status === 'Deposited') {
      await Deposit.updateMany(
        { orderId: id, status: 'Held' },
        { status: 'Refunded' }
      );
    }

    res.json({
      success: true,
      message: 'Hủy đơn thuê thành công',
      data: order
    });
  } catch (error) {
    console.error('Cancel rent order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi hủy đơn thuê',
      error: error.message
    });
  }
};

// Lấy danh sách đơn thuê (cho Owner/Staff)
exports.getAllRentOrders = async (req, res) => {
  try {
    console.log('>>> getAllRentOrders called');
    const orders = await RentOrder.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    console.log('>>> Found orders:', orders.length);
    
    res.json({
      success: true,
      data: orders,
      pagination: { page: 1, limit: 50, total: orders.length, pages: 1 }
    });
  } catch (error) {
    console.error('>>> getAllRentOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Xác nhận đơn thuê (cho Staff)
exports.confirmRentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.user;

    const order = await RentOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê'
      });
    }

    if (order.status !== 'Deposited') {
      return res.status(400).json({
        success: false,
        message: `Chỉ có thể xác nhận đơn đã đặt cọc. Trạng thái hiện tại: "${order.status}"`
      });
    }

    // === BƯỚC 3: Staff xác nhận đơn - Deposited → Confirmed ===
    order.staffId = staffId;
    order.status = 'Confirmed';
    await order.save();

    // ProductInstance vẫn giữ Reserved (chờ khách lấy)

    res.json({
      success: true,
      message: 'Xác nhận đơn thuê thành công. Đơn đang chờ khách đến lấy đồ.',
      data: order
    });
  } catch (error) {
    console.error('Confirm rent order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xác nhận đơn thuê',
      error: error.message
    });
  }
};

// Xác nhận khách đã lấy đồ (Staff)
exports.confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await RentOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
    }

    // === BƯỚC 4-5: Xác nhận khách lấy đồ ===
    // Confirmed → WaitingPickup → Renting
    // Reserved → Rented
    if (order.status === 'Confirmed') {
      order.status = 'WaitingPickup';
    } else if (order.status === 'WaitingPickup') {
      order.status = 'Renting';
      
      // Chuyển ProductInstance: Reserved → Rented
      const items = await RentOrderItem.find({ orderId: id });
      const instanceIds = items
        .filter(i => i.productInstanceId)
        .map(i => i.productInstanceId);
      
      if (instanceIds.length > 0) {
        await ProductInstance.updateMany(
          { _id: { $in: instanceIds }, lifecycleStatus: 'Reserved' },
          { lifecycleStatus: 'Rented' }
        );
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể xác nhận lấy đồ với trạng thái "${order.status}". Đơn phải đã được xác nhận hoặc đang chờ lấy đồ.` 
      });
    }

    await order.save();

    res.json({ 
      success: true, 
      message: order.status === 'WaitingPickup' 
        ? 'Đơn chuyển sang trạng thái chờ khách lấy đồ' 
        : 'Xác nhận khách đã lấy đồ thành công', 
      data: order 
    });
  } catch (error) {
    console.error('Confirm pickup error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// Xác nhận trả đồ (Staff)
exports.confirmReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { washingFee = 0, damageFee = 0 } = req.body;

    const order = await RentOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
    }

    if (order.status !== 'Renting') {
      return res.status(400).json({ success: false, message: `Chỉ có thể xác nhận trả đồ với đơn đang thuê. Trạng thái: "${order.status}"` });
    }

    // === BƯỚC 6: Customer trả đồ ===
    // Renting → Completed
    // Rented → Washing (chờ giặt)
    order.washingFee = washingFee;
    order.damageFee = damageFee;
    order.status = 'Completed';
    await order.save();

    // Chuyển ProductInstance: Rented → Washing
    const items = await RentOrderItem.find({ orderId: id });
    const instanceIds = items
      .filter(i => i.productInstanceId)
      .map(i => i.productInstanceId);
    
    if (instanceIds.length > 0) {
      await ProductInstance.updateMany(
        { _id: { $in: instanceIds }, lifecycleStatus: 'Rented' },
        { lifecycleStatus: 'Washing' }
      );
    }

    res.json({ 
      success: true, 
      message: 'Xác nhận trả đồ thành công. Sản phẩm đang chờ giặt.', 
      data: { order, washingFee, damageFee } 
    });
  } catch (error) {
    console.error('Confirm return error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

// === BƯỚC 7: Sau khi giặt xong - Washing → Available ===
exports.completeWashing = async (req, res) => {
  try {
    const { id } = req.params; // id của order hoặc instance
    const { instanceIds } = req.body; // danh sách instance cần complete (nếu không có thì lấy từ order)

    let instancesToUpdate = instanceIds;

    // Nếu không có instanceIds, lấy từ order
    if (!instancesToUpdate || instancesToUpdate.length === 0) {
      const items = await RentOrderItem.find({ orderId: id });
      instancesToUpdate = items
        .filter(i => i.productInstanceId)
        .map(i => i.productInstanceId);
    }

    if (instancesToUpdate && instancesToUpdate.length > 0) {
      await ProductInstance.updateMany(
        { _id: { $in: instancesToUpdate }, lifecycleStatus: 'Washing' },
        { lifecycleStatus: 'Available' }
      );
    }

    res.json({ 
      success: true, 
      message: 'Hoàn tất giặt. Sản phẩm đã có sẵn cho thuê tiếp theo.' 
    });
  } catch (error) {
    console.error('Complete washing error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
  }
};
