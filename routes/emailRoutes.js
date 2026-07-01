const express = require('express');
const router = express.Router();
const { sendEmail, loadTemplate } = require('../config/email.config');
const path = require('path');

// ─── Logo inline (CID) — CONFIGURACIÓN CORRECTA ──────────────
const logoAttachment = {
    filename: 'coopserp.png',
    path: path.join(__dirname, '../uploads/logo/coopserp.png'),
    cid: 'logo_coopserp',  // Este ID debe coincidir con el del HTML
    contentDisposition: 'inline',
    contentType: 'image/png',  // Especificar explícitamente
    encoding: 'base64'
};

// También puedes usar base64 directo como alternativa
const logoBase64Attachment = (base64String) => ({
    filename: 'coopserp.png',
    content: base64String,
    encoding: 'base64',
    cid: 'logo_coopserp',
    contentDisposition: 'inline',
    contentType: 'image/png'
});

// ─── Utilidades ──────────────────────────────────────────────────────────────
const formatNumero = (numero) => String(numero).padStart(4, '0');

const formatFecha = (fecha) => {
    if (!fecha || fecha === 'Próximamente') return 'Próximamente';
    try {
        return new Date(fecha).toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Bogota',
        });
    } catch {
        return fecha;
    }
};

const buildTemplateData = ({ nombres, apellidos, documento, sorteo, fechaSorteo, boletas, urlConsulta }) => {
    // Ordenar por ID antes de formatear
    const boletasOrdenadas = [...boletas].sort((a, b) => a.id - b.id);

    return {
        nombres,
        apellidos: apellidos || '',
        documento: documento || 'No especificado',
        sorteoNombre: sorteo || 'Sorteo COOPSERP',
        fechaSorteo: formatFecha(fechaSorteo),
        totalBoletas: boletasOrdenadas.length,
        boletas: boletasOrdenadas.map(b => ({
            ...b,
            numeroFormateado: formatNumero(b.numero),
        })),
        boletasResumen: boletasOrdenadas.map(b => formatNumero(b.numero)).join(', '),
        urlConsulta: urlConsulta || '',
        year: new Date().getFullYear(),
        logoCid: 'logo_coopserp'
    };
};

// ─── POST /enviar-boletas-correo ─────────────────────────────────────────────
router.post('/enviar-boletas-correo', async (req, res) => {
    try {
        const { email, nombres, apellidos, documento, boletas, pdfBase64, sorteo, fechaSorteo, urlConsulta } = req.body;

        if (!email || !nombres || !boletas || boletas.length === 0) {
            return res.status(400).json({ success: false, error: 'Datos incompletos para enviar el correo' });
        }

        const templateData = buildTemplateData({ nombres, apellidos, documento, sorteo, fechaSorteo, boletas, urlConsulta });
        const htmlContent = loadTemplate('boletas', templateData);

        // ⚠️ IMPORTANTE: El logo DEBE ir primero en el array de attachments
        const attachments = [
            logoAttachment, // Logo como inline
            {
                filename: `boletas-${documento || 'asociado'}.pdf`,
                content: pdfBase64.split(',')[1] || pdfBase64,
                encoding: 'base64',
                contentType: 'application/pdf',
                contentDisposition: 'attachment' // El PDF SÍ va como adjunto
            }
        ];

        const subject = `Tus boletas para el ${sorteo || 'Sorteo COOPSERP'} — COOPSERP`;
        const info = await sendEmail(email, subject, htmlContent, attachments);

        res.json({ success: true, message: 'Correo enviado exitosamente', messageId: info.messageId });

    } catch (error) {
        console.error('❌ Error en endpoint de correo:', error);
        res.status(500).json({ success: false, error: error.message || 'Error al enviar el correo' });
    }
});

// ─── POST /enviar-boletas-masivo ─────────────────────────────────────────────
router.post('/enviar-boletas-masivo', async (req, res) => {
    try {
        const { asociados } = req.body;

        if (!asociados || asociados.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay asociados para enviar' });
        }

        const resultados = [];
        const chunkSize = 5;

        for (let i = 0; i < asociados.length; i += chunkSize) {
            const chunk = asociados.slice(i, i + chunkSize);

            const promises = chunk.map(async (asociado) => {
                try {
                    const templateData = buildTemplateData({
                        nombres: asociado.nombres,
                        apellidos: asociado.apellidos,
                        documento: asociado.documento,
                        sorteo: asociado.sorteo,
                        fechaSorteo: asociado.fechaSorteo,
                        boletas: asociado.boletas,
                        urlConsulta: asociado.urlConsulta,
                    });

                    const htmlContent = loadTemplate('boletas', templateData);

                    const attachments = [
                        logoAttachment, // Logo como inline
                        {
                            filename: `boletas-${asociado.documento || 'asociado'}.pdf`,
                            content: asociado.pdfBase64.split(',')[1] || asociado.pdfBase64,
                            encoding: 'base64',
                            contentType: 'application/pdf',
                            contentDisposition: 'attachment'
                        }
                    ];

                    const info = await sendEmail(
                        asociado.email,
                        `Tus boletas para el ${asociado.sorteo || 'Sorteo COOPSERP'} — COOPSERP`,
                        htmlContent,
                        attachments
                    );

                    return { email: asociado.email, success: true, messageId: info.messageId };

                } catch (error) {
                    return { email: asociado.email, success: false, error: error.message };
                }
            });

            const chunkResults = await Promise.all(promises);
            resultados.push(...chunkResults);
        }

        const exitosos = resultados.filter(r => r.success).length;
        const fallidos = resultados.filter(r => !r.success).length;

        res.json({ success: true, total: resultados.length, exitosos, fallidos, resultados });

    } catch (error) {
        console.error('❌ Error en envío masivo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;