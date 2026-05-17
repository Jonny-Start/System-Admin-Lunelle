const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const User = require('../models/User');

// @desc    Obtener estadísticas completas del dashboard
// @route   GET /api/dashboard/stats
// @access  Privado
exports.getDashboardStats = async (req, res) => {
  try {
    const companyId = req.user.company;
    const companyObjId = new mongoose.Types.ObjectId(companyId);

    // Ejecutar todas las consultas en paralelo
    const [
      products,
      categories,
      tags,
      users,
      categoryAgg,
      tagAgg,
      marginDistribution,
      recentProducts
    ] = await Promise.all([
      // Todos los productos de la empresa (skip populate to avoid cast errors on legacy data)
      Product.find({ company: companyId }).lean(),

      // Total de categorías
      Category.countDocuments({ company: companyId }),

      // Todas las etiquetas
      Tag.find({ company: companyId }).lean(),

      // Usuarios activos
      User.countDocuments({ company: companyId, isActive: true }),

      // Agregación por categoría
      Product.aggregate([
        { $match: { company: companyObjId } },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'catInfo' } },
        { $unwind: '$catInfo' },
        {
          $group: {
            _id: '$category',
            name: { $first: '$catInfo.name' },
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
        { $unwind: '$tagInfo' },
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
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ]),

      // Productos recientes (últimos 10) — use aggregate to avoid populate cast errors
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
      ])
    ]);

    // Calcular KPIs principales
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalInvestment = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
    const totalSaleValue = products.reduce((sum, p) => sum + ((p.salePrice || 0) * (p.stock || 0)), 0);
    const potentialProfit = totalSaleValue - totalInvestment;
    const avgMargin = totalInvestment > 0 ? ((potentialProfit / totalInvestment) * 100) : 0;

    // Productos con stock bajo
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= p.minStock);
    const outOfStockProducts = products.filter(p => p.stock === 0);

    // Productos sin imagen
    const noImageProducts = products.filter(p => !p.fileId && !p.webViewLink);

    // Top 5 productos más valiosos (por inversión)
    const topValueProducts = [...products]
      .map(p => ({
        ...p,
        investmentValue: (p.purchasePrice || 0) * (p.stock || 0),
        saleValue: (p.salePrice || 0) * (p.stock || 0)
      }))
      .sort((a, b) => b.investmentValue - a.investmentValue)
      .slice(0, 5);

    // Top 5 productos con mayor margen
    const topMarginProducts = [...products]
      .filter(p => p.purchasePrice > 0)
      .map(p => ({
        ...p,
        margin: ((p.salePrice - p.purchasePrice) / p.purchasePrice) * 100
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);

    // Formatear distribución de márgenes
    const marginLabels = ['0-10%', '10-25%', '25-50%', '50-100%', '100%+'];
    const marginData = marginLabels.map((label, i) => {
      const bucket = marginDistribution.find(b => {
        const bounds = [0, 10, 25, 50, 100];
        return b._id === bounds[i];
      });
      return bucket ? bucket.count : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalProducts,
          totalStock,
          totalInvestment,
          totalSaleValue,
          potentialProfit,
          avgMargin: Math.round(avgMargin * 100) / 100,
          totalCategories: categories,
          totalUsers: users,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          noImageCount: noImageProducts.length
        },
        charts: {
          categories: categoryAgg,
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
          topValue: topValueProducts,
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
