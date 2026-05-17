const Company = require('../models/Company');
const driveService = require('../services/driveService');

// @desc    Obtener datos de la empresa actual
// @route   GET /api/company/me
// @access  Privado
exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener datos de la empresa' });
  }
};

// @desc    Actualizar datos de la empresa (Nombre, Sector, Dirección, Logo)
// @route   PUT /api/company/me
// @access  Privado (Admin/Super Admin)
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    const { name, sector, address } = req.body;
    let updateData = {};
    if (name) updateData.name = name;
    if (sector !== undefined) updateData.sector = sector;
    if (address !== undefined) updateData.address = address;

    // Si se subió un nuevo logo
    if (req.file) {
      if (company.logoFileId) {
        await driveService.deleteFileFromDrive(company.logoFileId);
      }
      const driveFile = await driveService.uploadFileToDrive(req.file);
      updateData.logoFileId = driveFile.id;
      updateData.logoWebViewLink = driveFile.webViewLink;
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.user.company,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedCompany });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
