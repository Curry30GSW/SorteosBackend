const pool = require('../config/ConectDb');

class Premio {
    static async findBySorteo(sorteoId) {
        const [rows] = await pool.query(
            'SELECT * FROM premios WHERE sorteo_id = ? AND activo = 1 ORDER BY orden ASC',
            [sorteoId]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM premios WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async create(data) {
        const { sorteo_id, titulo, descripcion, imagen, orden } = data;
        
        const [result] = await pool.query(
            'INSERT INTO premios (sorteo_id, titulo, descripcion, imagen, orden) VALUES (?, ?, ?, ?, ?)',
            [sorteo_id, titulo, descripcion, imagen, orden || 1]
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
            `UPDATE premios SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await pool.query(
            'DELETE FROM premios WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Premio;