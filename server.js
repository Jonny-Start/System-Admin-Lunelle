const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const engine = require('ejs-mate');
const connectDB = require('./src/config/db');
const routes = require('./src/routes');

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación Express
const app = express();

// Conectar a la base de datos MongoDB
connectDB();

// Motor de plantillas EJS con soporte de layouts (ejs-mate)
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Middleware de Seguridad (Helmet)
// Se deshabilitan algunas directivas para permitir CDN de Tailwind, Alpine, etc., si es necesario, 
// pero manteniendo un buen nivel de seguridad base.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
}));

// Middlewares estándar
app.use(express.json()); // Parsear JSON
app.use(express.urlencoded({ extended: true })); // Parsear URL-encoded (formularios)
app.use(cookieParser()); // Parsear Cookies

// Servir archivos estáticos ANTES del rate limiter (no cuentan como peticiones)
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting para evitar ataques de fuerza bruta (solo rutas dinámicas)
// En desarrollo se desactiva para evitar bloqueos por reinicios de nodemon
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 0 : 500, // 0 = sin límite en dev
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.',
  skip: () => process.env.NODE_ENV === 'development', // Saltar en desarrollo
});
app.use(limiter);

// Montar Rutas
app.use('/', routes);

// Manejo de errores globales 
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal! Estamos trabajando para solucionarlo.');
});

// Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV || 'development'} en el puerto ${PORT}`);
});