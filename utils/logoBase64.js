const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../uploads/logo/coopserp.png');

// ← DIAGNÓSTICO TEMPORAL: bórralo después de confirmar que funciona
console.log('📁 Buscando logo en:', logoPath);
console.log('¿Existe?', fs.existsSync(logoPath));

let logoBase64Cache = null;

const getLogoBase64 = () => {
    if (!logoBase64Cache) {
        try {
            const buffer = fs.readFileSync(logoPath);
            logoBase64Cache = `data:image/png;base64,${buffer.toString('base64')}`;
            console.log('✅ Logo cargado correctamente, tamaño:', buffer.length, 'bytes');
        } catch (e) {
            console.error('❌ Error leyendo logo:', e.message);
            logoBase64Cache = ''; // sin logo pero no rompe el correo
        }
    }
    return logoBase64Cache;
};

module.exports = { getLogoBase64 };