const Alert = require('../model/Alert.model');

const ALLOWED_STATUSES = new Set(['New', 'Seen', 'Done']);

const listAlerts = async (req, res) => {
    try {
        const { status, targetType, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status && ALLOWED_STATUSES.has(status)) query.status = status;
        if (targetType) query.targetType = targetType;

        const skip = (Number(page) - 1) * Number(limit);

        const [items, total] = await Promise.all([
            Alert.find(query)
                .populate('handledBy', 'name email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Alert.countDocuments(query)
        ]);

        return res.status(200).json({
            success: true,
            data: items,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting alerts',
            error: error.message
        });
    }
};

const createAlert = async (req, res) => {
    try {
        const { type, targetType, targetId, message = '', actionRequired = false } = req.body;

        if (!type || !targetType || !targetId) {
            return res.status(400).json({
                success: false,
                message: 'type, targetType, targetId are required'
            });
        }

        const created = await Alert.create({
            type,
            targetType,
            targetId,
            message,
            actionRequired: Boolean(actionRequired),
            status: 'New'
        });

        return res.status(201).json({
            success: true,
            data: created
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating alert',
            error: error.message
        });
    }
};

const updateAlertStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!ALLOWED_STATUSES.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'status must be New, Seen, or Done'
            });
        }

        const payload = {
            status,
            handledBy: req.user?.id || null,
            handledAt: new Date()
        };

        const updated = await Alert.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true
        }).lean();

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating alert',
            error: error.message
        });
    }
};

module.exports = {
    listAlerts,
    createAlert,
    updateAlertStatus
};
