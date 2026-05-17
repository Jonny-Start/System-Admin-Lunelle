const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, ingrese un nombre'],
  },
  email: {
    type: String,
    required: [true, 'Por favor, ingrese un email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor, ingrese un email válido'
    ]
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  picture: {
    type: String
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Administrador', 'Empleado'],
    default: 'Empleado'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
