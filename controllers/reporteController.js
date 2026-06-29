const ReporteModel = require('../models/ReporteModel');

// 1. Asociado con más boletas
exports.getTopAsociado = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await ReporteModel.getTopAsociadoByBoletas(sorteoId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Top 10 participantes
exports.getTopParticipantes = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const { limit = 10 } = req.query;
        const result = await ReporteModel.getTopParticipantes(sorteoId, parseInt(limit));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Reporte por asociado
exports.getReportePorAsociado = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await ReporteModel.getReportePorAsociado(sorteoId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Reporte por agencia
exports.getReportePorAgencia = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await ReporteModel.getReportePorAgencia(sorteoId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Últimos ganadores
exports.getUltimosGanadores = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const { limit = 10 } = req.query;
        const result = await ReporteModel.getUltimosGanadores(sorteoId, parseInt(limit));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Estadísticas generales
exports.getEstadisticasGenerales = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await ReporteModel.getEstadisticasGenerales(sorteoId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Distribución por agencia (para chart)
exports.getDistribucionPorAgencia = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const result = await ReporteModel.getDistribucionPorAgencia(sorteoId);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};