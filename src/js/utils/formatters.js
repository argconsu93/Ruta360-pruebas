// ============================================================
//  FORMATTERS PARA EXCEL Y FECHAS
// ============================================================

export function formatearFechaParaExcel(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toISOString().slice(0, 10);
}

export function formatearMoneda(valor) {
    if (valor === null || valor === undefined) return '$0.00';
    const num = parseFloat(valor);
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

export function formatearPorcentaje(valor, total) {
    if (!total || total === 0) return '0%';
    const pct = (valor / total) * 100;
    return `${Math.round(pct)}%`;
}

export function formatearTelefono(numero) {
    if (!numero) return 'N/A';
    // Limpiar caracteres no numéricos
    const clean = String(numero).replace(/\D/g, '');
    if (clean.length === 8) {
        return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    return numero;
}

export function truncarTexto(texto, maxLength = 30) {
    if (!texto) return '';
    if (texto.length <= maxLength) return texto;
    return texto.slice(0, maxLength) + '...';
}
