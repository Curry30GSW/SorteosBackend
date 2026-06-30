const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();



app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
        // Log para debug
        const size = (buf.length / 1024 / 1024).toFixed(2);
        console.log(`📦 Payload size: ${size} MB`);
    }
}));
app.use(express.urlencoded({
    extended: true,
    limit: '50mb'
}));

app.use(cookieParser());

// Cors Configuration
app.use(cors({
    origin: [
        "http://srv-bog-tes.coopserp.com/",
        "http://190.66.10.148:10704", "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Content-Length"],
    credentials: true,
    maxAge: 86400
}))

// Middleware para manejar errores de payload muy grande
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'El archivo es demasiado grande. El límite es de 50MB.',
            details: err.message
        });
    }
    next(err);
});

// Rutas
app.use('/api/asociados', require('./routes/asociadoRoutes'));
app.use('/api/sorteos', require('./routes/sorteoRoutes'));
app.use('/api/boletas', require('./routes/boletaRoutes'));
app.use('/api/premios', require('./routes/premioRoutes'));
app.use('/api/boletas-design', require('./routes/boletaDesignRoutes'));
app.use('/api/reportes', require('./routes/reporteRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/emailroutes'));

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