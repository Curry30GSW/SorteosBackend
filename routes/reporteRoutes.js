const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');

router.get('/sorteo/:sorteoId/top-asociado', reporteController.getTopAsociado);
router.get('/sorteo/:sorteoId/top-participantes', reporteController.getTopParticipantes);
router.get('/sorteo/:sorteoId/reporte-asociados', reporteController.getReportePorAsociado);
router.get('/sorteo/:sorteoId/reporte-agencias', reporteController.getReportePorAgencia);
router.get('/sorteo/:sorteoId/ultimos-ganadores', reporteController.getUltimosGanadores);
router.get('/sorteo/:sorteoId/estadisticas', reporteController.getEstadisticasGenerales);
router.get('/sorteo/:sorteoId/distribucion-agencias', reporteController.getDistribucionPorAgencia);

module.exports = router;