const FittingBooking = require('../model/FittingBooking.model');

const ALLOWED_STATUSES = new Set(['Pending', 'Confirmed', 'Rescheduled', 'Cancelled', 'Completed', 'NoShow']);

const listBookings = async (req, res) => {
    try {
        const { status, date, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status && ALLOWED_STATUSES.has(status)) query.status = status;
        if (date) {
            const d = new Date(date);
            if (!Number.isNaN(d.getTime())) {
                const start = new Date(d);
                start.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setHours(23, 59, 59, 999);
                query.date = { $gte: start, $lte: end };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [items, total] = await Promise.all([
            FittingBooking.find(query)
                .populate('customerId', 'name phone email')
                .populate('staffId', 'name phone email')
                .sort({ date: 1, timeSlot: 1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            FittingBooking.countDocuments(query)
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
            message: 'Error getting fitting bookings',
            error: error.message
        });
    }
};

const createBooking = async (req, res) => {
    try {
        const { date, timeSlot, note = '' } = req.body;
        if (!date || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: 'date and timeSlot are required'
            });
        }

        const created = await FittingBooking.create({
            customerId: req.user?.id,
            date,
            timeSlot,
            note,
            status: 'Pending'
        });

        return res.status(201).json({ success: true, data: created });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error creating fitting booking',
            error: error.message
        });
    }
};

const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, date, timeSlot, note, staffId } = req.body;

        const payload = {};
        if (status) {
            if (!ALLOWED_STATUSES.has(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }
            payload.status = status;
        }
        if (date) payload.date = date;
        if (timeSlot) payload.timeSlot = timeSlot;
        if (note !== undefined) payload.note = note;
        if (staffId !== undefined) payload.staffId = staffId;

        const updated = await FittingBooking.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true
        })
            .populate('customerId', 'name phone email')
            .populate('staffId', 'name phone email')
            .lean();

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Fitting booking not found'
            });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error updating fitting booking',
            error: error.message
        });
    }
};

module.exports = {
    listBookings,
    createBooking,
    updateBookingStatus
};
