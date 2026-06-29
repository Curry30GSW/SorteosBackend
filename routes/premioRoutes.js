const express = require('express');
const router = express.Router();
const premioController = require('../controllers/premioController');
const upload = require('../middlewares/uploadImage');

// Obtener premios de un sorteo
router.get('/sorteo/:sorteoId', premioController.getBySorteo);

// Obtener un premio por ID
router.get('/:id', premioController.getById);

// Crear un premio con imagen
router.post('/', upload.single('imagen'), premioController.create);

// Actualizar un premio con imagen
router.put('/:id', upload.single('imagen'), premioController.update);

// Eliminar un premio
router.delete('/:id', premioController.delete);

// Reordenar premios
router.put('/sorteo/:sorteoId/reordenar', premioController.reordenar);

module.exports = router;