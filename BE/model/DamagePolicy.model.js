const mongoose = require('mongoose');

const DAMAGE_LEVEL_TRIGGERS = ['Washing', 'Repair', 'Lost'];
const DAMAGE_LEVEL_CONDITIONS = ['Normal', 'Dirty', 'Damaged', 'Lost'];

const damageLevelSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    penaltyPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    triggerLifecycle: {
      type: String,
      enum: DAMAGE_LEVEL_TRIGGERS,
      default: 'Repair',
    },
    condition: {
      type: String,
      enum: DAMAGE_LEVEL_CONDITIONS,
      default: 'Damaged',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const damagePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    scope: {
      type: String,
      enum: ['global', 'category'],
      default: 'global',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    levels: {
      type: [damageLevelSchema],
      default: [],
      validate: {
        validator: function (levels) {
          if (!Array.isArray(levels) || levels.length === 0) return false;
          const keys = levels.map((l) => String(l.key || '').trim().toLowerCase());
          return new Set(keys).size === keys.length;
        },
        message: 'Policy phải có ít nhất 1 mức và các key không được trùng nhau',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

damagePolicySchema.index({ scope: 1, categoryId: 1, isActive: 1 });

damagePolicySchema.pre('validate', async function () {
  if (this.scope === 'global') {
    this.categoryId = null;
  } else if (this.scope === 'category' && !this.categoryId) {
    throw new Error('categoryId bắt buộc khi scope = category');
  }
});

const DamagePolicy = mongoose.model('DamagePolicy', damagePolicySchema);

module.exports = DamagePolicy;
module.exports.DAMAGE_LEVEL_TRIGGERS = DAMAGE_LEVEL_TRIGGERS;
module.exports.DAMAGE_LEVEL_CONDITIONS = DAMAGE_LEVEL_CONDITIONS;
