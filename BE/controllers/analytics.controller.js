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

        const [rentRows, saleRows] = await Promise.all([
            RentOrder.aggregate([
                { $match: dateMatch },
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
                { $match: dateMatch },
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
    getDashboardSummary
};
