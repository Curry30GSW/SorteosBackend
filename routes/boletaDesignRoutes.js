const express = require('express');
const router = express.Router();
const boletaDesignController = require('../controllers/boletaDesignController');

router.get('/:sorteoId', boletaDesignController.getBySorteo);
router.post('/:sorteoId', boletaDesignController.upsert);

module.exports = router;