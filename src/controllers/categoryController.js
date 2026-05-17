const Category = require('../models/Category');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      { $match: { company: req.user.company } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      { $project: { products: 0 } },
      { $sort: { name: 1 } }
    ]);
    res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener categorías' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.create({ name, company: req.user.company });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, company: req.user.company });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
    }
    await category.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { name },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
