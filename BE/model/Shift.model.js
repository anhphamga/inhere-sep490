const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
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

module.exports = mongoose.model('Shift', shiftSchema);
