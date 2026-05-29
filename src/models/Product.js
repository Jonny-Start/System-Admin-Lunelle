const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hex: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, ingrese el nombre del producto'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    sparse: true,
    unique: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Por favor, seleccione una categoría']
  },
  tag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    default: null
  },
  tags: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag'
    }],
    default: []
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    default: null
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Por favor, ingrese el precio de compra']
  },
  salePrice: {
    type: Number,
    required: [true, 'Por favor, ingrese el precio de venta']
  },
  stock: {
    type: Number,
    required: [true, 'Por favor, ingrese el stock actual'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Por favor, ingrese el stock mínimo para alertas'],
    default: 5
  },
  fileId: {
    type: String, // Google Drive File ID
    default: null
  },
  webViewLink: {
    type: String, // Google Drive Web View Link
    default: null
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  colors: {
    type: [colorSchema],
    default: []
  },
  history: [historySchema]
}, {
  timestamps: true
});

// Auto-calculate stock from colors when colors are defined
productSchema.pre('save', function(next) {
  if (this.colors && this.colors.length > 0) {
    this.stock = this.colors.reduce((sum, c) => sum + (c.stock || 0), 0);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
