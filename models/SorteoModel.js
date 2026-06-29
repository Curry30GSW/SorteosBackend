const pool = require('../config/ConectDb');

class Sorteo {
    static async findAll(activo = true) {
    const [rows] = await pool.query(
        `SELECT s.*, 
            COUNT(DISTINCT b.id) AS total_boletas,
            SUM(b.es_ganadora) AS total_ganadores,
            COUNT(DISTINCT b.asociado_id) AS total_participantes
        FROM sorteos s
        LEFT JOIN boletas b ON b.sorteo_id = s.id
        WHERE s.activo = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC`,
        [activo ? 1 : 0]
    );
    return rows;
    }

    static async findById(id) {
    const [rows] = await pool.query(
        `SELECT s.*, 
            COUNT(DISTINCT b.id) AS total_boletas,
            SUM(b.es_ganadora) AS total_ganadores,
            COUNT(DISTINCT b.asociado_id) AS total_participantes
        FROM sorteos s
        LEFT JOIN boletas b ON b.sorteo_id = s.id
        WHERE s.id = ?
        GROUP BY s.id`,
        [id]
    );
    return rows[0];
    }

    static async findWithPremios(id) {
        const [rows] = await pool.query(
            `SELECT s.*, 
                COUNT(DISTINCT b.id) AS total_boletas,
                SUM(b.es_ganadora) AS total_ganadores,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', p.id,
                        'titulo', p.titulo,
                        'descripcion', p.descripcion,
                        'imagen', p.imagen,
                        'orden', p.orden,
                        'activo', p.activo
                    )
                ) AS premios
            FROM sorteos s
            LEFT JOIN boletas b ON b.sorteo_id = s.id
            LEFT JOIN premios p ON p.sorteo_id = s.id AND p.activo = 1
            WHERE s.id = ?
            GROUP BY s.id`,
            [id]
        );
        
        const result = rows[0];
        if (result && result.premios) {
            // Filtrar premios nulos (cuando no hay premios)
            const premios = JSON.parse(result.premios);
            result.premios = premios.filter(p => p.id !== null);
        }
        return result;
    }

    static async create(data) {
        const { nombre, fecha_sorteo, loteria, boletas_por_persona = 1 } = data;
        
        const [result] = await pool.query(
            `INSERT INTO sorteos 
            (nombre, fecha_sorteo, loteria, boletas_por_persona, estado) 
            VALUES (?, ?, ?, ?, 'programado')`,
            [nombre, fecha_sorteo, loteria, boletas_por_persona]
        );
        
        return { id: result.insertId };
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        
        values.push(id);
        const [result] = await pool.query(
            `UPDATE sorteos SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }

    static async getGanadores(id) {
        const [rows] = await pool.query(
            `SELECT 
                a.documento,
                a.nombres,
                a.apellidos,
                h.numero_boleta AS boleta_ganadora,
                h.premio_titulo AS premio,
                h.fecha_sorteo
            FROM historial_ganadores h
            JOIN asociados a ON h.asociado_id = a.id
            WHERE h.sorteo_id = ?
            ORDER BY h.created_at ASC`,
            [id]
        );
        return rows;
    }

    static async getEstadisticas(id) {
        const [rows] = await pool.query(
            `SELECT 
                COUNT(*) AS total_boletas,
                SUM(es_ganadora) AS total_ganadores,
                COUNT(DISTINCT asociado_id) AS total_participantes
            FROM boletas
            WHERE sorteo_id = ?`,
            [id]
        );
        return rows[0];
    }

    static async iniciar(id) {
        const [result] = await pool.query(
            `UPDATE sorteos SET estado = 'en_curso' WHERE id = ? AND estado = 'programado'`,
            [id]
        );
        return result.affectedRows > 0;
    }

    static async finalizar(id, numero_ganador, soporte_ganador = null) {
        const [result] = await pool.query(
            `UPDATE sorteos 
             SET estado = 'finalizado', 
                 numero_ganador = ?, 
                 soporte_ganador = ?
             WHERE id = ? AND estado = 'en_curso'`,
            [numero_ganador, soporte_ganador, id]
        );
        return result.affectedRows > 0;
    }

    static async cancelar(id) {
        const [result] = await pool.query(
            `UPDATE sorteos SET estado = 'cancelado' WHERE id = ? AND estado = 'programado'`,
            [id]
        );
        return result.affectedRows > 0;
    }

    static async asignarParticipante(sorteoId, asociadoId, cantidadBoletas = 1) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Verificar que el sorteo existe y está programado
            const [sorteo] = await connection.query(
                'SELECT * FROM sorteos WHERE id = ? AND estado = "programado"',
                [sorteoId]
            );
            
            if (sorteo.length === 0) {
                throw new Error('Sorteo no encontrado o no está programado');
            }
            
            // Verificar que el asociado existe
            const [asociado] = await connection.query(
                'SELECT * FROM asociados WHERE id = ?',
                [asociadoId]
            );
            
            if (asociado.length === 0) {
                throw new Error('Asociado no encontrado');
            }
            
            // Verificar que el asociado no esté ya asignado a este sorteo
            const [existente] = await connection.query(
                'SELECT id FROM boletas WHERE sorteo_id = ? AND asociado_id = ?',
                [sorteoId, asociadoId]
            );
            
            if (existente.length > 0) {
                throw new Error('Este asociado ya está asignado a este sorteo');
            }
            
            // Obtener números disponibles
            const { numero_inicio, numero_fin } = sorteo[0];
            const [numerosUsados] = await connection.query(
                'SELECT numero FROM boletas WHERE sorteo_id = ?',
                [sorteoId]
            );
            const usadosSet = new Set(numerosUsados.map(r => r.numero));
            
            const disponibles = [];
            for (let i = numero_inicio; i <= numero_fin; i++) {
                if (!usadosSet.has(i)) {
                    disponibles.push(i);
                }
            }
            
            if (disponibles.length < cantidadBoletas) {
                throw new Error(`No hay suficientes números disponibles. Disponibles: ${disponibles.length}, Necesarios: ${cantidadBoletas}`);
            }
            
            // Seleccionar números aleatorios
            const seleccionados = [];
            const disponiblesCopy = [...disponibles];
            for (let i = 0; i < cantidadBoletas; i++) {
                const idx = Math.floor(Math.random() * disponiblesCopy.length);
                seleccionados.push(disponiblesCopy.splice(idx, 1)[0]);
            }
            
            // Insertar boletas
            const values = seleccionados.map(num => [sorteoId, asociadoId, num, 0]);
            await connection.query(
                'INSERT INTO boletas (sorteo_id, asociado_id, numero, es_ganadora) VALUES ?',
                [values]
            );
            
            // Actualizar cantidad_boletas en asociados
            await connection.query(
                'UPDATE asociados SET cantidad_boletas = cantidad_boletas + ? WHERE id = ?',
                [cantidadBoletas, asociadoId]
            );
            
            await connection.commit();
            
            return {
                asociadoId,
                cantidad: cantidadBoletas,
                numeros: seleccionados
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async asignarParticipanteManual(sorteoId, asociadoId, numeros) {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Verificar que el sorteo existe y está programado
            const [sorteo] = await connection.query(
                'SELECT * FROM sorteos WHERE id = ? AND estado = "programado"',
                [sorteoId]
            );
            
            if (sorteo.length === 0) {
                throw new Error('Sorteo no encontrado o no está programado');
            }
            
            // Verificar que el asociado existe
            const [asociado] = await connection.query(
                'SELECT * FROM asociados WHERE id = ?',
                [asociadoId]
            );
            
            if (asociado.length === 0) {
                throw new Error('Asociado no encontrado');
            }
            
            // Verificar que el asociado no esté ya asignado
            const [existente] = await connection.query(
                'SELECT id FROM boletas WHERE sorteo_id = ? AND asociado_id = ?',
                [sorteoId, asociadoId]
            );
            
            if (existente.length > 0) {
                throw new Error('Este asociado ya está asignado a este sorteo');
            }
            
            // Verificar disponibilidad de cada número
            for (const numero of numeros) {
                const [disponible] = await connection.query(
                    'SELECT id FROM boletas WHERE sorteo_id = ? AND numero = ?',
                    [sorteoId, numero]
                );
                if (disponible.length > 0) {
                    throw new Error(`El número ${numero} ya está asignado en este sorteo`);
                }
            }
            
            // Insertar boletas
            const values = numeros.map(num => [sorteoId, asociadoId, num, 0]);
            await connection.query(
                'INSERT INTO boletas (sorteo_id, asociado_id, numero, es_ganadora) VALUES ?',
                [values]
            );
            
            // Actualizar cantidad_boletas en asociados
            await connection.query(
                'UPDATE asociados SET cantidad_boletas = cantidad_boletas + ? WHERE id = ?',
                [numeros.length, asociadoId]
            );
            
            await connection.commit();
            
            return {
                asociadoId,
                cantidad: numeros.length,
                numeros
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Sorteo;