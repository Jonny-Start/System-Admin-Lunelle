const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, ingrese el nombre de la etiqueta'],
    trim: true
  },
  color: {
    type: String,
    required: [true, 'Por favor, ingrese un color para la etiqueta'],
    default: '#6366f1' // Default indigo
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tag', tagSchema);
