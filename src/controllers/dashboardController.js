const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const User = require('../models/User');
const Sale = require('../models/Sale');

// @desc    Obtener estadísticas completas del dashboard
// @route   GET /api/dashboard/stats
// @access  Privado
exports.getDashboardStats = async (req, res) => {
  try {
    const companyId = req.user.company;
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    const [
      products,
      categories,
      tags,
      users,
      categoryAgg,
      tagAgg,
      marginDistribution,
      recentProducts,
      soldPerProduct
    ] = await Promise.all([
      Product.find({ company: companyId }).populate('category', 'name').lean(),
      Category.countDocuments({ company: companyId }),
      Tag.find({ company: companyId }).lean(),
      User.countDocuments({ company: companyId, isActive: true }),

      // Agregación por categoría (stock actual)
      Product.aggregate([
        { $match: { company: companyObjId } },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'catInfo' } },
        { $unwind: { path: '$catInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category',
            name: { $first: { $ifNull: ['$catInfo.name', 'Sin categoría'] } },
            count: { $sum: 1 },
            totalCost: { $sum: { $multiply: ['$purchasePrice', '$stock'] } },
            totalSaleValue: { $sum: { $multiply: ['$salePrice', '$stock'] } },
            totalStock: { $sum: '$stock' },
            avgMargin: {
              $avg: {
                $cond: [
                  { $gt: ['$purchasePrice', 0] },
                  { $multiply: [{ $divide: [{ $subtract: ['$salePrice', '$purchasePrice'] }, '$purchasePrice'] }, 100] },
                  0
                ]
              }
            }
          }
        },
        { $sort: { totalCost: -1 } }
      ]),

      // Agregación por etiqueta
      Product.aggregate([
        { $match: { company: companyObjId, tag: { $ne: null } } },
        { $lookup: { from: 'tags', localField: 'tag', foreignField: '_id', as: 'tagInfo' } },
        { $unwind: { path: '$tagInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$tag',
            name: { $first: '$tagInfo.name' },
            color: { $first: '$tagInfo.color' },
            count: { $sum: 1 },
            totalCost: { $sum: { $multiply: ['$purchasePrice', '$stock'] } },
            totalSaleValue: { $sum: { $multiply: ['$salePrice', '$stock'] } },
            totalStock: { $sum: '$stock' }
          }
        },
        { $sort: { totalCost: -1 } }
      ]),

      // Distribución de márgenes
      Product.aggregate([
        { $match: { company: companyObjId } },
        {
          $project: {
            margin: {
              $cond: [
                { $gt: ['$purchasePrice', 0] },
                { $multiply: [{ $divide: [{ $subtract: ['$salePrice', '$purchasePrice'] }, '$purchasePrice'] }, 100] },
                0
              ]
            }
          }
        },
        {
          $bucket: {
            groupBy: '$margin',
            boundaries: [0, 10, 25, 50, 100, 999999],
            default: 'Otros',
            output: { count: { $sum: 1 } }
          }
        }
      ]),

      // Productos recientes (últimos 10)
      Product.aggregate([
        { $match: { company: companyObjId } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } },
        { $lookup: { from: 'tags', localField: 'tag', foreignField: '_id', as: 'tagInfo' } },
        { $addFields: {
          category: { $arrayElemAt: ['$categoryInfo', 0] },
          tag: { $arrayElemAt: ['$tagInfo', 0] }
        }},
        { $project: { categoryInfo: 0, tagInfo: 0 } }
      ]),

      // Total de unidades vendidas por producto
      Sale.aggregate([
        { $match: { company: companyObjId } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' }
          }
        }
      ])
    ]);

    // ── Mapa de unidades vendidas por producto ──
    const soldMap = {};
    for (const s of soldPerProduct) {
      soldMap[s._id.toString()] = s.totalSold;
    }

    // ══════════════════════════════════════════════════
    // CALCULAR AMBOS MODOS: ACTUAL vs HISTÓRICO
    // ══════════════════════════════════════════════════
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);

    let currentInvestment = 0, currentSaleValue = 0;
    let historicalInvestment = 0, historicalSaleValue = 0;

    for (const p of products) {
      const cost = Number(p.purchasePrice) || 0;
      const sale = Number(p.salePrice) || 0;
      const stock = Number(p.stock) || 0;
      const unitsSold = soldMap[p._id.toString()] || 0;
      const totalUnits = stock + unitsSold;

      // Actual: solo lo que hay en bodega ahora
      currentInvestment += cost * stock;
      currentSaleValue += sale * stock;

      // Histórico: todo lo que se ha comprado (stock + vendido)
      historicalInvestment += cost * totalUnits;
      historicalSaleValue += sale * totalUnits;
    }

    const currentProfit = currentSaleValue - currentInvestment;
    const currentMargin = currentInvestment > 0 ? ((currentProfit / currentInvestment) * 100) : 0;

    const historicalProfit = historicalSaleValue - historicalInvestment;
    const historicalMargin = historicalInvestment > 0 ? ((historicalProfit / historicalInvestment) * 100) : 0;

    // ── Alertas ──
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const noImageProducts = products.filter(p => !p.fileId && !p.webViewLink);

    // ── Top 5 productos (ambos modos) ──
    const topValueCurrent = [...products]
      .map(p => ({
        ...p,
        investmentValue: (Number(p.purchasePrice) || 0) * (Number(p.stock) || 0),
        saleValue: (Number(p.salePrice) || 0) * (Number(p.stock) || 0)
      }))
      .sort((a, b) => b.investmentValue - a.investmentValue)
      .slice(0, 5);

    const topValueHistorical = [...products]
      .map(p => {
        const cost = Number(p.purchasePrice) || 0;
        const sale = Number(p.salePrice) || 0;
        const totalUnits = (Number(p.stock) || 0) + (soldMap[p._id.toString()] || 0);
        return { ...p, investmentValue: cost * totalUnits, saleValue: sale * totalUnits };
      })
      .sort((a, b) => b.investmentValue - a.investmentValue)
      .slice(0, 5);

    // Top margen (no cambia entre modos, es por precio unitario)
    const topMarginProducts = [...products]
      .filter(p => Number(p.purchasePrice) > 0)
      .map(p => ({
        ...p,
        margin: ((Number(p.salePrice || 0) - Number(p.purchasePrice)) / Number(p.purchasePrice)) * 100
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);

    // ── Categorías: enriquecer con datos de ventas para modo histórico ──
    const catSoldMap = {};
    for (const p of products) {
      const catId = p.category && typeof p.category === 'object'
        ? p.category._id.toString()
        : (p.category ? p.category.toString() : 'none');
      const unitsSold = soldMap[p._id.toString()] || 0;
      if (!catSoldMap[catId]) catSoldMap[catId] = { soldCost: 0, soldSaleValue: 0 };
      catSoldMap[catId].soldCost += (Number(p.purchasePrice) || 0) * unitsSold;
      catSoldMap[catId].soldSaleValue += (Number(p.salePrice) || 0) * unitsSold;
    }

    const historicalCategoryAgg = categoryAgg.map(cat => {
      const extra = catSoldMap[cat._id ? cat._id.toString() : 'none'] || { soldCost: 0, soldSaleValue: 0 };
      return {
        ...cat,
        totalCost: cat.totalCost + extra.soldCost,
        totalSaleValue: cat.totalSaleValue + extra.soldSaleValue
      };
    });

    // ── Distribución de márgenes ──
    const marginLabels = ['0-10%', '10-25%', '25-50%', '50-100%', '100%+'];
    const marginData = marginLabels.map((label, i) => {
      const bucket = marginDistribution.find(b => {
        const bounds = [0, 10, 25, 50, 100];
        return b._id === bounds[i];
      });
      return bucket ? bucket.count : 0;
    });

    // ══════════════════════════════════════════════════
    // RESPUESTA CON AMBOS MODOS
    // ══════════════════════════════════════════════════
    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalProducts,
          totalStock,
          totalCategories: categories,
          totalUsers: users,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          noImageCount: noImageProducts.length,
          // Modo Actual (lo que hay en bodega)
          currentInvestment,
          currentSaleValue,
          currentProfit,
          currentMargin: Math.round(currentMargin * 100) / 100,
          // Modo Histórico (todo lo comprado)
          historicalInvestment,
          historicalSaleValue,
          historicalProfit,
          historicalMargin: Math.round(historicalMargin * 100) / 100
        },
        charts: {
          // Enviamos ambas versiones de categorías
          categoriesCurrent: categoryAgg,
          categoriesHistorical: historicalCategoryAgg,
          tags: tagAgg,
          marginDistribution: {
            labels: marginLabels,
            data: marginData
          }
        },
        alerts: {
          lowStock: lowStockProducts.slice(0, 8),
          outOfStock: outOfStockProducts.slice(0, 8)
        },
        rankings: {
          topValueCurrent,
          topValueHistorical,
          topMargin: topMarginProducts
        },
        recent: recentProducts
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas del dashboard' });
  }
};
