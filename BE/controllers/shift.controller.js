/**
 * SHIFT CONTROLLER - Quản lý ca làm
 */

const Shift = require('../model/Shift.model');
const User = require('../model/User.model');

const sanitizeShift = (shift) => ({
    id: shift._id,
    title: shift.title,
    startAt: shift.startAt,
    endAt: shift.endAt,
    staffIds: shift.staffIds,
    note: shift.note,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt
});

const createShift = async (req, res) => {
    try {
        const { title, startAt, endAt, staffIds, note } = req.body;

        if (!startAt || !endAt) {
            return res.status(400).json({
                success: false,
                message: 'startAt and endAt are required'
            });
        }

        const startDate = new Date(startAt);
        const endDate = new Date(endAt);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'startAt or endAt is invalid'
            });
        }

        if (startDate >= endDate) {
            return res.status(400).json({
                success: false,
                message: 'startAt must be earlier than endAt'
            });
        }

        const uniqueStaffIds = Array.isArray(staffIds)
            ? [...new Set(staffIds.filter(Boolean))]
            : [];

        if (uniqueStaffIds.length > 0) {
            const staffCount = await User.countDocuments({
                _id: { $in: uniqueStaffIds },
                role: 'staff'
            });

            if (staffCount !== uniqueStaffIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Some staffIds are invalid'
                });
            }
        }

        const shift = await Shift.create({
            title: title || '',
            startAt: startDate,
            endAt: endDate,
            staffIds: uniqueStaffIds,
            note: note || ''
        });

        return res.status(201).json({
            success: true,
            message: 'Create shift successfully',
            data: sanitizeShift(shift)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating shift',
            error: error.message
        });
    }
};

const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, startAt, endAt, staffIds, note } = req.body;

        const updates = {};

        if (title != null) {
            updates.title = title;
        }
        if (note != null) {
            updates.note = note;
        }

        if (startAt != null) {
            const parsed = new Date(startAt);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'startAt is invalid'
                });
            }
            updates.startAt = parsed;
        }

        if (endAt != null) {
            const parsed = new Date(endAt);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'endAt is invalid'
                });
            }
            updates.endAt = parsed;
        }

        if (updates.startAt && updates.endAt && updates.startAt >= updates.endAt) {
            return res.status(400).json({
                success: false,
                message: 'startAt must be earlier than endAt'
            });
        }

        if (staffIds != null) {
            const uniqueStaffIds = Array.isArray(staffIds)
                ? [...new Set(staffIds.filter(Boolean))]
                : [];

            if (uniqueStaffIds.length > 0) {
                const staffCount = await User.countDocuments({
                    _id: { $in: uniqueStaffIds },
                    role: 'staff'
                });

                if (staffCount !== uniqueStaffIds.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'Some staffIds are invalid'
                    });
                }
            }

            updates.staffIds = uniqueStaffIds;
        }

        const shift = await Shift.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        });

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Shift not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Update shift successfully',
            data: sanitizeShift(shift)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating shift',
            error: error.message
        });
    }
};

const listShifts = async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'from and to are required'
            });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'from or to is invalid'
            });
        }

        const shifts = await Shift.find({
            startAt: { $lt: toDate },
            endAt: { $gt: fromDate }
        }).sort({ startAt: 1 });

        return res.status(200).json({
            success: true,
            message: 'Get shifts successfully',
            data: shifts.map(sanitizeShift)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error getting shifts',
            error: error.message
        });
    }
};

module.exports = {
    createShift,
    updateShift,
    listShifts
};
