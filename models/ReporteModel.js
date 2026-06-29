const pool = require('../config/ConectDb');

class ReporteModel {
    // 1. Asociado con más boletas en un sorteo
    static async getTopAsociadoByBoletas(sorteoId) {
        const [rows] = await pool.query(
            `SELECT 
                a.id,
                a.documento,
                a.nombres,
                a.apellidos,
                a.agencia,
                COUNT(b.id) as total_boletas
            FROM asociados a
            INNER JOIN boletas b ON b.asociado_id = a.id
            WHERE b.sorteo_id = ?
            GROUP BY a.id
            ORDER BY total_boletas DESC
            LIMIT 1`,
            [sorteoId]
        );
        return rows[0] || null;
    }

    // 2. Top 10 participantes con más boletas
    static async getTopParticipantes(sorteoId, limit = 10) {
        const [rows] = await pool.query(
            `SELECT 
                a.id,
                a.documento,
                a.nombres,
                a.apellidos,
                a.agencia,
                COUNT(b.id) as total_boletas
            FROM asociados a
            INNER JOIN boletas b ON b.asociado_id = a.id
            WHERE b.sorteo_id = ?
            GROUP BY a.id
            ORDER BY total_boletas DESC
            LIMIT ?`,
            [sorteoId, limit]
        );
        return rows;
    }

    // 3. Reporte por asociado (boletas por asociado)
    static async getReportePorAsociado(sorteoId) {
        const [rows] = await pool.query(
            `SELECT 
                a.id,
                a.documento,
                a.nombres,
                a.apellidos,
                a.agencia,
                a.nomina,
                a.coordinador,
                COUNT(b.id) as total_boletas,
                SUM(b.es_ganadora) as boletas_ganadoras
            FROM asociados a
            LEFT JOIN boletas b ON b.asociado_id = a.id AND b.sorteo_id = ?
            GROUP BY a.id
            ORDER BY total_boletas DESC`,
            [sorteoId]
        );
        return rows;
    }

    // 4. Reporte por agencia
    static async getReportePorAgencia(sorteoId) {
        const [rows] = await pool.query(
            `SELECT 
                a.agencia,
                COUNT(DISTINCT a.id) as total_asociados,
                COUNT(b.id) as total_boletas,
                SUM(b.es_ganadora) as boletas_ganadoras,
                COUNT(DISTINCT CASE WHEN b.es_ganadora = 1 THEN a.id END) as ganadores
            FROM asociados a
            LEFT JOIN boletas b ON b.asociado_id = a.id AND b.sorteo_id = ?
            WHERE a.agencia IS NOT NULL AND a.agencia != ''
            GROUP BY a.agencia
            ORDER BY total_boletas DESC`,
            [sorteoId]
        );
        return rows;
    }

    // 5. Últimos ganadores
        static async getUltimosGanadores(sorteoId, limit = 10) {
            const [rows] = await pool.query(
                `SELECT 
                    h.id as boleta_id,
                    h.numero_boleta,
                    a.documento,
                    a.nombres,
                    a.apellidos,
                    a.agencia,
                    h.premio_titulo as premio,
                    h.fecha_sorteo as fecha_asignacion,
                    '' as descripcion_premio,
                    '' as imagen_premio
                FROM historial_ganadores h
                INNER JOIN asociados a ON h.asociado_id = a.id
                WHERE h.sorteo_id = ? 
                ORDER BY h.created_at DESC
                LIMIT ?`,
                [sorteoId, limit]
            );
            return rows;
        }

    // 6. Estadísticas generales del sorteo
    static async getEstadisticasGenerales(sorteoId) {
        const [rows] = await pool.query(
            `SELECT 
                COUNT(DISTINCT b.id) as total_boletas,
                COUNT(DISTINCT b.asociado_id) as total_participantes,
                SUM(b.es_ganadora) as total_ganadores,
                COUNT(DISTINCT a.agencia) as total_agencias,
                (
                    SELECT COUNT(DISTINCT a2.id) 
                    FROM asociados a2
                    WHERE a2.activo = 1
                ) as total_asociados_activos
            FROM boletas b
            LEFT JOIN asociados a ON b.asociado_id = a.id
            WHERE b.sorteo_id = ?`,
            [sorteoId]
        );
        return rows[0] || {};
    }

    // 7. Distribución de boletas por agencia (para chart)
    static async getDistribucionPorAgencia(sorteoId) {
        const [rows] = await pool.query(
            `SELECT 
                a.agencia,
                COUNT(b.id) as total_boletas
            FROM asociados a
            INNER JOIN boletas b ON b.asociado_id = a.id
            WHERE b.sorteo_id = ? 
            AND a.agencia IS NOT NULL 
            AND a.agencia != ''
            GROUP BY a.agencia
            ORDER BY total_boletas DESC`,
            [sorteoId]
        );
        return rows;
    }
}

module.exports = ReporteModel;