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
                .populate('createdBy', 'name email role')
                .populate('activityLogs.actor', 'name email role')
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
            message: 'Không thể tải danh sách thông báo',
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
                message: 'Thiếu dữ liệu bắt buộc: type, targetType, targetId'
            });
        }

        const actorId = req.user?.id || null;
        const actorRole = String(req.user?.role || '');
        const created = await Alert.create({
            type,
            targetType,
            targetId,
            message,
            actionRequired: Boolean(actionRequired),
            status: 'New',
            createdBy: actorId,
            activityLogs: [
                {
                    action: 'CREATED',
                    actor: actorId,
                    actorRole,
                    note: 'Tạo thông báo',
                    fromStatus: '',
                    toStatus: 'New',
                    at: new Date()
                }
            ]
        });

        return res.status(201).json({
            success: true,
            data: created
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Không thể tạo thông báo',
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
                message: 'Trạng thái phải là New, Seen hoặc Done'
            });
        }

        const existing = await Alert.findById(id).lean();
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông báo'
            });
        }

        if (existing.status === status) {
            const current = await Alert.findById(id)
                .populate('handledBy', 'name email role')
                .populate('createdBy', 'name email role')
                .populate('activityLogs.actor', 'name email role')
                .lean();
            return res.status(200).json({
                success: true,
                data: current
            });
        }

        const actorId = req.user?.id || null;
        const actorRole = String(req.user?.role || '');
        const payload = {
            status,
            handledBy: req.user?.id || null,
            handledAt: new Date(),
            $push: {
                activityLogs: {
                    action: 'STATUS_CHANGED',
                    actor: actorId,
                    actorRole,
                    note: `Cập nhật trạng thái từ ${existing.status} sang ${status}`,
                    fromStatus: existing.status || '',
                    toStatus: status,
                    at: new Date()
                }
            }
        };

        const updated = await Alert.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true
        })
            .populate('handledBy', 'name email role')
            .populate('createdBy', 'name email role')
            .populate('activityLogs.actor', 'name email role')
            .lean();

        return res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Không thể cập nhật thông báo',
            error: error.message
        });
    }
};

module.exports = {
    listAlerts,
    createAlert,
    updateAlertStatus
};
