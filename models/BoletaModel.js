const pool = require('../config/ConectDb');

class Boleta {
    static async findBySorteo(sorteoId) {
        const [rows] = await pool.query(
            `SELECT b.*, a.documento, a.nombres, a.apellidos 
            FROM boletas b
            JOIN asociados a ON b.asociado_id = a.id
            WHERE b.sorteo_id = ?
            ORDER BY b.numero ASC`,
            [sorteoId]
        );
        return rows;
    }

    static async findByAsociado(asociadoId, sorteoId = null) {
        let query = `SELECT b.*, s.nombre AS sorteo_nombre 
            FROM boletas b
            JOIN sorteos s ON b.sorteo_id = s.id
            WHERE b.asociado_id = ?`;
        const params = [asociadoId];
        
        if (sorteoId) {
            query += ' AND b.sorteo_id = ?';
            params.push(sorteoId);
        }
        
        query += ' ORDER BY b.created_at DESC';
        
        const [rows] = await pool.query(query, params);
        return rows;
    }

    static async generarBoletas(sorteoId, boletasPorPersona = 1) {
        // Obtener asociados activos
        const [asociados] = await pool.query(
            'SELECT id FROM asociados WHERE activo = 1'
        );
        
        if (asociados.length === 0) {
            throw new Error('No hay asociados activos para asignar boletas');
        }

        // Generar números aleatorios sin repetir
        const numerosDisponibles = new Set();
        while (numerosDisponibles.size < asociados.length * boletasPorPersona) {
            numerosDisponibles.add(Math.floor(Math.random() * 10000));
        }
        const numerosArray = Array.from(numerosDisponibles);

        // Preparar inserción masiva
        const values = [];
        let index = 0;
        for (const asociado of asociados) {
            for (let i = 0; i < boletasPorPersona; i++) {
                values.push([
                    sorteoId,
                    asociado.id,
                    numerosArray[index++],
                    0
                ]);
            }
        }

        const [result] = await pool.query(
            'INSERT INTO boletas (sorteo_id, asociado_id, numero, es_ganadora) VALUES ?',
            [values]
        );

        // Actualizar sorteo
        await pool.query(
            'UPDATE sorteos SET boletas_generadas = 1 WHERE id = ?',
            [sorteoId]
        );

        return { 
            total_generadas: result.affectedRows,
            total_asociados: asociados.length
        };
    }

    static async verificarDisponibilidad(sorteoId, numero) {
        const [rows] = await pool.query(
            'SELECT id FROM boletas WHERE sorteo_id = ? AND numero = ?',
            [sorteoId, numero]
        );
        return rows.length === 0;
    }

    static async asignarManual(sorteoId, asociadoId, numero) {
        // Verificar disponibilidad
        const disponible = await this.verificarDisponibilidad(sorteoId, numero);
        if (!disponible) {
            throw new Error(`El número ${numero} ya está asignado en este sorteo`);
        }

        const [result] = await pool.query(
            'INSERT INTO boletas (sorteo_id, asociado_id, numero) VALUES (?, ?, ?)',
            [sorteoId, asociadoId, numero]
        );
        
        return { id: result.insertId };
    }

    static async marcarGanadora(sorteoId, numero) {
        const [result] = await pool.query(
            'UPDATE boletas SET es_ganadora = 1 WHERE sorteo_id = ? AND numero = ?',
            [sorteoId, numero]
        );
        
        if (result.affectedRows === 0) {
            throw new Error(`No se encontró la boleta ${numero} en el sorteo ${sorteoId}`);
        }
        
        return result.affectedRows > 0;
    }

    static async eliminarBoleta(sorteoId, boletaId) {
        // Verificar que la boleta existe y pertenece al sorteo
        const [boleta] = await pool.query(
            'SELECT * FROM boletas WHERE id = ? AND sorteo_id = ?',
            [boletaId, sorteoId]
        );
        
        if (boleta.length === 0) {
            throw new Error('Boleta no encontrada o no pertenece a este sorteo');
        }

        // Verificar que no sea ganadora
        if (boleta[0].es_ganadora === 1) {
            throw new Error('No se puede eliminar una boleta ganadora');
        }

        // Eliminar la boleta
        const [result] = await pool.query(
            'DELETE FROM boletas WHERE id = ? AND sorteo_id = ?',
            [boletaId, sorteoId]
        );
        
        return result.affectedRows > 0;
    }

    static async eliminarBoletasPorAsociado(sorteoId, asociadoId) {
        // Verificar que el asociado tiene boletas en este sorteo
        const [boletas] = await pool.query(
            'SELECT * FROM boletas WHERE sorteo_id = ? AND asociado_id = ?',
            [sorteoId, asociadoId]
        );
        
        if (boletas.length === 0) {
            throw new Error('Este asociado no tiene boletas en este sorteo');
        }

        // Verificar que ninguna sea ganadora
        const tieneGanadora = boletas.some(b => b.es_ganadora === 1);
        if (tieneGanadora) {
            throw new Error('No se pueden eliminar boletas ganadoras');
        }

        // Eliminar todas las boletas del asociado en este sorteo
        const [result] = await pool.query(
            'DELETE FROM boletas WHERE sorteo_id = ? AND asociado_id = ?',
            [sorteoId, asociadoId]
        );
        
        return {
            eliminadas: result.affectedRows,
            total: boletas.length
        };
    }
}

module.exports = Boleta;