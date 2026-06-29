const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Cors Configuration
app.use(cors({
    origin: [
        "http://srv-bog-tes.coopserp.com/",
        "http://190.66.10.148:10704", "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}))


// Rutas
app.use('/api/asociados', require('./routes/asociadoRoutes'));
app.use('/api/sorteos', require('./routes/sorteoRoutes'));
app.use('/api/boletas', require('./routes/boletaRoutes'));
app.use('/api/premios', require('./routes/premioRoutes'));
app.use('/api/boletas-design', require('./routes/boletaDesignRoutes'));
app.use('/api/reportes', require('./routes/reporteRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API de sorteos funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Servir archivos estáticos (imágenes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 API de Sorteos - ${new Date().toISOString()}`);
    console.log(`✅ Listo para usar`);
});

// Manejo de errores
app.use(require('./middlewares/errorHandler'));

module.exports = app;