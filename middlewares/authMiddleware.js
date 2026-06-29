const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Obtener token de cookies o headers
    const token = req.cookies?.access_token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No autenticado. Token no proporcionado.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret_access_key');

        // Agregar usuario a la request
        req.user = {
            id_usuario: decoded.id_usuario,
            usuario: decoded.usuario,
            nombre: decoded.nombre,
            rol: decoded.rol
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Sesión expirada. Por favor inicie sesión nuevamente.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar rol de administrador
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.rol !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de administrador.'
        });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };