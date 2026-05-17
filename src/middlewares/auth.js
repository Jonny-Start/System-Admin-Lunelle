const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Proteger rutas
exports.protect = async (req, res, next) => {
  let token;

  // Verificar si hay token en cookies
  if (req.cookies.token && req.cookies.token !== 'none') {
    token = req.cookies.token;
  }

  if (!token) {
    // Si la ruta es para vistas (GET), redirigir al login
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ success: false, error: 'No autorizado para acceder a esta ruta' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.redirect('/login');
      }
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.redirect('/login');
      }
      return res.status(403).json({ success: false, error: 'Su cuenta ha sido desactivada' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ success: false, error: 'No autorizado para acceder a esta ruta' });
  }
};

// Conceder acceso a roles específicos
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `El rol ${req.user.role} no está autorizado para acceder a esta ruta` 
      });
    }
    next();
  };
};
