const Product = require('../models/Product');
const driveService = require('../services/driveService');

// @desc    Obtener todos los productos (con filtros) de la empresa del usuario
// @route   GET /api/inventory
// @access  Privado
exports.getProducts = async (req, res) => {
  try {
    const { search, category, provider } = req.query;
    let query = { company: req.user.company }; // Filtrar por empresa

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
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
    
    if (productData.sku === '') {
      delete productData.sku;
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

    if (updateData.sku === '') {
      delete updateData.sku;
      updateData.$unset = { sku: 1 };
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
