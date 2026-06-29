const pool = require('../config/ConectDb');

class Asociado {
    static async findAll(activo = true) {
        const [rows] = await pool.query(
            'SELECT * FROM asociados WHERE activo = ? ORDER BY id DESC',
            [activo ? 1 : 0]
        );
        return rows;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM asociados WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByDocument(documento) {
        const [rows] = await pool.query(
            'SELECT * FROM asociados WHERE documento = ?',
            [documento]
        );
        return rows[0];
    }

    static async findByToken(token) {
        const [rows] = await pool.query(
            'SELECT * FROM asociados WHERE token_consulta = ?',
            [token]
        );
        return rows[0];
    }

    static async create(data) {
        const { 
            documento, 
            nombres, 
            apellidos, 
            email, 
            telefono, 
            whatsapp, 
            cuenta, 
            cantidad_boletas,  // ✅ Agregar
            agencia, 
            nomina, 
            coordinador, 
            dependencia 
        } = data;
        
        const token = require('crypto').randomBytes(48).toString('base64url');
        
        const [result] = await pool.query(
            `INSERT INTO asociados 
            (documento, nombres, apellidos, email, telefono, whatsapp, cuenta, 
             cantidad_boletas, agencia, nomina, coordinador, dependencia, token_consulta) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                documento, 
                nombres, 
                apellidos || '', 
                email || null, 
                telefono || null, 
                whatsapp || null, 
                cuenta || null,
                cantidad_boletas || 0,  // ✅ Agregar
                agencia || '', 
                nomina || '', 
                coordinador || '', 
                dependencia || '',
                token
            ]
        );
        
        return { id: result.insertId, token };
    }

    static async createOrUpdate(data) {
        const { 
            documento, 
            nombres, 
            apellidos, 
            email, 
            telefono, 
            whatsapp, 
            cuenta, 
            cantidad_boletas,  
            agencia, 
            nomina, 
            coordinador, 
            dependencia 
        } = data;
        
        // Verificar si existe
        const existe = await this.findByDocument(documento);
        
        if (existe) {
            // Actualizar
            const [result] = await pool.query(
                `UPDATE asociados 
                SET nombres = ?, 
                    apellidos = ?, 
                    email = ?, 
                    telefono = ?, 
                    whatsapp = ?, 
                    cuenta = ?,
                    cantidad_boletas = ?,  
                    agencia = ?, 
                    nomina = ?, 
                    coordinador = ?, 
                    dependencia = ?
                WHERE documento = ?`,
                [
                    nombres, 
                    apellidos || '', 
                    email || null, 
                    telefono || null, 
                    whatsapp || null, 
                    cuenta || null,
                    cantidad_boletas || 0,  
                    agencia || '', 
                    nomina || '', 
                    coordinador || '', 
                    dependencia || '',
                    documento
                ]
            );
            return { 
                id: existe.id, 
                updated: true,
                documento: existe.documento,
                token: existe.token_consulta
            };
        } else {
            // Crear nuevo
            const token = require('crypto').randomBytes(48).toString('base64url');
            const [result] = await pool.query(
                `INSERT INTO asociados 
                (documento, nombres, apellidos, email, telefono, whatsapp, cuenta, 
                 cantidad_boletas, agencia, nomina, coordinador, dependencia, token_consulta) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    documento, 
                    nombres, 
                    apellidos || '', 
                    email || null, 
                    telefono || null, 
                    whatsapp || null, 
                    cuenta || null,
                    cantidad_boletas || 0,  
                    agencia || '', 
                    nomina || '', 
                    coordinador || '', 
                    dependencia || '',
                    token
                ]
            );
            return { 
                id: result.insertId, 
                updated: false, 
                token,
                documento
            };
        }
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        
        // ✅ Agregar 'cantidad_boletas' a los campos permitidos
        const allowedFields = [
            'nombres', 'apellidos', 'email', 'telefono', 'whatsapp', 
            'cuenta', 'cantidad_boletas', 'agencia', 'nomina', 
            'coordinador', 'dependencia', 'activo'
        ];
        
        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key) && data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        
        if (fields.length === 0) {
            return false;
        }
        
        values.push(id);
        const [result] = await pool.query(
            `UPDATE asociados SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }


    static async updateCantidadBoletas(documento, cantidadBoletas) {
        const [result] = await pool.query(
            'UPDATE asociados SET cantidad_boletas = cantidad_boletas + ? WHERE documento = ?',
            [cantidadBoletas, documento]
        );
        return result.affectedRows > 0;
    }

    static async getHistorial(id) {
        const [rows] = await pool.query(
            `SELECT 
                s.nombre AS sorteo,
                s.fecha_sorteo,
                h.numero_boleta,
                h.premio_titulo,
                CASE 
                    WHEN h.id IS NOT NULL THEN 'GANADOR'
                    ELSE 'PARTICIPO'
                END AS estado
            FROM sorteos s
            LEFT JOIN historial_ganadores h 
                ON h.sorteo_id = s.id AND h.asociado_id = ?
            WHERE EXISTS (
                SELECT 1 FROM boletas b 
                WHERE b.sorteo_id = s.id AND b.asociado_id = ?
            )
            ORDER BY s.fecha_sorteo DESC`,
            [id, id]
        );
        return rows;
    }

    static async getWithBoletas(asociadoId, sorteoId) {
        try {
            // 1. Obtener datos del asociado
            const [asociadoRows] = await pool.query(
                `SELECT * FROM asociados WHERE id = ?`,
                [asociadoId]
            );
            
            if (asociadoRows.length === 0) {
                return null;
            }
            
            const asociado = asociadoRows[0];
            
            // 2. Obtener sus boletas en el sorteo
            const [boletasRows] = await pool.query(
                `SELECT 
                    id,
                    numero,
                    es_ganadora,
                    fecha_asignacion
                FROM boletas 
                WHERE asociado_id = ? AND sorteo_id = ?
                ORDER BY numero ASC`,
                [asociadoId, sorteoId]
            );
            
            // 3. Combinar resultados
            return {
                ...asociado,
                total_boletas_en_sorteo: boletasRows.length,
                boletas: boletasRows
            };
        } catch (error) {
            console.error('Error en getWithBoletas:', error);
            throw error;
        }
    }

    static async getWithBoletasByDocument(documento, sorteoId) {
        try {
            // 1. Obtener datos del asociado por documento
            const [asociadoRows] = await pool.query(
                `SELECT * FROM asociados WHERE documento = ?`,
                [documento]
            );
            
            if (asociadoRows.length === 0) {
                return null;
            }
            
            const asociado = asociadoRows[0];
            
            // 2. Obtener sus boletas en el sorteo
            const [boletasRows] = await pool.query(
                `SELECT 
                    id,
                    numero,
                    es_ganadora,
                    fecha_asignacion
                FROM boletas 
                WHERE asociado_id = ? AND sorteo_id = ?
                ORDER BY numero ASC`,
                [asociado.id, sorteoId]
            );
            
            // 3. Combinar resultados
            return {
                ...asociado,
                total_boletas_en_sorteo: boletasRows.length,
                boletas: boletasRows
            };
        } catch (error) {
            console.error('Error en getWithBoletasByDocument:', error);
            throw error;
        }
    }

    static async getResumen() {
        const [rows] = await pool.query(
            `SELECT 
                COUNT(*) as total_asociados,
                SUM(activo) as activos,
                SUM(cantidad_boletas) as total_boletas
            FROM asociados`
        );
        return rows[0];
    }
}

module.exports = Asociado;