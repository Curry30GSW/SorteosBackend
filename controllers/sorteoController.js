const pool = require('../config/ConectDb'); 
const Sorteo = require('../models/SorteoModel');
const Boleta = require('../models/BoletaModel');
const Premio = require('../models/PremioModel');
const HistorialGanador = require('../models/HistorialGanadorModel');
const XLSX = require('xlsx');

exports.getAll = async (req, res) => {
    try {
        const sorteos = await Sorteo.findAll();
        res.json({ success: true, data: sorteos });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener sorteos', error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const sorteo = await Sorteo.findById(id);
        
        if (!sorteo) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        const estadisticas = await Sorteo.getEstadisticas(id);
        const premios = await Premio.findBySorteo(id);
        
        res.json({ success: true, data: { ...sorteo, estadisticas, premios } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener sorteo', error: error.message });
    }
};

exports.getWithPremios = async (req, res) => {
    try {
        const { id } = req.params;
        const sorteo = await Sorteo.findWithPremios(id);
        
        if (!sorteo) {
            return res.status(404).json({
                success: false,
                message: 'Sorteo no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: sorteo
        });
    } catch (error) {
        console.error('Error al obtener sorteo con premios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener sorteo',
            error: error.message
        });
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, fecha_sorteo } = req.body;
        
        if (!nombre || !fecha_sorteo) {
            return res.status(400).json({ success: false, message: 'Nombre y fecha del sorteo son requeridos' });
        }
        
        const result = await Sorteo.create(req.body);
        res.status(201).json({ success: true, message: 'Sorteo creado exitosamente', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear sorteo', error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Sorteo.update(id, req.body);
        
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        res.json({ success: true, message: 'Sorteo actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar sorteo', error: error.message });
    }
};

exports.generarBoletas = async (req, res) => {
    try {
        const { id } = req.params;
        const { boletas_por_persona } = req.body;
        
        const sorteo = await Sorteo.findById(id);
        if (!sorteo) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        if (sorteo.estado !== 'programado') {
            return res.status(400).json({ success: false, message: 'Solo se pueden generar boletas para sorteos programados' });
        }
        
        const result = await Boleta.generarBoletas(id, boletas_por_persona || sorteo.boletas_por_persona);
        res.json({ success: true, message: 'Boletas generadas exitosamente', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar boletas', error: error.message });
    }
};

exports.realizarSorteo = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params;
        const { numero_ganador, premio_id, soporte_ganador } = req.body;
        
        if (!numero_ganador) {
            return res.status(400).json({
                success: false,
                message: 'El número ganador es requerido'
            });
        }
        
        await connection.beginTransaction();
        
        // Verificar sorteo
        const sorteo = await Sorteo.findById(id);
        if (!sorteo) {
            throw new Error('Sorteo no encontrado');
        }
        
        if (sorteo.estado !== 'programado') {
            throw new Error('El sorteo ya fue realizado o cancelado');
        }
        
        // Verificar que la boleta existe
        const [boleta] = await connection.query(
            'SELECT * FROM boletas WHERE sorteo_id = ? AND numero = ?',
            [id, numero_ganador]
        );
        
        if (boleta.length === 0) {
            throw new Error(`No se encontró la boleta #${String(numero_ganador).padStart(4, '0')}`);
        }
        
        // Marcar boleta ganadora
        await Boleta.marcarGanadora(id, numero_ganador);
        
        // ✅ Asignar premio si se especificó
        if (premio_id) {
            await connection.query(
                'UPDATE premios SET boleta_ganadora_id = ? WHERE id = ? AND sorteo_id = ?',
                [boleta[0].id, premio_id, id]
            );
        }
        
        // Actualizar sorteo
        await Sorteo.update(id, {
            estado: 'finalizado',
            numero_ganador: numero_ganador,
            soporte_ganador: soporte_ganador || null
        });
        
        // Registrar en historial
        await HistorialGanador.registrarGanadores(id);
        
        await connection.commit();
        
        // Obtener ganadores
        const ganadores = await Sorteo.getGanadores(id);
        
        res.json({
            success: true,
            message: 'Sorteo realizado exitosamente',
            data: {
                numero_ganador,
                ganadores
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al realizar sorteo:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al realizar sorteo',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.getGanadores = async (req, res) => {
    try {
        const { id } = req.params;
        const ganadores = await Sorteo.getGanadores(id);
        res.json({ success: true, data: ganadores });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener ganadores', error: error.message });
    }
};

exports.getEstadisticas = async (req, res) => {
    try {
        const { id } = req.params;
        const estadisticas = await Sorteo.getEstadisticas(id);
        res.json({ success: true, data: estadisticas });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
    }
};

exports.importarAsociados = async (req, res) => {
    let connection;
    
    try {
        const { sorteoId } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
        }
        
        if (!sorteoId) {
            return res.status(400).json({ success: false, message: 'El ID del sorteo es requerido' });
        }
        
        const sorteo = await Sorteo.findById(sorteoId);
        if (!sorteo) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        if (sorteo.estado !== 'programado') {
            return res.status(400).json({ success: false, message: 'Solo se pueden importar asociados a sorteos en estado "programado"' });
        }
        
        // Leer Excel
        let data;
        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            data = XLSX.utils.sheet_to_json(worksheet);
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Error al leer el archivo. Asegúrate de que sea un Excel válido.', error: error.message });
        }
        
        if (data.length === 0) {
            return res.status(400).json({ success: false, message: 'El archivo está vacío o no tiene el formato correcto' });
        }
        
        // Normalizar columnas
        const columnasNormalizadas = Object.keys(data[0]).reduce((acc, key) => {
            const normalized = key.toLowerCase().trim().replace(/\s+/g, '_');
            acc[normalized] = key;
            return acc;
        }, {});

        // Validar columnas obligatorias
        const tieneDocumento = Object.keys(columnasNormalizadas).some(k => ['documento', 'cedula', 'identificacion'].includes(k));
        const tieneNombres   = Object.keys(columnasNormalizadas).some(k => ['nombres', 'nombre', 'nombres_completos'].includes(k));
        const tieneBoletas   = Object.keys(columnasNormalizadas).some(k => ['boletas_por_persona', 'cant_boletas', 'boletas', 'cantidad_boletas'].includes(k));
        
        if (!tieneDocumento) {
            return res.status(400).json({ success: false, message: 'El archivo debe tener una columna llamada "documento", "cedula" o "identificacion"' });
        }
        if (!tieneNombres) {
            return res.status(400).json({ success: false, message: 'El archivo debe tener una columna llamada "nombres", "nombre" o "nombres_completos"' });
        }
        if (!tieneBoletas) {
            return res.status(400).json({ success: false, message: 'El archivo debe tener una columna llamada "boletas_por_persona", "cant_boletas", "cantidad_boletas" o "boletas"' });
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        let registrosNuevos = 0;
        let registrosActualizados = 0;
        let errores = [];
        const boletasPorAsociado = [];
        
        for (let index = 0; index < data.length; index++) {
            const row = data[index];
            const rowNumber = index + 2;
            
            try {
                let documento = null, nombres = null, apellidos = '', email = null;
                let telefono = null, whatsapp = null, cuenta = null, boletasPorPersona = 0;
                let agencia = '', nomina = '', coordinador = '', dependencia = '';
                
                Object.keys(columnasNormalizadas).forEach(key => {
                    const value = row[columnasNormalizadas[key]];
                    
                    if (['documento', 'cedula', 'identificacion'].includes(key)) {
                        documento = value?.toString().trim();
                    } else if (['nombres', 'nombre', 'nombres_completos'].includes(key)) {
                        nombres = value?.toString().trim();
                    } else if (key === 'apellidos') {
                        apellidos = value?.toString().trim() || '';
                    } else if (key === 'email') {
                        email = value?.toString().trim() || null;
                    } else if (key === 'telefono') {
                        telefono = value?.toString().trim() || null;
                    } else if (key === 'whatsapp') {
                        whatsapp = value?.toString().trim() || null;
                    } else if (key === 'cuenta') {
                        cuenta = value?.toString().trim() || null;
                    } else if (['boletas_por_persona', 'cant_boletas', 'boletas', 'cantidad_boletas'].includes(key)) {
                        boletasPorPersona = parseInt(value) || 0;
                    } else if (key === 'agencia') {
                        agencia = value?.toString().trim() || '';
                    } else if (key === 'nomina') {
                        nomina = value?.toString().trim() || '';
                    } else if (key === 'coordinador') {
                        coordinador = value?.toString().trim() || '';
                    } else if (key === 'dependencia') {
                        dependencia = value?.toString().trim() || '';
                    }
                });
                
                if (!documento) { errores.push(`Fila ${rowNumber}: Documento es obligatorio`); continue; }
                if (!nombres)   { errores.push(`Fila ${rowNumber}: Nombres es obligatorio`); continue; }
                if (boletasPorPersona <= 0) { errores.push(`Fila ${rowNumber}: Cantidad de boletas debe ser mayor a 0`); continue; }
                
                const [asociadoExistente] = await connection.query(
                    'SELECT * FROM asociados WHERE documento = ?', [documento]
                );
                
                let asociadoId, token, cantidadActual = 0;
                
                if (asociadoExistente.length > 0) {
                    const asociado = asociadoExistente[0];
                    asociadoId = asociado.id;
                    token = asociado.token_consulta;
                    cantidadActual = asociado.cantidad_boletas || 0;
                    
                    // ✅ ACTUALIZAR: Sumar la nueva cantidad a la existente
                    const nuevaCantidad = cantidadActual + boletasPorPersona;
                    
                    await connection.query(
                        `UPDATE asociados 
                         SET nombres = ?, apellidos = ?, email = ?, telefono = ?,
                             whatsapp = ?, cuenta = ?, agencia = ?, nomina = ?,
                             coordinador = ?, dependencia = ?,
                             cantidad_boletas = ?
                         WHERE documento = ?`,
                        [nombres, apellidos, email, telefono, whatsapp, cuenta,
                         agencia, nomina, coordinador, dependencia, nuevaCantidad, documento]
                    );
                    registrosActualizados++;
       
                } else {
                    // ✅ CREAR NUEVO: Inicia con la cantidad del Excel
                    token = require('crypto').randomBytes(48).toString('base64url');
                    const [result] = await connection.query(
                        `INSERT INTO asociados 
                         (documento, nombres, apellidos, email, telefono, whatsapp,
                          cuenta, agencia, nomina, coordinador, dependencia, 
                          token_consulta, cantidad_boletas)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [documento, nombres, apellidos, email, telefono, whatsapp,
                         cuenta, agencia, nomina, coordinador, dependencia, token, boletasPorPersona]
                    );
                    asociadoId = result.insertId;
                    registrosNuevos++;
                }
                
                // ✅ Guardar para generar boletas (con la cantidad TOTAL que debe tener)
                // IMPORTANTE: Para los nuevos, la cantidad es boletasPorPersona
                // Para los existentes, es la cantidad TOTAL acumulada
                const [asociadoFinal] = await connection.query(
                    'SELECT cantidad_boletas FROM asociados WHERE id = ?', [asociadoId]
                );
                const cantidadTotal = asociadoFinal[0].cantidad_boletas;
                
                boletasPorAsociado.push({ 
                    asociadoId, 
                    cantidad: cantidadTotal, 
                    documento, 
                    token 
                });
                
            } catch (error) {
                errores.push(`Fila ${rowNumber}: ${error.message}`);
                console.error(`❌ Error en fila ${rowNumber}:`, error.message);
            }
        }
        
        // ✅ GENERAR BOLETAS: Por cada asociado, asegurar que tenga EXACTAMENTE la cantidad_total
        const { numero_inicio, numero_fin } = sorteo;
        let totalBoletasGeneradas = 0;
        
        for (const item of boletasPorAsociado) {
            // Verificar cuántas boletas tiene YA este asociado en este sorteo
            const [boletasExistentes] = await connection.query(
                'SELECT COUNT(*) as total FROM boletas WHERE sorteo_id = ? AND asociado_id = ?',
                [sorteoId, item.asociadoId]
            );
            
            const boletasYaTiene = boletasExistentes[0].total;
            
            // ✅ Si ya tiene exactamente la cantidad que debe tener, continuar
            if (boletasYaTiene >= item.cantidad) {
                continue;
            }
            
            // ✅ Calcular cuántas le faltan para llegar a la cantidad TOTAL
            const faltantes = item.cantidad - boletasYaTiene;
            
            
            if (faltantes > 0) {
                // Obtener números ya usados en este sorteo
                const [numerosUsados] = await connection.query(
                    'SELECT numero FROM boletas WHERE sorteo_id = ?', [sorteoId]
                );
                const usadosSet = new Set(numerosUsados.map(r => r.numero));
                
                // Generar números disponibles
                const disponibles = [];
                for (let i = numero_inicio; i <= numero_fin; i++) {
                    if (!usadosSet.has(i)) disponibles.push(i);
                }
                
                if (disponibles.length < faltantes) {
                    errores.push(`Asociado ${item.documento}: No hay suficientes números disponibles. Disponibles: ${disponibles.length}, Necesarios: ${faltantes}`);
                    continue;
                }
                
                // Seleccionar números aleatorios
                const seleccionados = [];
                for (let i = 0; i < faltantes; i++) {
                    const idx = Math.floor(Math.random() * disponibles.length);
                    seleccionados.push(disponibles.splice(idx, 1)[0]);
                }
                
                // Insertar boletas
                const values = seleccionados.map(num => [sorteoId, item.asociadoId, num, 0]);
                await connection.query(
                    'INSERT INTO boletas (sorteo_id, asociado_id, numero, es_ganadora) VALUES ?',
                    [values]
                );
                
                totalBoletasGeneradas += faltantes;
            }
        }
        
        await connection.commit();
        
        // Obtener estadísticas actualizadas
        const [stats] = await pool.query(
            `SELECT COUNT(*) as total_boletas, COUNT(DISTINCT asociado_id) as total_asociados
             FROM boletas WHERE sorteo_id = ?`,
            [sorteoId]
        );
        

        res.json({
            success: true,
            message: 'Asociados importados exitosamente',
            data: {
                registros_nuevos: registrosNuevos,
                registros_actualizados: registrosActualizados,
                boletas_generadas: totalBoletasGeneradas,
                total_boletas: stats[0].total_boletas,
                total_asociados: stats[0].total_asociados,
                errores: errores.length > 0 ? errores : undefined
            }
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error al importar asociados:', error);
        res.status(500).json({ success: false, message: 'Error al importar asociados', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

exports.iniciarSorteo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el sorteo existe
        const sorteo = await Sorteo.findById(id);
        if (!sorteo) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        // Verificar que está programado
        if (sorteo.estado !== 'programado') {
            return res.status(400).json({ 
                success: false, 
                message: `El sorteo está en estado "${sorteo.estado}". Solo se pueden iniciar sorteos programados.` 
            });
        }
        
        // Verificar que tiene boletas generadas
        if (!sorteo.total_boletas || sorteo.total_boletas === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El sorteo no tiene boletas generadas. Importa asociados primero.' 
            });
        }
        
        const result = await Sorteo.iniciar(id);
        
        if (!result) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se pudo iniciar el sorteo. Verifica que esté programado.' 
            });
        }
        
        res.json({
            success: true,
            message: 'Sorteo iniciado exitosamente',
            data: { estado: 'en_curso' }
        });
    } catch (error) {
        console.error('Error al iniciar sorteo:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar sorteo', error: error.message });
    }
};

exports.finalizarSorteo = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params;
        const { numero_ganador, premio_id, soporte_ganador } = req.body;
        
        if (!numero_ganador) {
            return res.status(400).json({
                success: false,
                message: 'El número ganador es requerido'
            });
        }
        
        await connection.beginTransaction();
        
        // Verificar sorteo
        const sorteo = await Sorteo.findById(id);
        if (!sorteo) {
            throw new Error('Sorteo no encontrado');
        }
        
        // Verificar que está en curso
        if (sorteo.estado !== 'en_curso') {
            throw new Error(`El sorteo está en estado "${sorteo.estado}". Solo se pueden finalizar sorteos en curso.`);
        }
        
        // Verificar que la boleta existe
        const [boleta] = await connection.query(
            'SELECT * FROM boletas WHERE sorteo_id = ? AND numero = ?',
            [id, numero_ganador]
        );
        
        if (boleta.length === 0) {
            throw new Error(`No se encontró la boleta #${String(numero_ganador).padStart(4, '0')}`);
        }
        
        // ✅ 1. Marcar boleta como ganadora
        await connection.query(
            'UPDATE boletas SET es_ganadora = 1 WHERE id = ?',
            [boleta[0].id]
        );
        
        // ✅ 2. Obtener el título del premio (si se seleccionó uno)
        let premioTitulo = null;
        if (premio_id) {
            const [premio] = await connection.query(
                'SELECT titulo FROM premios WHERE id = ? AND sorteo_id = ?',
                [premio_id, id]
            );
            if (premio.length > 0) {
                premioTitulo = premio[0].titulo;
            }
        }
        
        // ✅ 3. Registrar en historial_ganadores
        await connection.query(
            `INSERT INTO historial_ganadores 
            (sorteo_id, asociado_id, numero_boleta, premio_titulo, fecha_sorteo) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                boleta[0].asociado_id,
                numero_ganador,
                premioTitulo || 'Premio',
                sorteo.fecha_sorteo
            ]
        );
        
        // ✅ 4. Finalizar sorteo
        await connection.query(
            `UPDATE sorteos 
             SET estado = 'finalizado', 
                 numero_ganador = ?, 
                 soporte_ganador = ?
             WHERE id = ? AND estado = 'en_curso'`,
            [numero_ganador, soporte_ganador || null, id]
        );
        
        await connection.commit();
        
        // Obtener ganadores
        const ganadores = await Sorteo.getGanadores(id);
        
        res.json({
            success: true,
            message: 'Sorteo finalizado exitosamente',
            data: {
                numero_ganador,
                ganadores
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al finalizar sorteo:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al finalizar sorteo',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.finalizarSorteoMultiple = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params;
        const { ganadores } = req.body;
        
        if (!ganadores || !Array.isArray(ganadores) || ganadores.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere al menos un ganador'
            });
        }
        
        await connection.beginTransaction();
        
        // Verificar sorteo
        const [sorteo] = await connection.query(
            'SELECT * FROM sorteos WHERE id = ? AND estado = "en_curso"',
            [id]
        );
        
        if (sorteo.length === 0) {
            throw new Error('Sorteo no encontrado o no está en curso');
        }
        
        const resultados = [];
        
        // Procesar cada ganador
        for (const item of ganadores) {
            const { premio_id, numero_ganador } = item;
            
            // Verificar que el premio existe y pertenece al sorteo
            const [premio] = await connection.query(
                'SELECT * FROM premios WHERE id = ? AND sorteo_id = ?',
                [premio_id, id]
            );
            
            if (premio.length === 0) {
                throw new Error(`Premio ID ${premio_id} no encontrado en este sorteo`);
            }
            
            // Verificar que la boleta existe
            const [boleta] = await connection.query(
                'SELECT * FROM boletas WHERE sorteo_id = ? AND numero = ?',
                [id, numero_ganador]
            );
            
            if (boleta.length === 0) {
                throw new Error(`No se encontró la boleta #${String(numero_ganador).padStart(4, '0')}`);
            }
            
            // Verificar que la boleta no esté ya marcada como ganadora
            if (boleta[0].es_ganadora === 1) {
                throw new Error(`La boleta #${String(numero_ganador).padStart(4, '0')} ya es ganadora`);
            }
            
            // Marcar boleta como ganadora
            await connection.query(
                'UPDATE boletas SET es_ganadora = 1 WHERE id = ?',
                [boleta[0].id]
            );
            
            // ✅ Registrar en historial_ganadores (aquí se guarda cada número ganador)
            await connection.query(
                `INSERT INTO historial_ganadores 
                (sorteo_id, asociado_id, numero_boleta, premio_titulo, fecha_sorteo) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    id,
                    boleta[0].asociado_id,
                    numero_ganador,
                    premio[0].titulo,
                    sorteo[0].fecha_sorteo
                ]
            );
            
            // Obtener datos del asociado
            const [asociado] = await connection.query(
                'SELECT * FROM asociados WHERE id = ?',
                [boleta[0].asociado_id]
            );
            
            resultados.push({
                premio_id,
                premio_titulo: premio[0].titulo,
                numero_boleta: numero_ganador,
                documento: asociado[0]?.documento || 'N/A',
                nombres: asociado[0]?.nombres || 'N/A',
                apellidos: asociado[0]?.apellidos || 'N/A',
            });
        }
        
        // ✅ ACTUALIZAR: Solo cambiar estado, NO guardar número ganador
        await connection.query(
            `UPDATE sorteos 
             SET estado = 'finalizado'
             WHERE id = ? AND estado = 'en_curso'`,
            [id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Sorteo finalizado exitosamente',
            data: {
                ganadores: resultados
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al finalizar sorteo múltiple:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al finalizar sorteo',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.cancelarSorteo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el sorteo existe
        const sorteo = await Sorteo.findById(id);
        if (!sorteo) {
            return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
        }
        
        // Verificar que está programado
        if (sorteo.estado !== 'programado') {
            return res.status(400).json({ 
                success: false, 
                message: `El sorteo está en estado "${sorteo.estado}". Solo se pueden cancelar sorteos programados.` 
            });
        }
        
        const result = await Sorteo.cancelar(id);
        
        if (!result) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se pudo cancelar el sorteo. Verifica que esté programado.' 
            });
        }
        
        res.json({
            success: true,
            message: 'Sorteo cancelado exitosamente',
            data: { estado: 'cancelado' }
        });
    } catch (error) {
        console.error('Error al cancelar sorteo:', error);
        res.status(500).json({ success: false, message: 'Error al cancelar sorteo', error: error.message });
    }
};

exports.asignarParticipante = async (req, res) => {
    try {
        const { id } = req.params;
        const { asociadoId, cantidadBoletas = 1 } = req.body;
        
        if (!asociadoId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del asociado es requerido'
            });
        }
        
        const result = await Sorteo.asignarParticipante(id, asociadoId, cantidadBoletas);
        
        res.json({
            success: true,
            message: 'Participante asignado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al asignar participante:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al asignar participante',
            error: error.message
        });
    }
};

exports.asignarParticipanteManual = async (req, res) => {
    try {
        const { id } = req.params;
        const { asociadoId, numeros } = req.body;
        
        if (!asociadoId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del asociado es requerido'
            });
        }
        
        if (!numeros || !Array.isArray(numeros) || numeros.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de números de boleta'
            });
        }
        
        const result = await Sorteo.asignarParticipanteManual(id, asociadoId, numeros);
        
        res.json({
            success: true,
            message: 'Participante asignado con boletas manuales exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error al asignar participante manual:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al asignar participante',
            error: error.message
        });
    }
};
