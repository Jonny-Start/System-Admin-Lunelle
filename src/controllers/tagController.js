const Tag = require('../models/Tag');
const Product = require('../models/Product');

// @desc    Obtener todas las etiquetas
// @route   GET /api/tags
// @access  Private
exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find({ company: req.user.company }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tags.length, data: tags });
  } catch (error) {
    console.error('Error al obtener etiquetas:', error);
    res.status(500).json({ success: false, error: 'Error del servidor al obtener etiquetas' });
  }
};

// @desc    Crear una nueva etiqueta
// @route   POST /api/tags
// @access  Private
exports.createTag = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ success: false, error: 'Por favor, ingrese el nombre y el color de la etiqueta' });
    }

    const tag = await Tag.create({
      name,
      color,
      company: req.user.company
    });

    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error('Error al crear etiqueta:', error);
    res.status(500).json({ success: false, error: 'Error del servidor al crear la etiqueta' });
  }
};

// @desc    Actualizar una etiqueta
// @route   PUT /api/tags/:id
// @access  Private
exports.updateTag = async (req, res) => {
  try {
    const { name, color } = req.body;
    const tag = await Tag.findOne({ _id: req.params.id, company: req.user.company });

    if (!tag) {
      return res.status(404).json({ success: false, error: 'Etiqueta no encontrada' });
    }

    if (name) tag.name = name;
    if (color) tag.color = color;
    await tag.save();

    res.status(200).json({ success: true, data: tag });
  } catch (error) {
    console.error('Error al actualizar etiqueta:', error);
    res.status(500).json({ success: false, error: 'Error del servidor al actualizar la etiqueta' });
  }
};

// @desc    Eliminar una etiqueta
// @route   DELETE /api/tags/:id
// @access  Private (Admin)
exports.deleteTag = async (req, res) => {
  try {
    const tag = await Tag.findOne({ _id: req.params.id, company: req.user.company });

    if (!tag) {
      return res.status(404).json({ success: false, error: 'Etiqueta no encontrada' });
    }

    // Remove tag reference from all products that use it
    await Product.updateMany(
      { tag: tag._id, company: req.user.company },
      { $unset: { tag: 1 } }
    );

    await tag.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Error al eliminar etiqueta:', error);
    res.status(500).json({ success: false, error: 'Error del servidor al eliminar la etiqueta' });
  }
};

// @desc    Asignación masiva de etiqueta a productos
// @route   POST /api/tags/bulk-assign
// @access  Private
exports.bulkAssignTag = async (req, res) => {
  try {
    const { tagId, productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe seleccionar al menos un producto' });
    }

    // If tagId is null, remove tag from products
    const updateOp = tagId
      ? { $set: { tag: tagId } }
      : { $unset: { tag: 1 } };

    const result = await Product.updateMany(
      { _id: { $in: productIds }, company: req.user.company },
      updateOp
    );

    res.status(200).json({
      success: true,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error en asignación masiva:', error);
    res.status(500).json({ success: false, error: 'Error del servidor al asignar etiquetas' });
  }
};
