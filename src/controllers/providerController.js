const Provider = require('../models/Provider');

exports.getProviders = async (req, res) => {
  try {
    const providers = await Provider.aggregate([
      { $match: { company: req.user.company } },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'provider',
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
    res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener proveedores' });
  }
};

exports.createProvider = async (req, res) => {
  try {
    const { name } = req.body;
    const provider = await Provider.create({ name, company: req.user.company });
    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findOne({ _id: req.params.id, company: req.user.company });
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    await provider.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateProvider = async (req, res) => {
  try {
    const { name } = req.body;
    const provider = await Provider.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { name },
      { new: true, runValidators: true }
    );
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    res.status(200).json({ success: true, data: provider });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
