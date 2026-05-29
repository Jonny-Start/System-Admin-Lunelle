const Sale = require('../models/Sale');
const Product = require('../models/Product');
const PaymentMethod = require('../models/PaymentMethod');
const mongoose = require('mongoose');
const { makeAccentInsensitiveRegex } = require('../utils/queryHelper');

// @desc    Registrar nueva venta (descuenta stock automáticamente)
// @route   POST /api/sales
// @access  Privado
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, paymentMethod, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, error: 'La venta debe tener al menos un producto' });
    }

    const saleItems = [];
    let total = 0;
    let totalProfit = 0;

    // Process each item: validate stock, build sale items, update product stock
    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        company: req.user.company
      }).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, error: `Producto no encontrado: ${item.product}` });
      }

      const qty = Number(item.quantity);
      if (qty <= 0 || !Number.isInteger(qty)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, error: `Cantidad inválida para "${product.name}"` });
      }

      if (product.stock < qty) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, Solicitado: ${qty}`
        });
      }

      // Handle color-based stock
      let soldColor = null;
      if (product.colors && product.colors.length > 0) {
        if (!item.colorName) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: `Debe seleccionar un color para "${product.name}"`
          });
        }
        const colorIdx = product.colors.findIndex(c => c.name === item.colorName);
        if (colorIdx === -1) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: `Color "${item.colorName}" no encontrado para "${product.name}"`
          });
        }
        const colorEntry = product.colors[colorIdx];
        if (colorEntry.stock < qty) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            error: `Stock insuficiente del color "${colorEntry.name}" para "${product.name}". Disponible: ${colorEntry.stock}, Solicitado: ${qty}`
          });
        }
        product.colors[colorIdx].stock -= qty;
        soldColor = { name: colorEntry.name, hex: colorEntry.hex };
      }

      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : product.salePrice;
      const unitCost = product.purchasePrice;
      const subtotal = unitPrice * qty;
      const profit = (unitPrice - unitCost) * qty;

      saleItems.push({
        product: product._id,
        productName: product.name,
        quantity: qty,
        unitCost,
        unitPrice,
        subtotal,
        profit,
        color: soldColor || { name: null, hex: null }
      });

      total += subtotal;
      totalProfit += profit;

      // Decrease stock (for color products, recalculate from colors)
      if (product.colors && product.colors.length > 0) {
        product.stock = product.colors.reduce((sum, c) => sum + (c.stock || 0), 0);
      } else {
        product.stock -= qty;
      }
      product.history.push({
        user: req.user._id,
        action: `Venta registrada: -${qty} unidades${soldColor ? ` (Color: ${soldColor.name})` : ''} (Stock: ${product.stock + qty} → ${product.stock})`
      });
      await product.save({ session });
    }

    const sale = await Sale.create([{
      items: saleItems,
      total,
      totalProfit,
      paymentMethod,
      notes: notes || '',
      seller: req.user._id,
      company: req.user.company
    }], { session });

    // Update PaymentMethod balance
    const pmUpdate = await PaymentMethod.findOneAndUpdate(
      { name: paymentMethod, company: req.user.company, isActive: true },
      { $inc: { balance: total } },
      { session }
    );
    // If payment method doesn't exist yet, log a warning but don't block the sale
    if (!pmUpdate) {
      console.warn(`PaymentMethod "${paymentMethod}" not found for company ${req.user.company}. Balance not updated.`);
    }

    await session.commitTransaction();

    // Populate the sale for the response
    const populatedSale = await Sale.findById(sale[0]._id)
      .populate('seller', 'name')
      .populate('items.product', 'name salePrice');

    res.status(201).json({ success: true, data: populatedSale });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al crear venta:', error);
    res.status(400).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Obtener ventas con filtros (fecha, método de pago, búsqueda)
// @route   GET /api/sales
// @access  Privado
exports.getSales = async (req, res) => {
  try {
    const { from, to, paymentMethod, search, page = 1, limit = 50 } = req.query;
    let query = { company: req.user.company };

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // Payment method filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Search by product name in items
    if (search) {
      query['items.productName'] = makeAccentInsensitiveRegex(search);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [sales, totalCount] = await Promise.all([
      Sale.find(query)
        .populate('seller', 'name picture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Sale.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: sales.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: sales
    });
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener ventas' });
  }
};

// @desc    Obtener detalle de una venta
// @route   GET /api/sales/:id
// @access  Privado
exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      company: req.user.company
    })
      .populate('seller', 'name picture')
      .populate('items.product', 'name salePrice fileId webViewLink');

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener venta' });
  }
};

// @desc    Anular venta (devuelve stock)
// @route   DELETE /api/sales/:id
// @access  Privado (Admin/SuperAdmin)
exports.deleteSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      company: req.user.company
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    }

    // Revert stock for each item
    for (const item of sale.items) {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        // Restore color-specific stock if applicable
        if (item.color && item.color.name && product.colors && product.colors.length > 0) {
          const colorIdx = product.colors.findIndex(c => c.name === item.color.name);
          if (colorIdx !== -1) {
            product.colors[colorIdx].stock += item.quantity;
          }
          product.stock = product.colors.reduce((sum, c) => sum + (c.stock || 0), 0);
        } else {
          product.stock += item.quantity;
        }
        product.history.push({
          user: req.user._id,
          action: `Venta anulada: +${item.quantity} unidades devueltas${item.color && item.color.name ? ` (Color: ${item.color.name})` : ''} (Stock: ${product.stock - item.quantity} → ${product.stock})`
        });
        await product.save({ session });
      }
    }

    // Revert PaymentMethod balance
    await PaymentMethod.findOneAndUpdate(
      { name: sale.paymentMethod, company: req.user.company, isActive: true },
      { $inc: { balance: -sale.total } },
      { session }
    );

    await sale.deleteOne({ session });
    await session.commitTransaction();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error al anular venta:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Estadísticas de ventas para el dashboard
// @route   GET /api/sales/stats
// @access  Privado
exports.getSalesStats = async (req, res) => {
  try {
    const companyId = req.user.company;
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last 7 days for chart
    const last7Days = new Date(startOfToday);
    last7Days.setDate(last7Days.getDate() - 6);

    const [todayStats, weekStats, monthStats, dailyChart, paymentMethodStats, recentSales] = await Promise.all([
      // Today
      Sale.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            profit: { $sum: '$totalProfit' },
            count: { $sum: 1 }
          }
        }
      ]),
      // This week
      Sale.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: startOfWeek } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            profit: { $sum: '$totalProfit' },
            count: { $sum: 1 }
          }
        }
      ]),
      // This month
      Sale.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            profit: { $sum: '$totalProfit' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Daily chart (last 7 days)
      Sale.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: last7Days } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$total' },
            profit: { $sum: '$totalProfit' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Payment method breakdown (this month)
      Sale.aggregate([
        { $match: { company: companyObjId, createdAt: { $gte: startOfMonth } } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      // Recent 5 sales
      Sale.find({ company: companyId })
        .populate('seller', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Build daily chart with all 7 days (fill gaps)
    const dailyLabels = [];
    const dailyData = [];
    const dailyProfitData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      dailyLabels.push(i === 0 ? 'Hoy' : dayNames[d.getDay()]);
      const found = dailyChart.find(dc => dc._id === key);
      dailyData.push(found ? found.total : 0);
      dailyProfitData.push(found ? found.profit : 0);
    }

    res.status(200).json({
      success: true,
      data: {
        today: todayStats[0] || { total: 0, profit: 0, count: 0 },
        week: weekStats[0] || { total: 0, profit: 0, count: 0 },
        month: monthStats[0] || { total: 0, profit: 0, count: 0 },
        dailyChart: { labels: dailyLabels, sales: dailyData, profit: dailyProfitData },
        paymentMethods: paymentMethodStats,
        recent: recentSales
      }
    });
  } catch (error) {
    console.error('Sales stats error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas de ventas' });
  }
};
