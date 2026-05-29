const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // Snapshot product info at time of sale (prices may change later)
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [1, 'La cantidad mínima es 1']
  },
  unitCost: {
    type: Number,
    required: true  // purchasePrice snapshot
  },
  unitPrice: {
    type: Number,
    required: [true, 'El precio de venta es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  subtotal: {
    type: Number,
    required: true  // quantity * unitPrice
  },
  profit: {
    type: Number,
    required: true  // (unitPrice - unitCost) * quantity
  }
});

const saleSchema = new mongoose.Schema({
  items: {
    type: [saleItemSchema],
    required: true,
    validate: {
      validator: function(v) { return v.length > 0; },
      message: 'La venta debe tener al menos un producto'
    }
  },
  total: {
    type: Number,
    required: true
  },
  totalProfit: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: [true, 'El método de pago es requerido']
  },
  notes: {
    type: String,
    default: ''
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

// Index for fast company+date queries
saleSchema.index({ company: 1, createdAt: -1 });
saleSchema.index({ company: 1, paymentMethod: 1 });

module.exports = mongoose.model('Sale', saleSchema);
