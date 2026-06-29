const express = require('express');
const router = express.Router();
const asociadoController = require('../controllers/asociadoController');

router.get('/', asociadoController.getAll);
router.get('/:id', asociadoController.getById);
router.get('/:id/historial', asociadoController.getHistorial);
router.get('/:id/boletas/:sorteoId', asociadoController.getWithBoletas);
router.get('/documento/:documento/boletas/:sorteoId', asociadoController.getWithBoletasByDocument);
router.post('/', asociadoController.create);
router.put('/:id', asociadoController.update);
router.get('/consultar/:token', asociadoController.consultarPorToken);

module.exports = router;