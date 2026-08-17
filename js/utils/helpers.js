/**
 * ============================================================
 * UTILS/HELPERS.JS - FUNCIONES UTILITARIAS
 * Normalización, parseo, filtrado y colores
 * ============================================================
 */

// ============================================================
// NORMALIZACIÓN Y PARSING
// ============================================================

export function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[-_]/g, ' ');
}

export function parsearFloatSeguro(val) {
    if (val === null || val === undefined) return null;
    const str = String(val).trim().replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

export function normalizarNombreGrupo(gRaw, MAPEO_RUTAS_GRUPOS = {}) {
    if (!gRaw) return "Sin Grupo";
    const str = String(gRaw).trim();
    if (MAPEO_RUTAS_GRUPOS[str]) return MAPEO_RUTAS_GRUPOS[str];
    
    const upperStr = str.toUpperCase().replace(/_/g, ' ');
    if (upperStr === 'SIN GRUPO' || upperStr === 'S/G' || upperStr === 'NAN' || 
        upperStr === 'UNDEFINED' || upperStr === 'NULL') {
        return "Sin Grupo";
    }
    
    const m = upperStr.match(/([0-9]+)/);
    if (m) {
        return "GRUPO " + m[1].padStart(2, '0');
    }
    return upperStr;
}

export function obtenerValorPropiedad(props, ...nombresPosibles) {
    if (!props) return '';
    for (let nombre of nombresPosibles) {
        if (props[nombre] !== undefined && props[nombre] !== null && String(props[nombre]).trim() !== '') {
            return String(props[nombre]).trim();
        }
    }
    const llaves = Object.keys(props);
    for (let nombre of nombresPosibles) {
        const nombreL = nombre.toLowerCase();
        const llaveEncontrada = llaves.find(k => {
            const kL = k.toLowerCase();
            return kL === nombreL || kL.endsWith('_' + nombreL) || kL.includes(nombreL);
        });
        if (llaveEncontrada && props[llaveEncontrada] !== undefined && props[llaveEncontrada] !== null && String(props[llaveEncontrada]).trim() !== '') {
            return String(props[llaveEncontrada]).trim();
        }
    }
    return '';
}

// ============================================================
// PARSING DE CLIENTES Y GEOCERCAS
// ============================================================

export function parsearFilasClientes(parsedData) {
    if (!parsedData || parsedData.length === 0) return [];
    
    return parsedData.map(row => {
        const keys = Object.keys(row);
        const normKeys = keys.map(k => ({
            original: k,
            clean: k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, '')
        }));

        const findKey = (terms) => {
            const found = normKeys.find(nk => terms.some(t => nk.clean.includes(t)));
            return found ? found.original : null;
        };

        const cCol = findKey(['codigocliente', 'codcliente', 'codigo', 'cod']) || keys[0];
        const nCol = findKey(['nombrecliente', 'nomcliente', 'nombre', 'razonsocial', 'cliente']) || 
                    (keys[1] !== cCol ? keys[1] : keys[0]);
        const gCol = findKey(['grupo', 'grup']) || 'grupo';
        const rCol = findKey(['ruta', 'route']) || 'ruta';
        const dCol = findKey(['dia', 'day']) || 'dia';
        const latCol = findKey(['latitud', 'lat', 'y']) || 'latitud';
        const lngCol = findKey(['longitud', 'long', 'lng', 'lon', 'x']) || 'longitud';
        const dirCol = findKey(['direccion', 'domicilio', 'dir']) || 'direccion';
        const telCol = findKey(['telefono', 'tel', 'phone', 'celular']) || 'telefono';
        const paisCol = findKey(['pais', 'country']) || 'pais';
        const divCol = findKey(['division', 'regional', 'region', 'div']) || 'division';

        let rVal = row[rCol] ? String(row[rCol]).trim() : "S/R";
        if (rVal.includes(',')) rVal = "S/R";

        let gRaw = row[gCol] ? String(row[gCol]).trim() : "Sin Grupo";
        let grupoClean = normalizarNombreGrupo(gRaw);

        let pVal = row[paisCol] ? String(row[paisCol]).trim() : "El Salvador";
        let divVal = row[divCol] ? String(row[divCol]).trim() : "SV Centro";
        let nomVal = String(row[nCol] || 'Cliente').trim();
        let codVal = String(row[cCol] || 'S/C').trim();
        let diaVal = row[dCol] ? String(row[dCol]).trim() : 'Sin Día';
        let telVal = row[telCol] ? String(row[telCol]).trim() : 'Sin teléfono';

        return {
            codigo: codVal,
            nombre: nomVal,
            grupo: grupoClean,
            ruta: rVal,
            dia: diaVal,
            direccion: row[dirCol] ? String(row[dirCol]).trim() : 'Sin dirección',
            telefono: telVal,
            pais: pVal,
            division: divVal,
            lat: parsearFloatSeguro(row[latCol]),
            lng: parsearFloatSeguro(row[lngCol]),
            
            _paisNorm: normalizarTexto(pVal),
            _divClean: normalizarTexto(divVal).replace(/^(sv|gt|hn)\s*/, ''),
            _grupoNorm: grupoClean,
            _rutaNorm: rVal.toLowerCase(),
            _diaNorm: normalizarTexto(diaVal),
            _searchCache: (nomVal + ' ' + codVal).toLowerCase()
        };
    });
}

export function procesarPropiedadesGeocercas(geocercas) {
    if (!geocercas || !geocercas.features) return;
    geocercas.features.forEach(feat => {
        const props = feat.properties || {};
        
        let rutaName = obtenerValorPropiedad(props, 'Ruta', 'RUTA', 'ruta', 'COD_RUTA', 'Cod_Ruta', 'Name', 'name');
        let paisClean = obtenerValorPropiedad(props, 'Pais', 'PAIS', 'pais', 'Country');
        let divisionClean = obtenerValorPropiedad(props, 'Division', 'DIVISION', 'division');
        let grupoClean = obtenerValorPropiedad(props, 'Grupo', 'GRUPO', 'grupo', 'GROUP');

        if (!rutaName) {
            const searchStr = `${props.description || ''} ${props.Name || ''} ${props.name || ''}`;
            const matchRuta = searchStr.match(/RUT[A]?[-_:]?\s*([A-Z0-9_-]+)/i);
            if (matchRuta) rutaName = matchRuta[1];
        }

        feat.properties.ruta_clean = rutaName || 'Sin Ruta';
        feat.properties._rutaNorm = (rutaName || '').toLowerCase();
        feat.properties.grupo_clean = normalizarNombreGrupo(grupoClean || 'Sin Grupo');
        feat.properties.pais_clean = paisClean || '';
        feat.properties.division_clean = divisionClean || '';
    });
}

export function sincronizarGruposClientes(clientes, geocercas, MAPEO_RUTAS_GRUPOS) {
    if (!clientes || !geocercas || !geocercas.features) return;
    
    const rutaToGrupoMap = {};
    for (let r in MAPEO_RUTAS_GRUPOS) {
        rutaToGrupoMap[r.toLowerCase().trim()] = MAPEO_RUTAS_GRUPOS[r];
    }
    
    geocercas.features.forEach(f => {
        const props = f.properties || {};
        const rClean = (props.ruta_clean || props.RUTA || props.Ruta || '').toLowerCase().trim();
        const gClean = props.grupo_clean || props.GRUPO || props.Grupo;
        if (rClean && gClean && gClean !== 'Sin Grupo') {
            rutaToGrupoMap[rClean] = normalizarNombreGrupo(gClean);
        }
    });
    
    clientes.forEach(c => {
        const rNorm = (c.ruta || '').toLowerCase().trim();
        if ((!c.grupo || c.grupo === 'Sin Grupo') && rutaToGrupoMap[rNorm]) {
            c.grupo = rutaToGrupoMap[rNorm];
            c._grupoNorm = rutaToGrupoMap[rNorm];
        }
    });
}

// ============================================================
// FUNCIONES DE FILTRADO
// ============================================================

export function coincidePais(pSelNorm, c) {
    if (!pSelNorm || pSelNorm === 'todos') return true;
    if (!c._paisNorm) return false;
    if (pSelNorm === c._paisNorm) return true;
    if ((pSelNorm.includes('salvador') || pSelNorm === 'sv') && 
        (c._paisNorm.includes('salvador') || c._paisNorm === 'sv')) return true;
    if ((pSelNorm.includes('guatemala') || pSelNorm === 'gt') && 
        (c._paisNorm.includes('guatemala') || c._paisNorm === 'gt')) return true;
    if ((pSelNorm.includes('honduras') || pSelNorm === 'hn') && 
        (c._paisNorm.includes('honduras') || c._paisNorm === 'hn')) return true;
    return pSelNorm.includes(c._paisNorm) || c._paisNorm.includes(pSelNorm);
}

export function coincideDivision(dSelClean, c) {
    if (!dSelClean || dSelClean === 'todos') return true;
    if (!c._divClean && !c.division) return false;
    
    const divCliente = normalizarTexto(c.division || c._divClean || '');
    const divSeleccionada = normalizarTexto(dSelClean);

    if (divCliente === divSeleccionada) return true;
    
    const palabraCliente = divCliente.replace(/^(sv|gt|hn)\s*/, '').trim();
    const palabraSel = divSeleccionada.replace(/^(sv|gt|hn)\s*/, '').trim();

    return palabraCliente.includes(palabraSel) || palabraSel.includes(palabraCliente);
}

export function coincideGrupo(gSelNorm, c) {
    if (!gSelNorm || gSelNorm === 'TODOS' || gSelNorm === 'todos') return true;
    const g1 = normalizarTexto(gSelNorm);
    const g2 = normalizarTexto(c.grupo || c._grupoNorm);
    return g1 === g2 || g1.includes(g2) || g2.includes(g1);
}

export function coincideRuta(rSelNorm, c) {
    if (!rSelNorm || rSelNorm === 'todos' || rSelNorm === 'TODOS') return true;
    const r1 = normalizarTexto(rSelNorm);
    const r2 = normalizarTexto(c.ruta || c._rutaNorm);
    return r1 === r2 || r1.includes(r2) || r2.includes(r1);
}

export function coincideDia(diaSelNorm, c) {
    if (!diaSelNorm || diaSelNorm === 'ninguno') return false;
    if (diaSelNorm === 'todos') return true;
    if (!c._diaNorm) return false;

    if (diaSelNorm === c._diaNorm) return true;
    if (c._diaNorm.length >= 3 && diaSelNorm.substring(0, 3) === c._diaNorm.substring(0, 3)) return true;
    if (diaSelNorm.length >= 3 && c._diaNorm.substring(0, 3) === diaSelNorm.substring(0, 3)) return true;

    const mapNum = { 'lunes': '1', 'martes': '2', 'miercoles': '3', 'jueves': '4', 'viernes': '5', 'sabado': '6' };
    if (mapNum[diaSelNorm] && mapNum[diaSelNorm] === c._diaNorm) return true;

    return false;
}

// ============================================================
// FUNCIONES DE COLOR
// ============================================================

const PALETA_COLORES_SOLIDOS = [
    '#0369a1', '#15803d', '#0d9488', '#b45309', '#5b21b6', '#be185d', 
    '#475569', '#374151', '#4f46e5', '#047857', '#0284c7', '#059669', 
    '#d97706', '#9333ea', '#e11d48', '#64748b', '#1e3a8a', '#7c2d12'
];

export function obtenerColorPorPais(paisStr) {
    if (!paisStr) return '#4f46e5';
    const norm = String(paisStr).toUpperCase().trim();
    const COLORES_PAIS = {
        'EL SALVADOR': '#0369a1',
        'GUATEMALA': '#b45309',
        'HONDURAS': '#15803d',
        'SV': '#0369a1',
        'GT': '#b45309',
        'HN': '#15803d'
    };
    for (let key in COLORES_PAIS) {
        if (norm.includes(key)) return COLORES_PAIS[key];
    }
    return obtenerColorDinamico(paisStr);
}

export function obtenerColorPorCanal(canalStr) {
    if (!canalStr) return '#64748b';
    const norm = String(canalStr).toUpperCase().trim();
    if (norm.includes('DETALLE')) return '#15803d';
    if (norm.includes('PREFERENCIAL')) return '#0369a1';
    if (norm.includes('MAYOREO')) return '#b45309';
    if (norm.includes('SUPERMERCADO')) return '#7c2d12';
    if (norm.includes('DEDICADA')) return '#5b21b6';
    if (norm.includes('EVENTOS')) return '#be185d';
    if (norm.includes('DISTRIBUIDOR')) return '#0d9488';
    return obtenerColorDinamico(canalStr);
}

export function obtenerColorPorTipoZona(tzStr) {
    if (!tzStr) return '#64748b';
    const norm = String(tzStr).toUpperCase().trim();
    if (norm.includes('URBANA')) return '#0369a1';
    if (norm.includes('RURAL')) return '#15803d';
    if (norm.includes('FORANEA')) return '#b45309';
    if (norm.includes('CONTORNO')) return '#5b21b6';
    return obtenerColorDinamico(tzStr);
}

export function obtenerColorDinamico(valor) {
    if (!valor || valor === 'N/A' || valor === 'N/D') return '#0369a1';
    let hash = 0;
    const str = String(valor).toLowerCase().trim();
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALETA_COLORES_SOLIDOS.length;
    return PALETA_COLORES_SOLIDOS[index];
}

// ============================================================
// FUNCIONES DE FORMATO
// ============================================================

export function formatearMinutosAHorasMinutos(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return `${h}h ${m}m`;
}

export function formatearMinutosAHora12(totalMin) {
    const totalSegundos = Math.round(totalMin * 60);
    const mAbs = Math.floor(totalSegundos / 60);
    const mNorm = mAbs % 1440;
    const h = Math.floor(mNorm / 60);
    const m = mNorm % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const hStr = h12 < 10 ? '0' + h12 : h12;
    const mStr = m < 10 ? '0' + m : m;
    return `${hStr}:${mStr} ${ampm}`;
}

export function esRolAvanzado(user) {
    return user && ['Jefatura', 'Analista', 'Administrador'].includes(user.rol);
}

// ============================================================
// EXPORTACIÓN DE CONSTANTES
// ============================================================

export const MAPEO_RUTAS_GRUPOS = {
    '1.1.54': 'GRUPO 02',
    '1.1.51': 'GRUPO 05',
    '1.2.45': 'GRUPO 06',
    '1.2.46': 'GRUPO 06'
};
