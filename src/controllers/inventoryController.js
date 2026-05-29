const Product = require('../models/Product');
const driveService = require('../services/driveService');
const { makeAccentInsensitiveRegex } = require('../utils/queryHelper');

// @desc    Obtener todos los productos (con filtros) de la empresa del usuario
// @route   GET /api/inventory
// @access  Privado
exports.getProducts = async (req, res) => {
  try {
    const { search, category, provider } = req.query;
    let query = { company: req.user.company }; // Filtrar por empresa

    if (search) {
      const searchRegex = makeAccentInsensitiveRegex(search);
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (provider) {
      query.provider = provider;
    }

    const products = await Product.find(query)
      .populate('tag', 'name color')
      .populate('tags', 'name color')
      .populate('category', 'name')
      .populate('provider', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
};

// @desc    Crear nuevo producto
// @route   POST /api/inventory
// @access  Privado (Admin/Empleado)
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    if (typeof productData.sku === 'string') {
      productData.sku = productData.sku.trim();
    }
    if (!productData.sku) {
      delete productData.sku;
    }

    // Parsear y normalizar etiquetas
    let tags = [];
    if (productData.tags) {
      try {
        const parsed = JSON.parse(productData.tags);
        tags = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        tags = Array.isArray(productData.tags) ? productData.tags : [productData.tags];
      }
    } else if (productData.tag) {
      tags = [productData.tag];
    }
    tags = tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean).slice(0, 2);
    productData.tags = tags;
    productData.tag = tags.length > 0 ? tags[0] : null;

    // Parsear colores
    if (productData.colors) {
      try {
        const parsedColors = typeof productData.colors === 'string' ? JSON.parse(productData.colors) : productData.colors;
        productData.colors = Array.isArray(parsedColors) ? parsedColors.map(c => ({
          name: (c.name || '').trim(),
          hex: (c.hex || '#000000').trim(),
          stock: Math.max(0, parseInt(c.stock, 10) || 0)
        })).filter(c => c.name) : [];
      } catch (e) {
        productData.colors = [];
      }
      // If colors exist, stock = sum of color stocks
      if (productData.colors.length > 0) {
        productData.stock = productData.colors.reduce((sum, c) => sum + c.stock, 0);
      }
    }

    // Asignar empresa del usuario logueado
    productData.company = req.user.company;

    // Subir imagen a Drive si existe
    if (req.file) {
      const driveFile = await driveService.uploadFileToDrive(req.file);
      productData.fileId = driveFile.id;
      productData.webViewLink = driveFile.webViewLink;
    }

    // Registrar historial inicial
    productData.history = [{
      user: req.user._id,
      action: 'Producto creado'
    }];

    const product = await Product.create(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    // Revertir subida si hay error en DB y se subió imagen
    if (req.file && error) {
       // Opcional: driveService.deleteFileFromDrive(productData.fileId);
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Actualizar producto (Stock y detalles)
// @route   PUT /api/inventory/:id
// @access  Privado
exports.updateProduct = async (req, res) => {
  try {
    // Buscar solo dentro de la empresa del usuario
    let product = await Product.findOne({ _id: req.params.id, company: req.user.company });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const updateData = req.body;
    let historyAction = 'Producto actualizado';

    // Parsear y normalizar etiquetas
    if (updateData.tags !== undefined) {
      let tags = [];
      if (updateData.tags) {
        try {
          const parsed = JSON.parse(updateData.tags);
          tags = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          tags = Array.isArray(updateData.tags) ? updateData.tags : [updateData.tags];
        }
      }
      tags = tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean).slice(0, 2);
      updateData.tags = tags;
      updateData.tag = tags.length > 0 ? tags[0] : null;
    } else if (updateData.tag !== undefined) {
      updateData.tags = updateData.tag ? [updateData.tag] : [];
    }

    if (typeof updateData.sku === 'string') {
      updateData.sku = updateData.sku.trim();
    }
    if (!updateData.sku) {
      delete updateData.sku;
      updateData.$unset = { sku: 1 };
    }

    // Parsear colores
    if (updateData.colors !== undefined) {
      try {
        const parsedColors = typeof updateData.colors === 'string' ? JSON.parse(updateData.colors) : updateData.colors;
        updateData.colors = Array.isArray(parsedColors) ? parsedColors.map(c => ({
          name: (c.name || '').trim(),
          hex: (c.hex || '#000000').trim(),
          stock: Math.max(0, parseInt(c.stock, 10) || 0)
        })).filter(c => c.name) : [];
      } catch (e) {
        updateData.colors = [];
      }
      // If colors exist, stock = sum of color stocks
      if (updateData.colors.length > 0) {
        updateData.stock = updateData.colors.reduce((sum, c) => sum + c.stock, 0);
      }
    }

    // Verificar si el stock cambió
    if (updateData.stock !== undefined && Number(updateData.stock) !== product.stock) {
      historyAction = `Stock modificado de ${product.stock} a ${updateData.stock}`;
    }

    // Subir nueva imagen a Drive si existe y borrar la anterior
    if (req.file) {
      if (product.fileId) {
        await driveService.deleteFileFromDrive(product.fileId);
      }
      const driveFile = await driveService.uploadFileToDrive(req.file);
      updateData.fileId = driveFile.id;
      updateData.webViewLink = driveFile.webViewLink;
    }

    // Actualizar historial
    updateData.$push = {
      history: {
        user: req.user._id,
        action: historyAction
      }
    };

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Eliminar producto
// @route   DELETE /api/inventory/:id
// @access  Privado (Solo Admin/Super Admin)
exports.deleteProduct = async (req, res) => {
  try {
    // Buscar solo dentro de la empresa del usuario
    const product = await Product.findOne({ _id: req.params.id, company: req.user.company });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    // Eliminar imagen de Drive
    if (product.fileId) {
      await driveService.deleteFileFromDrive(product.fileId);
    }

    await product.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
