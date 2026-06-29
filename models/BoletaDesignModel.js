const pool = require('../config/ConectDb');

class BoletaDesign {
    static async findBySorteo(sorteoId) {
        const [rows] = await pool.query(
            'SELECT * FROM boleta_designs WHERE sorteo_id = ?',
            [sorteoId]
        );
        return rows[0] || null;
    }

    static async upsert(sorteoId, data) {
        const { titulo, subtitulo, descripcion, terminos, url_consulta_ganador, texto_coljuegos } = data;

        const existing = await this.findBySorteo(sorteoId);

        if (existing) {
            await pool.query(
                `UPDATE boleta_designs 
                 SET titulo = ?, subtitulo = ?, descripcion = ?, terminos = ?,
                     url_consulta_ganador = ?, texto_coljuegos = ?, updated_at = NOW()
                 WHERE sorteo_id = ?`,
                [titulo, subtitulo, descripcion, terminos, url_consulta_ganador, texto_coljuegos, sorteoId]
            );
            return { ...existing, titulo, subtitulo, descripcion, terminos, url_consulta_ganador, texto_coljuegos };
        } else {
            const [result] = await pool.query(
                `INSERT INTO boleta_designs 
                 (sorteo_id, titulo, subtitulo, descripcion, terminos, url_consulta_ganador, texto_coljuegos, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [sorteoId, titulo, subtitulo, descripcion, terminos, url_consulta_ganador, texto_coljuegos]
            );
            return { id: result.insertId, sorteo_id: sorteoId, ...data };
        }
    }
}

module.exports = BoletaDesign;