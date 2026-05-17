const User = require('../models/User');
const Company = require('../models/Company');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generar Token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, company: user.company },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

const sendTokenResponse = (user, statusCode, res, extras = {}) => {
  const token = generateToken(user);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    httpOnly: true, // Accesible solo por web server
    secure: process.env.NODE_ENV === 'production' // Solo HTTPS en producción
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        picture: user.picture
      },
      ...extras
    });
};

// @desc    Autenticar con Google (Login / Registro)
// @route   POST /api/auth/google
// @access  Público
exports.googleAuth = async (req, res) => {
  try {
    const { credential, companyName } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, error: 'Token de Google requerido' });
    }

    // Verificar token de Google
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    // Buscar si el usuario ya existe
    let user = await User.findOne({ email });

    if (!user) {
      // Si el usuario no existe y no hay nombre de empresa, solicitarlo
      if (!companyName) {
        return res.status(200).json({ 
          success: false, 
          requiresRegistration: true, 
          user: { name, email, picture } 
        });
      }

      const mongoose = require('mongoose');
      const companyId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      // Crear empresa
      const company = await Company.create({
        _id: companyId,
        name: companyName,
        owner: userId
      });

      // Crear nuevo usuario (Super Admin)
      user = await User.create({
        _id: userId,
        name,
        email,
        googleId,
        picture,
        role: 'Super Admin',
        company: companyId
      });
      
      return sendTokenResponse(user, 201, res);
    } else {
      // Usuario existe, actualizar googleId y picture si es necesario
      if (!user.googleId) {
        if (req.body.acceptInvitation) {
          user.googleId = googleId;
          user.picture = picture;
          // Update name from Google profile if they were invited without a name
          if (name) user.name = name;
          await user.save();
        } else if (req.body.rejectInvitation) {
          await User.deleteOne({ _id: user._id });
          return res.status(200).json({ 
            success: false, 
            requiresRegistration: true, 
            user: { name, email, picture } 
          });
        } else {
          await user.populate('company', 'name');
          return res.status(200).json({
            success: false,
            requiresInvitationAcceptance: true,
            invitation: {
              companyName: user.company.name,
              role: user.role
            },
            user: { name, email, picture }
          });
        }
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(403).json({ success: false, error: 'Su cuenta ha sido desactivada. Contacte al administrador.' });
      }

      return sendTokenResponse(user, 200, res);
    }
  } catch (error) {
    console.error('Error in Google Auth:', error);
    res.status(400).json({ success: false, error: 'Fallo al autenticar con Google' });
  }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Privado
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('company', 'name');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Cerrar sesión / Limpiar cookie
// @route   GET /api/auth/logout
// @access  Privado
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({ success: true, data: {} });
};
