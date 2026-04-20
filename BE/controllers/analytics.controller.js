/**
 * ANALYTICS CONTROLLER - Báo cáo & phân tích
 */

const Product = require('../model/Product.model');
const ProductInstance = require('../model/ProductInstance.model');
const RentOrder = require('../model/RentOrder.model');
const RentOrderItem = require('../model/RentOrderItem.model');
const SaleOrder = require('../model/SaleOrder.model');
const SaleOrderItem = require('../model/SaleOrderItem.model');
const User = require('../model/User.model');
const {
    SALE_REVENUE_STATUSES,
    buildSaleRevenueMatch,
    buildRentRevenueMatch,
} = require('../utils/revenueFilters');

const PERIOD_FORMATS = {
    day: '%Y-%m-%d',
    month: '%Y-%m',
    year: '%Y'
};

const parseDateRange = (req, res) => {
    const { from, to } = req.query;
    if (!from && !to) {
        return { match: null };
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
        res.status(400).json({
            success: false,
            message: 'from or to is invalid'
        });
        return null;
    }

    const match = {};
    if (fromDate) {
        match.$gte = fromDate;
    }
    if (toDate) {
        match.$lte = toDate;
    }

    return { match };
};

const getRevenueAnalytics = async (req, res) => {
    try {
        const period = req.query.period || 'day';
        if (!PERIOD_FORMATS[period]) {
            return res.status(400).json({
                success: false,
                message: 'period must be day, month, or year'
            });
        }

        const range = parseDateRange(req, res);
        if (range === null) {
            return;
        }

        const dateMatch = range.match ? { createdAt: range.match } : {};
        const dateFormat = PERIOD_FORMATS[period];

        const rentRevenueMatch = buildRentRevenueMatch(dateMatch);
        const saleRevenueMatch = buildSaleRevenueMatch(dateMatch);

        const [rentRows, saleRows] = await Promise.all([
            RentOrder.aggregate([
                { $match: rentRevenueMatch },
                {
                    $group: {
                        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            SaleOrder.aggregate([
                { $match: saleRevenueMatch },
                {
                    $group: {
                        _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        const revenueMap = new Map();
        rentRows.forEach((row) => {
            revenueMap.set(row._id, {
                period: row._id,
                rentRevenue: row.revenue,
                saleRevenue: 0,
                rentOrders: row.count,
                saleOrders: 0
            });
        });

        saleRows.forEach((row) => {
            if (!revenueMap.has(row._id)) {
                revenueMap.set(row._id, {
                    period: row._id,
                    rentRevenue: 0,
                    saleRevenue: row.revenue,
                    rentOrders: 0,
                    saleOrders: row.count
                });
            } else {
                const item = revenueMap.get(row._id);
                item.saleRevenue = row.revenue;
                item.saleOrders = row.count;
            }
        });

        const data = Array.from(revenueMap.values()).sort((a, b) => (a.period > b.period ? 1 : -1));

        return res.status(200).json({
            success: true,
            message: 'Get revenue analytics successfully',
            data
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting revenue analytics',
            error: error.message
        });
    }
};

const getRentalStats = async (req, res) => {
    try {
        const groupBy = req.query.groupBy || 'category';
        if (!['category', 'size'].includes(groupBy)) {
            return res.status(400).json({
                success: false,
                message: 'groupBy must be category or size'
            });
        }

        const range = parseDateRange(req, res);
        if (range === null) {
            return;
        }

        const dateMatch = range.match ? { createdAt: range.match } : {};

        if (groupBy === 'size') {
            const rows = await RentOrderItem.aggregate([
                { $match: dateMatch },
                {
                    $group: {
                        _id: '$size',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            return res.status(200).json({
                success: true,
                message: 'Get rental stats successfully',
                data: rows.map((row) => ({ key: row._id || 'Unknown', count: row.count }))
            });
        }

        const rows = await RentOrderItem.aggregate([
            { $match: dateMatch },
            {
                $lookup: {
                    from: 'productinstances',
                    localField: 'productInstanceId',
                    foreignField: '_id',
                    as: 'instance'
                }
            },
            { $unwind: '$instance' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'instance.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.category',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Get rental stats successfully',
            data: rows.map((row) => ({ key: row._id || 'Unknown', count: row.count }))
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting rental stats',
            error: error.message
        });
    }
};

const getInventoryStats = async (req, res) => {
    try {
        const lifecycleRows = await ProductInstance.aggregate([
            {
                $group: {
                    _id: '$lifecycleStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const conditionRows = await ProductInstance.aggregate([
            {
                $group: {
                    _id: '$conditionLevel',
                    count: { $sum: 1 }
                }
            }
        ]);

        const lifecycle = lifecycleRows.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
        }, {});

        const condition = conditionRows.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            message: 'Get inventory stats successfully',
            data: {
                lifecycle,
                condition,
                total: lifecycleRows.reduce((sum, row) => sum + row.count, 0)
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting inventory stats',
            error: error.message
        });
    }
};

const getCustomerStats = async (req, res) => {
    try {
        const [total, active, locked] = await Promise.all([
            User.countDocuments({ role: 'customer' }),
            User.countDocuments({ role: 'customer', status: 'active' }),
            User.countDocuments({ role: 'customer', status: 'locked' })
        ]);

        const period = req.query.period;
        if (!period) {
            return res.status(200).json({
                success: true,
                message: 'Get customer stats successfully',
                data: {
                    total,
                    active,
                    locked
                }
            });
        }

        if (!PERIOD_FORMATS[period]) {
            return res.status(400).json({
                success: false,
                message: 'period must be day, month, or year'
            });
        }

        const range = parseDateRange(req, res);
        if (range === null) {
            return;
        }

        const dateMatch = range.match ? { createdAt: range.match } : {};
        const dateFormat = PERIOD_FORMATS[period];

        const rows = await User.aggregate([
            {
                $match: {
                    role: 'customer',
                    ...dateMatch
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Get customer stats successfully',
            data: {
                total,
                active,
                locked,
                timeline: rows.map((row) => ({ period: row._id, count: row.count }))
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting customer stats',
            error: error.message
        });
    }
};

const getTopProducts = async (req, res) => {
    try {
        const type = req.query.type || 'rent';
        const limit = Number(req.query.limit || 10);

        if (!['rent', 'sale'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'type must be rent or sale'
            });
        }

        if (type === 'sale') {
            const rows = await SaleOrderItem.aggregate([
                {
                    $lookup: {
                        from: 'saleorders',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'order'
                    }
                },
                { $unwind: '$order' },
                {
                    $match: {
                        'order.status': { $in: SALE_REVENUE_STATUSES }
                    }
                },
                {
                    $group: {
                        _id: '$productId',
                        quantity: { $sum: '$quantity' },
                        revenue: { $sum: { $multiply: ['$unitPrice', '$quantity'] } }
                    }
                },
                { $sort: { quantity: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' }
            ]);

            return res.status(200).json({
                success: true,
                message: 'Get top products successfully',
                data: rows.map((row) => ({
                    productId: row._id,
                    name: row.product.name,
                    category: row.product.category,
                    size: row.product.size,
                    color: row.product.color,
                    quantity: row.quantity,
                    revenue: row.revenue
                }))
            });
        }

        const rows = await RentOrderItem.aggregate([
            {
                $lookup: {
                    from: 'productinstances',
                    localField: 'productInstanceId',
                    foreignField: '_id',
                    as: 'instance'
                }
            },
            { $unwind: '$instance' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'instance.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product._id',
                    rentCount: { $sum: 1 }
                }
            },
            { $sort: { rentCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' }
        ]);

        return res.status(200).json({
            success: true,
            message: 'Get top products successfully',
            data: rows.map((row) => ({
                productId: row._id,
                name: row.product.name,
                category: row.product.category,
                size: row.product.size,
                color: row.product.color,
                rentCount: row.rentCount
            }))
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting top products',
            error: error.message
        });
    }
};

const buildDashboardDateRange = (req, res) => {
    const toParam = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(toParam.getTime())) {
        res.status(400).json({
            success: false,
            message: 'to is invalid'
        });
        return null;
    }

    const end = new Date(toParam);
    end.setHours(23, 59, 59, 999);

    const fromParam = req.query.from ? new Date(req.query.from) : null;
    if (fromParam && Number.isNaN(fromParam.getTime())) {
        res.status(400).json({
            success: false,
            message: 'from is invalid'
        });
        return null;
    }

    const start = fromParam ? new Date(fromParam) : new Date(end);
    if (!fromParam) {
        start.setDate(end.getDate() - 6);
    }
    start.setHours(0, 0, 0, 0);

    if (start > end) {
        res.status(400).json({
            success: false,
            message: 'from must be less than or equal to to'
        });
        return null;
    }

    return { start, end };
};

const getProductDisplayName = (name) => {
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object') {
        return String(name.vi || name.en || '').trim();
    }
    return '';
};

const getOwnerTopProducts = async (req, res) => {
    try {
        const limit = 5;

        const [topSaleRows, topRentRows] = await Promise.all([
            SaleOrderItem.aggregate([
                {
                    $lookup: {
                        from: 'saleorders',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'order'
                    }
                },
                { $unwind: '$order' },
                {
                    $match: {
                        'order.status': { $in: SALE_REVENUE_STATUSES }
                    }
                },
                {
                    $group: {
                        _id: '$productId',
                        totalSold: { $sum: '$quantity' }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        productId: '$_id',
                        name: { $ifNull: ['$product.name', 'Sản phẩm không xác định'] },
                        totalSold: 1
                    }
                }
            ]),
            RentOrderItem.aggregate([
                {
                    $lookup: {
                        from: 'productinstances',
                        localField: 'productInstanceId',
                        foreignField: '_id',
                        as: 'instance'
                    }
                },
                { $unwind: '$instance' },
                {
                    $group: {
                        _id: '$instance.productId',
                        totalRented: { $sum: 1 }
                    }
                },
                { $sort: { totalRented: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        productId: '$_id',
                        name: { $ifNull: ['$product.name', 'Sản phẩm không xác định'] },
                        totalRented: 1
                    }
                }
            ])
        ]);

        return res.status(200).json({
            success: true,
            message: 'Get owner top products successfully',
            data: {
                topSaleProducts: topSaleRows,
                topRentProducts: topRentRows
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting owner top products',
            error: error.message
        });
    }
};

const getInventoryAlerts = async (req, res) => {
    try {
        const rows = await Product.aggregate([
            {
                $lookup: {
                    from: 'productinstances',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$productId', '$$productId'] },
                                lifecycleStatus: { $nin: ['Sold', 'Lost'] }
                            }
                        },
                        { $count: 'quantity' }
                    ],
                    as: 'inventory'
                }
            },
            {
                $addFields: {
                    quantity: { $ifNull: [{ $arrayElemAt: ['$inventory.quantity', 0] }, 0] }
                }
            },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    name: 1,
                    quantity: 1
                }
            }
        ]);

        const normalized = rows.map((row) => ({
            productId: row.productId,
            name: getProductDisplayName(row.name) || 'Sản phẩm không xác định',
            quantity: Number(row.quantity || 0)
        }));

        const lowStock = normalized
            .filter((item) => item.quantity > 0 && item.quantity <= 3)
            .sort((a, b) => a.quantity - b.quantity)
            .map((item) => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity
            }));

        const outOfStock = normalized
            .filter((item) => item.quantity === 0)
            .map((item) => ({
                productId: item.productId,
                name: item.name
            }));

        return res.status(200).json({
            success: true,
            message: 'Get inventory alerts successfully',
            lowStock,
            outOfStock,
            data: {
                lowStock,
                outOfStock
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting inventory alerts',
            error: error.message
        });
    }
};

const getRestockSuggestions = async (req, res) => {
    try {
        const topLimit = Math.max(1, Math.min(Number(req.query.limit || 20), 100));
        const lowStockThreshold = 3;

        const topSoldRows = await SaleOrderItem.aggregate([
            {
                $lookup: {
                    from: 'saleorders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            {
                $match: {
                    'order.status': { $in: SALE_REVENUE_STATUSES }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    sold: { $sum: '$quantity' }
                }
            },
            { $sort: { sold: -1 } },
            { $limit: topLimit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    sold: 1,
                    name: '$product.name'
                }
            }
        ]);

        const productIds = topSoldRows.map((item) => item.productId).filter(Boolean);

        const stockRows = productIds.length > 0
            ? await ProductInstance.aggregate([
                {
                    $match: {
                        productId: { $in: productIds },
                        lifecycleStatus: { $nin: ['Sold', 'Lost'] }
                    }
                },
                {
                    $group: {
                        _id: '$productId',
                        currentStock: { $sum: 1 }
                    }
                }
            ])
            : [];

        const stockMap = new Map(
            stockRows.map((row) => [String(row._id), Number(row.currentStock || 0)])
        );

        const suggestions = topSoldRows
            .map((row) => {
                const sold = Number(row.sold || 0);
                const currentStock = stockMap.get(String(row.productId)) ?? 0;
                return {
                    productId: row.productId,
                    name: getProductDisplayName(row.name) || 'Sản phẩm không xác định',
                    sold,
                    currentStock,
                    suggestedImport: Math.ceil(sold * 1.5)
                };
            })
            .filter((item) => item.sold > 0 && item.currentStock <= lowStockThreshold);

        return res.status(200).json({
            success: true,
            message: 'Get restock suggestions successfully',
            data: suggestions,
            suggestions
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting restock suggestions',
            error: error.message
        });
    }
};

const getOwnerDashboard = async (req, res) => {
    try {
        const range = buildDashboardDateRange(req, res);
        if (!range) return;

        const { start, end } = range;
        const dateMatch = { createdAt: { $gte: start, $lte: end } };
        const dayFormat = '%Y-%m-%d';

        const saleRevenueMatch = buildSaleRevenueMatch(dateMatch);
        const rentRevenueMatch = buildRentRevenueMatch(dateMatch);

        const [saleRevenueRows, rentRevenueRows, saleOrders, rentOrders, newCustomers] = await Promise.all([
            SaleOrder.aggregate([
                { $match: saleRevenueMatch },
                {
                    $group: {
                        _id: { $dateToString: { format: dayFormat, date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            RentOrder.aggregate([
                { $match: rentRevenueMatch },
                {
                    $group: {
                        _id: { $dateToString: { format: dayFormat, date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            SaleOrder.countDocuments({
                ...dateMatch,
                status: { $nin: ['Cancelled', 'Failed', 'Draft'] }
            }),
            RentOrder.countDocuments({
                ...dateMatch,
                status: { $ne: 'Cancelled' }
            }),
            User.countDocuments({
                ...dateMatch,
                role: 'customer'
            })
        ]);

        const revenueMap = new Map();
        saleRevenueRows.forEach((row) => {
            revenueMap.set(row._id, {
                date: row._id,
                revenue: Number(row.revenue || 0)
            });
        });
        rentRevenueRows.forEach((row) => {
            if (!revenueMap.has(row._id)) {
                revenueMap.set(row._id, {
                    date: row._id,
                    revenue: Number(row.revenue || 0)
                });
            } else {
                const item = revenueMap.get(row._id);
                item.revenue += Number(row.revenue || 0);
            }
        });

        const revenueByDate = Array.from(revenueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        const revenue = revenueByDate.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
        const orders = Number(saleOrders || 0) + Number(rentOrders || 0);
        const conversionRate = newCustomers > 0
            ? Number(((orders / newCustomers) * 100).toFixed(1))
            : 0;

        const payload = {
            revenue,
            orders,
            newCustomers,
            conversionRate,
            saleOrders,
            rentOrders,
            revenueByDate,
            from: start.toISOString().slice(0, 10),
            to: end.toISOString().slice(0, 10)
        };

        return res.status(200).json({
            success: true,
            message: 'Get owner dashboard successfully',
            ...payload,
            data: payload
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting owner dashboard',
            error: error.message
        });
    }
};

const getDashboardSummary = async (req, res) => {
    try {
        const [productCount, staffCount, customerCount] = await Promise.all([
            Product.countDocuments(),
            User.countDocuments({ role: 'staff' }),
            User.countDocuments({ role: 'customer' })
        ]);

        return res.status(200).json({
            success: true,
            message: 'Get dashboard summary successfully',
            data: {
                productCount,
                staffCount,
                customerCount
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting dashboard summary',
            error: error.message
        });
    }
};

module.exports = {
    getRevenueAnalytics,
    getRentalStats,
    getInventoryStats,
    getCustomerStats,
    getTopProducts,
    getOwnerTopProducts,
    getInventoryAlerts,
    getRestockSuggestions,
    getOwnerDashboard,
    getDashboardSummary
};
