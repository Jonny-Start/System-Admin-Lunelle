const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: 'Ajuste manual'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const paymentMethodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del método de pago es requerido'],
    trim: true
  },
  icon: {
    type: String,
    default: 'ph-wallet'
  },
  color: {
    type: String,
    default: '#6366f1' // indigo
  },
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  adjustments: {
    type: [adjustmentSchema],
    default: []
  }
}, {
  timestamps: true
});

// Index for fast company queries
paymentMethodSchema.index({ company: 1, isActive: 1 });
paymentMethodSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
