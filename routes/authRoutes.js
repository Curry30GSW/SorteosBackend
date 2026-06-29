const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// Rutas protegidas (requieren autenticación)
router.get('/current-user', authMiddleware, authController.getCurrentUser);
router.get('/check-auth', authController.checkAuth);

// Rutas admin (requieren autenticación y rol admin)
router.get('/usuarios', authMiddleware, authController.getUsuarios);
router.post('/usuarios', authMiddleware, authController.createUsuario);
router.put('/usuarios/:id', authMiddleware, authController.updateUsuario);

module.exports = router;