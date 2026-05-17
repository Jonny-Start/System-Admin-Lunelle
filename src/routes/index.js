const express = require('express');
const router = express.Router();

const { googleAuth, logout, getMe } = require('../controllers/authController');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/inventoryController');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { getTags, createTag, updateTag, deleteTag, bulkAssignTag } = require('../controllers/tagController');
const { getCompany, updateCompany } = require('../controllers/companyController');
const { getProviders, createProvider, updateProvider, deleteProvider } = require('../controllers/providerController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { getSales, createSale, getSaleById, deleteSale, getSalesStats } = require('../controllers/saleController');

const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// ----- RUTAS API -----

// Auth
router.post('/api/auth/google', googleAuth);
router.get('/api/auth/logout', logout);
router.get('/api/auth/me', protect, getMe);

// Empresa
router.route('/api/company/me')
  .get(protect, getCompany)
  .put(protect, authorize('Super Admin', 'Administrador'), upload.single('logo'), updateCompany);

// Gestión de Usuarios
router.route('/api/users')
  .get(protect, authorize('Super Admin', 'Administrador'), getUsers)
  .post(protect, authorize('Super Admin', 'Administrador'), createUser);

router.route('/api/users/:id')
  .put(protect, authorize('Super Admin', 'Administrador'), updateUser)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteUser);

// Dashboard Stats
router.get('/api/dashboard/stats', protect, getDashboardStats);

// Inventario
router.route('/api/inventory')
  .get(protect, getProducts)
  .post(protect, upload.single('image'), createProduct);

router.route('/api/inventory/:id')
  .put(protect, upload.single('image'), updateProduct)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteProduct);

// Proveedores
router.route('/api/providers')
  .get(protect, getProviders)
  .post(protect, createProvider);

router.route('/api/providers/:id')
  .put(protect, authorize('Super Admin', 'Administrador'), updateProvider)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteProvider);

// Ventas
router.route('/api/sales')
  .get(protect, getSales)
  .post(protect, createSale);

router.get('/api/sales/stats', protect, getSalesStats);

router.route('/api/sales/:id')
  .get(protect, getSaleById)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteSale);

// Categorías
router.route('/api/categories')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/api/categories/:id')
  .put(protect, authorize('Super Admin', 'Administrador'), updateCategory)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteCategory);

// Etiquetas
router.route('/api/tags')
  .get(protect, getTags)
  .post(protect, createTag);

// Asignación masiva de etiquetas (debe ir ANTES de la ruta /:id)
router.post('/api/tags/bulk-assign', protect, bulkAssignTag);

router.route('/api/tags/:id')
  .put(protect, updateTag)
  .delete(protect, authorize('Super Admin', 'Administrador'), deleteTag);

// Proxy de imágenes de Google Drive (evita bloqueo CORS/redirect del navegador)
const driveService = require('../services/driveService');
router.get('/api/drive-image/:fileId', protect, async (req, res) => {
  try {
    const { stream, mimeType } = await driveService.getFileStream(req.params.fileId);
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24h
    stream.pipe(res);
  } catch (error) {
    console.error('Error proxy imagen Drive:', error.message);
    res.status(404).send('Imagen no encontrada');
  }
});


// ----- RUTAS DE VISTAS (EJS) -----

// Login View
router.get('/login', (req, res) => {
  res.render('login', { clientId: process.env.GOOGLE_CLIENT_ID });
});

// Dashboard (Home)
router.get('/', protect, (req, res) => {
  res.render('pages/dashboard', { 
    user: req.user, 
    currentPage: 'dashboard', 
    pageTitle: 'Dashboard',
    pageScript: 'dashboard'
  });
});

// Productos
router.get('/productos', protect, (req, res) => {
  res.render('pages/productos', { 
    user: req.user, 
    currentPage: 'productos', 
    pageTitle: 'Productos',
    pageScript: 'productos'
  });
});

// Categorías
router.get('/categorias', protect, (req, res) => {
  res.render('pages/categorias', { 
    user: req.user, 
    currentPage: 'categorias', 
    pageTitle: 'Categorías',
    pageScript: 'categorias'
  });
});

// Proveedores
router.get('/proveedores', protect, (req, res) => {
  res.render('pages/proveedores', { 
    user: req.user, 
    currentPage: 'proveedores', 
    pageTitle: 'Proveedores',
    pageScript: 'proveedores'
  });
});

// Ventas
router.get('/ventas', protect, (req, res) => {
  res.render('pages/ventas', { 
    user: req.user, 
    currentPage: 'ventas', 
    pageTitle: 'Ventas',
    pageScript: 'ventas'
  });
});

// Etiquetas
router.get('/etiquetas', protect, (req, res) => {
  res.render('pages/etiquetas', { 
    user: req.user, 
    currentPage: 'etiquetas', 
    pageTitle: 'Etiquetas',
    pageScript: 'etiquetas'
  });
});

// Usuarios
router.get('/usuarios', protect, authorize('Super Admin', 'Administrador'), async (req, res) => {
  await req.user.populate('company');
  res.render('pages/usuarios', { 
    user: req.user, 
    currentPage: 'usuarios', 
    pageTitle: 'Usuarios',
    pageScript: 'usuarios'
  });
});

// Empresa
router.get('/empresa', protect, (req, res) => {
  res.render('pages/empresa', { 
    user: req.user, 
    currentPage: 'empresa', 
    pageTitle: 'Empresa',
    pageScript: 'empresa'
  });
});

module.exports = router;
