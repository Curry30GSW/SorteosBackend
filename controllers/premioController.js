const Premio = require('../models/PremioModel');
const Sorteo = require('../models/SorteoModel');

exports.getBySorteo = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        
        const premios = await Premio.findBySorteo(sorteoId);
        
        res.json({
            success: true,
            data: premios
        });
    } catch (error) {
        console.error('Error al obtener premios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener premios',
            error: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const premio = await Premio.findById(id);
        
        if (!premio) {
            return res.status(404).json({
                success: false,
                message: 'Premio no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: premio
        });
    } catch (error) {
        console.error('Error al obtener premio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener premio',
            error: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { sorteo_id, titulo, descripcion, orden } = req.body;
        const imagen = req.file ? `/uploads/premios/${req.file.filename}` : null;
        
        // Validaciones
        if (!sorteo_id) {
            return res.status(400).json({
                success: false,
                message: 'El ID del sorteo es requerido'
            });
        }
        
        if (!titulo) {
            return res.status(400).json({
                success: false,
                message: 'El título del premio es requerido'
            });
        }
        
        // Verificar que el sorteo existe
        const sorteo = await Sorteo.findById(sorteo_id);
        if (!sorteo) {
            return res.status(404).json({
                success: false,
                message: 'Sorteo no encontrado'
            });
        }
        
        // Si no se especifica orden, usar el siguiente
        let ordenFinal = orden;
        if (!ordenFinal) {
            const maxOrden = await Premio.getMaxOrden(sorteo_id);
            ordenFinal = maxOrden + 1;
        }
        
        const result = await Premio.create({
            sorteo_id,
            titulo,
            descripcion,
            imagen,
            orden: ordenFinal
        });
        
        res.status(201).json({
            success: true,
            message: 'Premio creado exitosamente',
            data: {
                id: result.id,
                imagen: imagen
            }
        });
    } catch (error) {
        console.error('Error al crear premio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear premio',
            error: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, orden, activo } = req.body;
        const imagen = req.file ? `/uploads/premios/${req.file.filename}` : undefined;
        
        // Verificar que el premio existe
        const premioExistente = await Premio.findById(id);
        if (!premioExistente) {
            return res.status(404).json({
                success: false,
                message: 'Premio no encontrado'
            });
        }
        
        // Si se subió nueva imagen, eliminar la anterior
        if (imagen && premioExistente.imagen) {
            const oldImagePath = path.join(__dirname, '../../public', premioExistente.imagen);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        
        // Construir objeto con datos a actualizar
        const dataToUpdate = {};
        if (titulo !== undefined) dataToUpdate.titulo = titulo;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;
        if (imagen !== undefined) dataToUpdate.imagen = imagen;
        if (orden !== undefined) dataToUpdate.orden = orden;
        if (activo !== undefined) dataToUpdate.activo = activo;
        
        const updated = await Premio.update(id, dataToUpdate);
        
        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el premio'
            });
        }
        
        res.json({
            success: true,
            message: 'Premio actualizado exitosamente',
            data: { imagen }
        });
    } catch (error) {
        console.error('Error al actualizar premio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar premio',
            error: error.message
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        
        const premioExistente = await Premio.findById(id);
        if (!premioExistente) {
            return res.status(404).json({
                success: false,
                message: 'Premio no encontrado'
            });
        }
        
        // Eliminar la imagen física
        if (premioExistente.imagen) {
            const imagePath = path.join(__dirname, '../../public', premioExistente.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        const deleted = await Premio.delete(id);
        
        if (!deleted) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo eliminar el premio'
            });
        }
        
        res.json({
            success: true,
            message: 'Premio eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar premio:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar premio',
            error: error.message
        });
    }
};

exports.reordenar = async (req, res) => {
    try {
        const { sorteoId } = req.params;
        const { ordenes } = req.body; 
        
        if (!ordenes || !Array.isArray(ordenes)) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de órdenes'
            });
        }
        
        // Verificar que todos los premios pertenecen al sorteo
        for (const item of ordenes) {
            const premio = await Premio.findById(item.id);
            if (!premio || premio.sorteo_id !== parseInt(sorteoId)) {
                return res.status(400).json({
                    success: false,
                    message: `Premio ${item.id} no pertenece a este sorteo`
                });
            }
        }
        
        // Actualizar órdenes
        for (const item of ordenes) {
            await Premio.update(item.id, { orden: item.orden });
        }
        
        res.json({
            success: true,
            message: 'Premios reordenados exitosamente'
        });
    } catch (error) {
        console.error('Error al reordenar premios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar premios',
            error: error.message
        });
    }
};