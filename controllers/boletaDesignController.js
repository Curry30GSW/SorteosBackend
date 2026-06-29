const BoletaDesign = require('../models/BoletaDesignModel');

exports.getBySorteo = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const design = await BoletaDesign.findBySorteo(sorteoId);
        res.json({ success: true, data: design });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener diseño', error: error.message });
    }
};

exports.upsert = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await BoletaDesign.upsert(sorteoId, req.body);
        res.json({ success: true, message: 'Diseño guardado exitosamente', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al guardar diseño', error: error.message });
    }
};