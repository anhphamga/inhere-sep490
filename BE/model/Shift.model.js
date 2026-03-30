const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    code: {
        type: String,
        trim: true,
        default: null
    },
    name: {
        type: String,
        trim: true,
        default: ''
    },
    workDate: {
        type: String,
        trim: true,
        default: null
    },
    startTime: {
        type: String,
        trim: true,
        default: null
    },
    endTime: {
        type: String,
        trim: true,
        default: null
    },
    maxStaff: {
        type: Number,
        default: 0,
        min: 0
    },
    assignedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        default: 'OPEN'
    },
    allowRegistration: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        default: ''
    },
    startAt: {
        type: Date,
        required: true
    },
    endAt: {
        type: Date,
        required: true
    },
    staffIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    note: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

shiftSchema.index({ code: 1 }, { unique: true, sparse: true });
shiftSchema.index({ workDate: 1, startTime: 1, endTime: 1 });

const parseDateTime = (workDate, time) => {
    if (!workDate || !time) return null;
    const parsed = new Date(`${workDate}T${time}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
};

shiftSchema.pre('validate', function syncLegacyAndNewFields() {
    if ((!this.startAt || !this.endAt) && this.workDate && this.startTime && this.endTime) {
        const startAt = parseDateTime(this.workDate, this.startTime);
        const endAt = parseDateTime(this.workDate, this.endTime);
        if (startAt) this.startAt = startAt;
        if (endAt) this.endAt = endAt;
    }

    if ((!this.workDate || !this.startTime || !this.endTime) && this.startAt && this.endAt) {
        this.workDate = this.workDate || formatDate(this.startAt);
        this.startTime = this.startTime || formatTime(this.startAt);
        this.endTime = this.endTime || formatTime(this.endAt);
    }

    if (!this.title && this.name) {
        this.title = this.name;
    }

    if (!this.name && this.title) {
        this.name = this.title;
    }

});

module.exports = mongoose.model('Shift', shiftSchema);
