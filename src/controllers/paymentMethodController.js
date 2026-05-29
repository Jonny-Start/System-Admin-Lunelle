const PaymentMethod = require('../models/PaymentMethod');

// Default payment methods to seed if none exist
const DEFAULT_METHODS = [
  { name: 'Efectivo',  icon: 'ph-money',                 color: '#10b981' },
  { name: 'Nequi',     icon: 'ph-device-mobile',         color: '#8b5cf6' },
  { name: 'Daviplata', icon: 'ph-device-mobile-camera',  color: '#f97316' },
  { name: 'Datafono',  icon: 'ph-credit-card',           color: '#0ea5e9' }
];

/**
 * Ensure default payment methods exist for a company.
 * Called lazily on first GET if none found.
 */
async function ensureDefaults(companyId) {
  const count = await PaymentMethod.countDocuments({ company: companyId });
  if (count === 0) {
    const docs = DEFAULT_METHODS.map(m => ({ ...m, balance: 0, company: companyId }));
    await PaymentMethod.insertMany(docs);
  }
}

// @desc    Obtener todos los métodos de pago
// @route   GET /api/payment-methods
// @access  Privado
exports.getPaymentMethods = async (req, res) => {
  try {
    await ensureDefaults(req.user.company);
    const methods = await PaymentMethod.find({
      company: req.user.company,
      isActive: true
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({ success: false, error: 'Error al obtener métodos de pago' });
  }
};

// @desc    Obtener resumen de caja para dashboard
// @route   GET /api/payment-methods/summary
// @access  Privado
exports.getPaymentMethodsSummary = async (req, res) => {
  try {
    await ensureDefaults(req.user.company);
    const methods = await PaymentMethod.find({
      company: req.user.company,
      isActive: true
    }).sort({ createdAt: 1 }).lean();

    const totalBalance = methods.reduce((sum, m) => sum + (m.balance || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        methods,
        totalBalance
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de caja:', error);
    res.status(500).json({ success: false, error: 'Error al obtener resumen de caja' });
  }
};

// @desc    Crear nuevo método de pago
// @route   POST /api/payment-methods
// @access  Privado (Admin)
exports.createPaymentMethod = async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    const method = await PaymentMethod.create({
      name,
      icon: icon || 'ph-wallet',
      color: color || '#6366f1',
      balance: 0,
      company: req.user.company
    });

    res.status(201).json({ success: true, data: method });
  } catch (error) {
    console.error('Error al crear método de pago:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Ya existe un método de pago con ese nombre' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Actualizar método de pago (nombre, icono, color)
// @route   PUT /api/payment-methods/:id
// @access  Privado (Admin)
exports.updatePaymentMethod = async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const method = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { name, icon, color },
      { new: true, runValidators: true }
    );

    if (!method) {
      return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
    }

    res.status(200).json({ success: true, data: method });
  } catch (error) {
    console.error('Error al actualizar método de pago:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Ya existe un método de pago con ese nombre' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Ajustar saldo manualmente
// @route   PUT /api/payment-methods/:id/adjust
// @access  Privado (Admin)
exports.adjustBalance = async (req, res) => {
  try {
    const { newBalance, reason } = req.body;

    if (newBalance === undefined || newBalance === null) {
      return res.status(400).json({ success: false, error: 'El nuevo saldo es requerido' });
    }

    const method = await PaymentMethod.findOne({
      _id: req.params.id,
      company: req.user.company
    });

    if (!method) {
      return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
    }

    const previousBalance = method.balance;
    method.balance = Number(newBalance);
    method.adjustments.push({
      previousBalance,
      newBalance: Number(newBalance),
      reason: reason || 'Ajuste manual',
      user: req.user._id
    });

    await method.save();
    res.status(200).json({ success: true, data: method });
  } catch (error) {
    console.error('Error al ajustar saldo:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Desactivar método de pago
// @route   DELETE /api/payment-methods/:id
// @access  Privado (Admin)
exports.deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { isActive: false },
      { new: true }
    );

    if (!method) {
      return res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error al desactivar método de pago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
