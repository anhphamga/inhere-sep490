const fs = require('fs');
const path = 'd:/Đồ Án/inhere-sep490/BE/controllers/rent-order.controller.js';
let src = fs.readFileSync(path, 'utf8');
const start = 'exports.confirmReturn = async (req, res) => {';
const endMarker = 'exports.finalizeRentOrder = async (req, res) => {';
const idx = src.indexOf(start);
const idx2 = src.indexOf(endMarker);
if (idx === -1 || idx2 === -1) {
  console.error('Could not find markers');
  process.exit(1);
}
const before = src.slice(0, idx);
const after = src.slice(idx2);
const newBody = `exports.confirmReturn = async (req, res) => {
    // Transaction support (if Mongo supports replica set)
    const session = await mongoose.startSession();
    let useTransaction = false;

    try {
        session.startTransaction();
        useTransaction = true;
    } catch {
        // Fallback for standalone MongoDB
    }

    try {
        const { id } = req.params;
        const { returnedItems = [] } = req.body;

        if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui long cung cap danh sach san pham tra' });
        }

        const order = await RentOrder.findById(id).session(useTransaction ? session : null);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Khong tim thay don thue' });
        }

        if (!isOwnerOrStaff(req, order)) {
            return res.status(403).json({ success: false, message: 'Forbidden - Bạn không có quyền thực hiện thao tác này' });
        }

        if (!['Renting', 'WaitingReturn'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Chi co the tra do khi don dang thue/cho tra. Trang thai: "${order.status}"`
            });
        }

        const lateDays = computeLateDays(order.rentEndDate, new Date());
        const lateFee = lateDays * LATE_FEE_MULTIPLIER;
        const totalDamageFee = returnedItems.reduce((sum, item) => sum + Number(item.damageFee || 0), 0);

        const returnRecord = (await ReturnRecord.create(
            [
                {
                    orderId: id,
                    returnDate: new Date(),
                    condition: 'Mixed',
                    washingFee: 0,
                    damageFee: totalDamageFee,
                    lateDays,
                    lateFee,
                    compensationFee: 0,
                    resolution: 'DepositDeducted',
                    resolvedAt: new Date(),
                    note: 'Return items processed',
                    staffId: req.user?.id
                }
            ],
            useTransaction ? { session } : {}
        ))[0];

        const instanceIds = returnedItems.map((item) => item.productInstanceId).filter(Boolean);

        for (const item of returnedItems) {
            const instanceId = item.productInstanceId;
            if (!instanceId) continue;

            const targetLifecycle = item.condition === 'Damaged' ? 'Repair' : 'Washing';
            await ProductInstance.updateOne(
                { _id: instanceId },
                { lifecycleStatus: targetLifecycle },
                useTransaction ? { session } : {}
            );

            await InventoryHistory.findOneAndUpdate(
                { productInstanceId: instanceId, status: 'Rented', endDate: null },
                { endDate: new Date() },
                useTransaction ? { session } : {}
            );
        }

        const orderItems = await RentOrderItem.find({ orderId: id }).session(useTransaction ? session : null).lean();
        const allInstanceIds = orderItems.map((item) => item.productInstanceId).filter(Boolean);
        const totalItems = allInstanceIds.length;

        const returnedCount = await InventoryHistory.countDocuments({
            productInstanceId: { $in: allInstanceIds },
            status: 'Rented',
            endDate: { $ne: null }
        }).session(useTransaction ? session : null);

        order.lateDays = lateDays;
        order.lateFee = lateFee;
        order.damageFee = totalDamageFee;
        order.returnedAt = new Date();
        order.status = returnedCount >= totalItems ? 'Returned' : 'WaitingReturn';

        await order.save(useTransaction ? { session } : {});

        if (useTransaction) {
            await session.commitTransaction();
        }

        session.endSession();

        return res.json({
            success: true,
            message: 'Xac nhan tra do thanh cong',
            data: {
                order: await fetchOrderDetail(id),
                returnRecord
            }
        });
    } catch (error) {
        if (useTransaction) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error('Confirm return error:', error);
        return res.status(500).json({ success: false, message: 'Loi server', error: error.message });
    }
};
`;

fs.writeFileSync(path, before + newBody + after, 'utf8');
console.log('Updated confirmReturn');
