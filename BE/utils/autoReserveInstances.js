const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const ProductInstance = require('../model/ProductInstance.model');

// Số giờ trước khi thuê bắt đầu → đổi sang Reserved
// 24h = đủ thời gian staff chuẩn bị đồ trước 1 ngày
const HOURS_BEFORE_RESERVED = Number(process.env.HOURS_BEFORE_RESERVED || 24);

/** Chu kỳ quét (phút). Mặc định 60; dev có thể đặt 1 qua AUTO_RESERVE_INTERVAL_MINUTES */
const parseIntervalMinutes = () => {
    const raw = process.env.AUTO_RESERVE_INTERVAL_MINUTES;
    if (raw === undefined || raw === '') return 60;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 60;
    return Math.min(Math.max(1, Math.floor(n)), 7 * 24 * 60);
};
const INTERVAL_MINUTES = parseIntervalMinutes();
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

const runAutoReserve = async () => {
    const now = new Date();
    const threshold = new Date(now.getTime() + HOURS_BEFORE_RESERVED * 60 * 60 * 1000);

    // Tìm các đơn sắp bắt đầu trong vòng HOURS_BEFORE_RESERVED giờ, chưa pickup
    const orders = await RentOrder.find({
        status: { $in: ['Confirmed', 'WaitingPickup', 'Deposited'] },
        rentStartDate: { $lte: threshold }
    }).lean();

    if (!orders || orders.length === 0) return;

    let reservedCount = 0;
    for (const order of orders) {
        try {
            const items = await RentOrderItem.find({ orderId: order._id }).lean();
            const instanceIds = items.map((i) => i.productInstanceId).filter(Boolean);

            if (instanceIds.length === 0) continue;

            const result = await ProductInstance.updateMany(
                { _id: { $in: instanceIds }, lifecycleStatus: 'Available' },
                { lifecycleStatus: 'Reserved' }
            );
            reservedCount += result.modifiedCount || 0;
        } catch (err) {
            console.error(`[AutoReserve] Failed for order ${order._id}:`, err.message);
        }
    }

    if (reservedCount > 0) {
        console.log(`[AutoReserve] Đã đổi ${reservedCount} instance sang Reserved (ngưỡng: ${HOURS_BEFORE_RESERVED}h trước)`);
    }
};

const startAutoReserveJob = () => {
    // Chạy ngay lần đầu khi server khởi động
    runAutoReserve().catch((err) => console.error('[AutoReserve] Initial run error:', err.message));
    setInterval(
        () => runAutoReserve().catch((err) => console.error('[AutoReserve] Run error:', err.message)),
        INTERVAL_MS
    );
    console.log(
        `[AutoReserve] Job started — ngưỡng ${HOURS_BEFORE_RESERVED}h trước ngày thuê, quét mỗi ${INTERVAL_MINUTES} phút`
    );
};

module.exports = { startAutoReserveJob };
