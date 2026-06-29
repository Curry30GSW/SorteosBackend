const axios = require('axios');
const jwt = require('jsonwebtoken');
const loginModel = require('../models/loginModel');

// Almacenamiento temporal de intentos fallidos (en producción usar Redis)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 3;
const BLOCK_TIME = 5 * 60 * 1000; // 5 minutos

const authController = {
    // Iniciar sesión
    login: async (req, res) => {
        const { user, password, captcha } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

        if (!user || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // 🔐 Verificar captcha (opcional, comentar si no se usa)
        if (captcha) {
            try {
                const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;
                const captchaVerifyResponse = await axios.post(verifyURL);
                if (!captchaVerifyResponse.data.success) {
                    return res.status(403).json({
                        success: false,
                        message: 'Falló la verificación del CAPTCHA'
                    });
                }
            } catch (error) {
                console.error('Error verificando captcha:', error);
            }
        }

        // 🔒 Control de intentos fallidos
        const attempt = loginAttempts.get(user);
        if (attempt && attempt.count >= MAX_ATTEMPTS) {
            const timePassed = Date.now() - attempt.lastAttempt;
            if (timePassed < BLOCK_TIME) {
                const timeLeft = Math.ceil((BLOCK_TIME - timePassed) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Demasiados intentos fallidos. Intenta nuevamente en ${timeLeft} segundos.`
                });
            }
            loginAttempts.delete(user);
        }

        // Validar credenciales
        const usuarioValido = await loginModel.validateLogin(user, password);

        if (!usuarioValido) {
            // Registrar intento fallido
            loginAttempts.set(user, {
                count: (attempt?.count || 0) + 1,
                lastAttempt: Date.now()
            });

            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // ✅ Login exitoso - limpiar intentos
        loginAttempts.delete(user);

        // 🔑 Generar tokens JWT
        const accessToken = jwt.sign(
            {
                id_usuario: usuarioValido.id_usuario,
                usuario: usuarioValido.usuario,
                nombre: usuarioValido.nombre,
                rol: usuarioValido.rol
            },
            process.env.JWT_ACCESS_SECRET || 'secret_access_key',
            { expiresIn: '2h' }
        );

        const refreshToken = jwt.sign(
            {
                id_usuario: usuarioValido.id_usuario,
                usuario: usuarioValido.usuario
            },
            process.env.JWT_REFRESH_SECRET || 'secret_refresh_key',
            { expiresIn: '7d' }
        );



        // 🍪 Configurar cookies HttpOnly
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000, // 2 horas
            path: '/'
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
            path: '/'
        });

        // Cookie no HttpOnly para saber el usuario en frontend
        res.cookie('usuario', usuarioValido.usuario, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000,
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: usuarioValido.usuario,
                nombre: usuarioValido.nombre,
                rol: usuarioValido.rol
            }
        });
    },

    // Cerrar sesión
    logout: async (req, res) => {
        // Limpiar cookies
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.clearCookie('usuario', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        return res.status(200).json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    },

    // Refrescar token
    refreshToken: async (req, res) => {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'No hay token de refresco'
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'secret_refresh_key');

            // Verificar que el usuario aún existe y está activo
            const usuario = await loginModel.getByUsuario(decoded.usuario);

            if (!usuario) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado o inactivo'
                });
            }

            // Generar nuevo access token
            const newAccessToken = jwt.sign(
                {
                    id_usuario: usuario.id_usuario,
                    usuario: usuario.usuario,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                },
                process.env.JWT_ACCESS_SECRET || 'secret_access_key',
                { expiresIn: '2h' }
            );


            res.cookie('access_token', newAccessToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000,
                path: '/'
            });

            res.cookie('usuario', usuario.usuario, {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000,
                path: '/'
            });

            return res.status(200).json({
                success: true,
                message: 'Token refrescado exitosamente'
            });

        } catch (error) {
            console.error('Error refrescando token:', error);
            return res.status(401).json({
                success: false,
                message: 'Token de refresco inválido o expirado'
            });
        }
    },

    // Obtener información del usuario autenticado
    getCurrentUser: async (req, res) => {
        try {
            const token = req.cookies.access_token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No autenticado'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret_access_key');

            const usuario = await loginModel.getByUsuario(decoded.usuario);

            if (!usuario) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            return res.status(200).json({
                success: true,
                data: usuario
            });

        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }
    },

    // Verificar si el usuario está autenticado
    checkAuth: async (req, res) => {
        try {
            const token = req.cookies.access_token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    message: 'No autenticado'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret_access_key');

            const usuario = await loginModel.getByUsuario(decoded.usuario);

            if (!usuario) {
                return res.status(401).json({
                    success: false,
                    authenticated: false,
                    message: 'Usuario no encontrado'
                });
            }

            return res.status(200).json({
                success: true,
                authenticated: true,
                data: usuario
            });

        } catch (error) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: 'Token inválido o expirado'
            });
        }
    },

    // CRUD Usuarios (solo admin)
    getUsuarios: async (req, res) => {
        try {
            const usuarios = await loginModel.getAll();
            res.json({
                success: true,
                data: usuarios
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    createUsuario: async (req, res) => {
        try {
            const { nombre, usuario, contraseña, rol, activo } = req.body;

            if (!nombre || !usuario || !contraseña || !rol) {
                return res.status(400).json({
                    success: false,
                    message: 'Nombre, usuario, contraseña y rol son requeridos'
                });
            }

            const result = await loginModel.create({
                nombre,
                usuario,
                contraseña,
                rol,
                activo
            });

            res.status(201).json({
                success: true,
                message: 'Usuario creado exitosamente',
                data: result
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    updateUsuario: async (req, res) => {
        try {
            const { id } = req.params;
            const { nombre, rol, activo, contraseña } = req.body;

            const result = await loginModel.update(id, {
                nombre,
                rol,
                activo,
                contraseña
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado o sin cambios'
                });
            }

            res.json({
                success: true,
                message: 'Usuario actualizado exitosamente'
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = authController;