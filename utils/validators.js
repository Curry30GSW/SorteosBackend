exports.validateAsociado = (data) => {
    if (!data.documento) return 'El documento es requerido';
    if (!data.nombres) return 'Los nombres son requeridos';
    if (data.documento.length < 5) return 'El documento debe tener al menos 5 caracteres';
    if (data.email && !data.email.includes('@')) return 'El email no es válido';
    return null;
};

exports.validateSorteo = (data) => {
    if (!data.nombre) return 'El nombre del sorteo es requerido';
    if (!data.fecha_sorteo) return 'La fecha del sorteo es requerida';
    if (new Date(data.fecha_sorteo) < new Date()) return 'La fecha debe ser futura';
    if (data.boletas_por_persona && data.boletas_por_persona < 1) {
        return 'Las boletas por persona deben ser al menos 1';
    }
    return null;
};