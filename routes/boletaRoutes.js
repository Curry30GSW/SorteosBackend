const express = require('express');
const router = express.Router();
const boletaController = require('../controllers/boletaController');

router.get('/sorteo/:sorteoId', boletaController.getBySorteo);
router.get('/asociado/:asociadoId', boletaController.getByAsociado);
router.post('/asignar', boletaController.asignarManual);
router.get('/verificar/:sorteoId/:numero', boletaController.verificarDisponibilidad);

router.delete('/sorteo/:sorteoId/boleta/:boletaId', boletaController.eliminarBoleta);
router.delete('/sorteo/:sorteoId/asociado/:asociadoId', boletaController.eliminarBoletasPorAsociado);

module.exports = router;