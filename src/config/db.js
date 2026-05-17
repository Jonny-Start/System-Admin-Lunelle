const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opciones para Mongoose > 6 (no se requieren useNewUrlParser o useUnifiedTopology)
    });
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1); // Detener el proceso si hay error crítico
  }
};

module.exports = connectDB;
