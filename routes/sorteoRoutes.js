const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const sorteoController = require('../controllers/sorteoController');


router.get('/', sorteoController.getAll);
router.post('/', sorteoController.create);
router.post('/importar-asociados', upload.single('file'), sorteoController.importarAsociados); // ← ANTES de /:id

router.post('/:id/asignar-participante', sorteoController.asignarParticipante);
router.post('/:id/asignar-participante-manual', sorteoController.asignarParticipanteManual);
router.post('/:id/finalizar-multiple', sorteoController.finalizarSorteoMultiple);

router.get('/:id/with-premios', sorteoController.getWithPremios);
router.get('/:id', sorteoController.getById);
router.put('/:id', sorteoController.update);
router.post('/:id/generar-boletas', sorteoController.generarBoletas);
router.post('/:id/iniciar', sorteoController.iniciarSorteo);
router.post('/:id/finalizar', sorteoController.finalizarSorteo);
router.post('/:id/cancelar', sorteoController.cancelarSorteo);
router.post('/:id/realizar', sorteoController.realizarSorteo);
router.get('/:id/ganadores', sorteoController.getGanadores);
router.get('/:id/estadisticas', sorteoController.getEstadisticas);

module.exports = router;