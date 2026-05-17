const User = require('../models/User');

// @desc    Obtener todos los usuarios de la empresa
// @route   GET /api/users
// @access  Privado (Super Admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ company: req.user.company })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
};

// @desc    Crear un nuevo usuario dentro de la empresa
// @route   POST /api/users
// @access  Privado (Super Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Por favor, ingrese email y rol' 
      });
    }

    const displayName = name || email.split('@')[0];

    // Validar que el rol sea válido (no puede asignar Super Admin)
    const allowedRoles = ['Administrador', 'Empleado'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rol no válido. Los roles permitidos son: Administrador, Empleado' 
      });
    }

    // Verificar si el email ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'El correo electrónico ya está registrado' });
    }

    // Crear usuario
    const user = await User.create({
      name: displayName,
      email,
      role,
      company: req.user.company,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Actualizar usuario (rol, estado, nombre)
// @route   PUT /api/users/:id
// @access  Privado (Super Admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, role, isActive } = req.body;
    const userId = req.params.id;

    // No permitir editarse a sí mismo en esta ruta (excepto si es para cambiar nombre, pero NO rol)
    // Pero según requerimiento: "en la edicion el creador no puede quitarse el rol de Super Admin"
    // Esto implica que tal vez SÍ me puedo editar a mí mismo, pero no el rol.
    // O tal vez la regla es que nadie le puede quitar el Super Admin.
    const user = await User.findOne({ _id: userId, company: req.user.company });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (req.user.role === 'Administrador' && user.role === 'Super Admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'No tiene permisos para modificar a un Super Admin' 
      });
    }

    if (userId === req.user._id.toString() && role && role !== 'Super Admin') {
      return res.status(400).json({ 
        success: false, 
        error: 'No puede quitarse el rol de Super Admin a sí mismo' 
      });
    }

    if (user.role === 'Super Admin' && role && role !== 'Super Admin' && userId !== req.user._id.toString()) {
       return res.status(400).json({ 
        success: false, 
        error: 'No puede cambiar el rol de otro Super Admin' 
      });
    }



    // Validar rol si se envía
    if (role && user.role !== 'Super Admin') {
      const allowedRoles = ['Administrador', 'Empleado'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Rol no válido' 
        });
      }
      user.role = role;
    } else if (role === 'Super Admin' && user.role === 'Super Admin') {
      // Allowed to keep it as Super Admin
      user.role = role;
    }

    if (name) user.name = name;
    
    if (typeof isActive === 'boolean') {
      // Si se está reactivando (de Inactivo a Activo)
      if (isActive === true && user.isActive === false) {
        user.googleId = undefined;
        user.picture = undefined;
      }
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Eliminar (desactivar) usuario
// @route   DELETE /api/users/:id
// @access  Privado (Super Admin)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        error: 'No puede eliminar su propio usuario' 
      });
    }

    const user = await User.findOne({ _id: userId, company: req.user.company });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (req.user.role === 'Administrador' && user.role === 'Super Admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'No tiene permisos para desactivar a un Super Admin' 
      });
    }

    // Soft delete - desactivar
    user.isActive = false;
    await user.save();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
