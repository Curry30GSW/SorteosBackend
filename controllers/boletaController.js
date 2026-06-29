const Boleta = require('../models/BoletaModel');
const Asociado = require('../models/AsociadosModel');
const Sorteo = require('../models/SorteoModel');

exports.getBySorteo = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const boletas = await Boleta.findBySorteo(sorteoId);
        
        res.json({
            success: true,
            data: boletas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener boletas',
            error: error.message
        });
    }
};

exports.getByAsociado = async (req, res) => {
    try {
        const { asociadoId } = req.params;
        const boletas = await Boleta.findByAsociado(asociadoId);
        
        res.json({
            success: true,
            data: boletas
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener boletas del asociado',
            error: error.message
        });
    }
};

exports.asignarManual = async (req, res) => {
    try {
        const { sorteoId, asociadoId, numero } = req.body;
        
        // Validaciones
        if (!sorteoId || !asociadoId || numero === undefined) {
            return res.status(400).json({
                success: false,
                message: 'sorteoId, asociadoId y numero son requeridos'
            });
        }
        
        // Verificar que el número esté en rango
        if (numero < 0 || numero > 9999) {
            return res.status(400).json({
                success: false,
                message: 'El número debe estar entre 0 y 9999'
            });
        }
        
        // Verificar sorteo
        const sorteo = await Sorteo.findById(sorteoId);
        if (!sorteo) {
            return res.status(404).json({
                success: false,
                message: 'Sorteo no encontrado'
            });
        }
        
        // Verificar asociado
        const asociado = await Asociado.findById(asociadoId);
        if (!asociado) {
            return res.status(404).json({
                success: false,
                message: 'Asociado no encontrado'
            });
        }
        
        const result = await Boleta.asignarManual(sorteoId, asociadoId, numero);
        
        res.status(201).json({
            success: true,
            message: 'Boleta asignada exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al asignar boleta',
            error: error.message
        });
    }
};

exports.verificarDisponibilidad = async (req, res) => {
    try {
        const { sorteoId, numero } = req.params;
        
        const disponible = await Boleta.verificarDisponibilidad(sorteoId, numero);
        
        res.json({
            success: true,
            data: {
                disponible,
                numero,
                sorteoId
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al verificar disponibilidad',
            error: error.message
        });
    }
};

exports.eliminarBoleta = async (req, res) => {
    try {
        const { sorteoId, boletaId } = req.params;

        const eliminado = await Boleta.eliminarBoleta(sorteoId, boletaId);

        res.json({
            success: true,
            message: 'Boleta eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar boleta:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al eliminar boleta'
        });
    }
};


exports.eliminarBoletasPorAsociado = async (req, res) => {
    try {
        const { sorteoId, asociadoId } = req.params;

        const result = await Boleta.eliminarBoletasPorAsociado(sorteoId, asociadoId);

        res.json({
            success: true,
            message: `Se eliminaron ${result.eliminadas} boletas del asociado`,
            data: result
        });
    } catch (error) {
        console.error('Error al eliminar boletas del asociado:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al eliminar boletas del asociado'
        });
    }
};