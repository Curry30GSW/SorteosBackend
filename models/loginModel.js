const pool = require('../config/ConectDb');
const bcrypt = require('bcryptjs');

const loginModel = {
    // Validar credenciales de usuario
    validateLogin: async (usuario, password) => {
        try {
            const [rows] = await pool.query(`
                SELECT id_usuario, nombre, usuario, contraseña, rol, activo 
                FROM users 
                WHERE usuario = ? AND activo = 1
            `, [usuario]);

            if (rows.length === 0) {
                return null;
            }

            const user = rows[0];

            // Verificar contraseña
            const isValid = await bcrypt.compare(password, user.contraseña);

            if (!isValid) {
                return null;
            }

            // Retornar datos del usuario sin la contraseña
            return {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                usuario: user.usuario,
                rol: user.rol,
                activo: user.activo
            };

        } catch (error) {
            console.error('Error en validateLogin:', error);
            throw error;
        }
    },

    // Obtener usuario por nombre de usuario
    getByUsuario: async (usuario) => {
        try {
            const [rows] = await pool.query(`
                SELECT id_usuario, nombre, usuario, rol, activo 
                FROM users 
                WHERE usuario = ? AND activo = 1
            `, [usuario]);

            return rows[0] || null;
        } catch (error) {
            console.error('Error en getByUsuario:', error);
            throw error;
        }
    },

    // Cambiar contraseña
    cambiarPassword: async (idUsuario, nuevaPassword) => {
        try {
            const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
            const [result] = await pool.query(`
                UPDATE users 
                SET contraseña = ?, fecha_creado = NOW()
                WHERE id_usuario = ?
            `, [hashedPassword, idUsuario]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error en cambiarPassword:', error);
            throw error;
        }
    },

    // Crear nuevo usuario (solo admin)
    create: async (data) => {
        try {
            const hashedPassword = await bcrypt.hash(data.contraseña, 10);
            const [result] = await pool.query(`
                INSERT INTO users (
                    nombre, 
                    usuario, 
                    contraseña, 
                    rol, 
                    activo
                ) VALUES (?, ?, ?, ?, ?)
            `, [data.nombre, data.usuario, hashedPassword, data.rol, data.activo !== undefined ? data.activo : 1]);

            return { id_usuario: result.insertId, ...data };
        } catch (error) {
            console.error('Error en create:', error);
            throw error;
        }
    },

    // Actualizar usuario
    update: async (idUsuario, data) => {
        try {
            const fields = [];
            const values = [];

            if (data.nombre) {
                fields.push('nombre = ?');
                values.push(data.nombre);
            }
            if (data.rol) {
                fields.push('rol = ?');
                values.push(data.rol);
            }
            if (data.activo !== undefined) {
                fields.push('activo = ?');
                values.push(data.activo);
            }
            if (data.contraseña) {
                const hashedPassword = await bcrypt.hash(data.contraseña, 10);
                fields.push('contraseña = ?');
                values.push(hashedPassword);
            }

            if (fields.length === 0) return false;

            values.push(idUsuario);
            const [result] = await pool.query(`
                UPDATE users SET ${fields.join(', ')} WHERE id_usuario = ?
            `, values);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error en update:', error);
            throw error;
        }
    },

    // Obtener todos los usuarios (solo admin)
    getAll: async () => {
        try {
            const [rows] = await pool.query(`
                SELECT id_usuario, nombre, usuario, rol, activo, fecha_creado
                FROM users 
                ORDER BY id_usuario DESC
            `);
            return rows;
        } catch (error) {
            console.error('Error en getAll:', error);
            throw error;
        }
    }
};

module.exports = loginModel;