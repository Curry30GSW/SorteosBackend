const Asociado = require('../models/AsociadosModel');
const { validateAsociado } = require('../utils/validators');

exports.getAll = async (req, res) => {
    try {
        const asociados = await Asociado.findAll();
        res.json({
            success: true,
            data: asociados
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener asociados',
            error: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const asociado = await Asociado.findById(id);
        
        if (!asociado) {
            return res.status(404).json({
                success: false,
                message: 'Asociado no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: asociado
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener asociado',
            error: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const error = validateAsociado(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error
            });
        }

        // Verificar si ya existe
        const existe = await Asociado.findByDocument(req.body.documento);
        if (existe) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un asociado con este documento'
            });
        }

        const result = await Asociado.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Asociado creado exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear asociado',
            error: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Asociado.update(id, req.body);
        
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Asociado no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Asociado actualizado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar asociado',
            error: error.message
        });
    }
};

exports.getHistorial = async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await Asociado.getHistorial(id);
        
        res.json({
            success: true,
            data: historial
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener historial',
            error: error.message
        });
    }
};

exports.consultarPorToken = async (req, res) => {
    try {
        const { token } = req.params;
        const asociado = await Asociado.findByToken(token);
        
        if (!asociado) {
            return res.status(404).json({
                success: false,
                message: 'Token inválido'
            });
        }
        
        const historial = await Asociado.getHistorial(asociado.id);
        
        res.json({
            success: true,
            data: {
                asociado: {
                    nombres: asociado.nombres,
                    apellidos: asociado.apellidos,
                    documento: asociado.documento
                },
                historial
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al consultar historial',
            error: error.message
        });
    }
};

exports.getWithBoletas = async (req, res) => {
    try {
        const { id, sorteoId } = req.params;
        
        const asociado = await Asociado.getWithBoletas(id, sorteoId);
        
        if (!asociado) {
            return res.status(404).json({
                success: false,
                message: 'Asociado no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: asociado
        });
    } catch (error) {
        console.error('Error al obtener asociado con boletas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asociado',
            error: error.message
        });
    }
};

exports.getWithBoletasByDocument = async (req, res) => {
    try {
        const { documento, sorteoId } = req.params;
        
        const asociado = await Asociado.getWithBoletasByDocument(documento, sorteoId);
        
        if (!asociado) {
            return res.status(404).json({
                success: false,
                message: 'Asociado no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: asociado
        });
    } catch (error) {
        console.error('Error al obtener asociado por documento:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener asociado',
            error: error.message
        });
    }
};