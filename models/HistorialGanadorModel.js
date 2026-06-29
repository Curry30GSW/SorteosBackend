const pool = require('../config/ConectDb');

class HistorialGanador {
    static async registrarGanadores(sorteoId) {
        const [result] = await pool.query(
            `INSERT INTO historial_ganadores (sorteo_id, asociado_id, numero_boleta, premio_titulo, fecha_sorteo)
            SELECT 
                b.sorteo_id,
                b.asociado_id,
                b.numero,
                COALESCE(p.titulo, 'Premio') AS premio_titulo,
                s.fecha_sorteo
            FROM boletas b
            JOIN sorteos s ON b.sorteo_id = s.id
            LEFT JOIN premios p ON p.sorteo_id = s.id AND p.orden = 1
            WHERE b.sorteo_id = ? AND b.es_ganadora = 1`,
            [sorteoId]
        );
        
        return { registrados: result.affectedRows };
    }

    static async getByAsociado(asociadoId) {
        const [rows] = await pool.query(
            `SELECT 
                h.*,
                s.nombre AS sorteo_nombre
            FROM historial_ganadores h
            JOIN sorteos s ON h.sorteo_id = s.id
            WHERE h.asociado_id = ?
            ORDER BY h.fecha_sorteo DESC`,
            [asociadoId]
        );
        return rows;
    }

    static async getLastWinners(limit = 10) {
        const [rows] = await pool.query(
            `SELECT 
                h.*,
                a.nombres,
                a.apellidos,
                a.documento,
                s.nombre AS sorteo_nombre
            FROM historial_ganadores h
            JOIN asociados a ON h.asociado_id = a.id
            JOIN sorteos s ON h.sorteo_id = s.id
            ORDER BY h.created_at DESC
            LIMIT ?`,
            [limit]
        );
        return rows;
    }
}

module.exports = HistorialGanador;