// ============================================================
//  DECLARACIÓN GLOBAL DE FUNCIONES DE NAVEGACIÓN Y LOGIN
// ============================================================
export function seleccionarPais(codigoPais, nombrePais) {
    appState.paisSeleccionado = codigoPais;
    appState.esAccesoRegional = false;
    document.getElementById('step-pais').style.display = 'none';
    
    const containerDivs = document.getElementById('container-divisiones');
    containerDivs.innerHTML = '';
    
    const divisiones = DIVISIONES_POR_PAIS[codigoPais] || [{ id: codigoPais + ' Centro', nombre: codigoPais + ' Centro' }];
    divisiones.forEach(d => {
        const btn = document.createElement('button');
        btn.className = 'btn-division';
        btn.textContent = d.nombre;
        btn.onclick = function() { seleccionarDivision(d.id); };
        containerDivs.appendChild(btn);
    });

    document.getElementById('txt-sub-pais').textContent = `Divisiones para ${nombrePais}:`;
    document.getElementById('step-division').style.display = 'block';
}

export function seleccionarAccesoRegional() {
    appState.esAccesoRegional = true;
    appState.paisSeleccionado = 'TODOS';
    appState.divisionSeleccionada = 'TODOS';

    document.getElementById('step-pais').style.display = 'none';
    document.getElementById('txt-division-activa-label').textContent = `Acceso Regional`;
    document.getElementById('header-division-title').textContent = `BOCADELI - REGIONAL`;

    poblarUsuariosPorDivision('TODOS');
    document.getElementById('step-credentials').style.display = 'block';
}

export function seleccionarDivision(idDivision) {
    appState.divisionSeleccionada = idDivision;
    document.getElementById('step-division').style.display = 'none';
    
    document.getElementById('txt-division-activa-label').textContent = `División: ${idDivision}`;
    document.getElementById('header-division-title').textContent = `BOCADELI - ${idDivision.toUpperCase()}`;
    
    poblarUsuariosPorDivision(idDivision);
    document.getElementById('step-credentials').style.display = 'block';
}

export function volverAPasoPais() {
    document.getElementById('step-division').style.display = 'none';
    document.getElementById('step-pais').style.display = 'block';
}

export function volverDesdeLogin() {
    document.getElementById('step-credentials').style.display = 'none';
    if (appState.esAccesoRegional) {
        document.getElementById('step-pais').style.display = 'block';
    } else {
        document.getElementById('step-division').style.display = 'block';
    }
}

export function poblarUsuariosPorDivision(division) {
    const selectLogin = document.getElementById('select-usuario-login');
    selectLogin.innerHTML = '<option value="" disabled selected hidden>Seleccione su nombre</option>';
    
    let filtrados = appState.usuariosRoles.filter(u => {
        if (appState.esAccesoRegional) {
            return (u.pais.toUpperCase() === 'TODOS' || u.division.toUpperCase() === 'TODOS' || u.rol === 'Administrador' || u.rol === 'Jefatura');
        }
        
        const nombrePaisSel = PAISES_MAPA_NOMBRES[appState.paisSeleccionado] || '';
        const matchPais = (u.pais === 'TODOS' || u.pais.toLowerCase() === nombrePaisSel.toLowerCase() || u.pais.toLowerCase() === (appState.paisSeleccionado || '').toLowerCase());
        const matchDiv = (u.division === 'TODOS' || u.division.toLowerCase() === division.toLowerCase() || division === 'TODOS');
        return matchPais && matchDiv;
    });

    if (filtrados.length === 0) {
        filtrados = appState.usuariosRoles;
    }

    const sorted = [...filtrados].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    sorted.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.nombre;
        opt.textContent = `${u.nombre} (${u.rol} - ${u.division})`;
        opt.style.color = '#0f172a';
        selectLogin.appendChild(opt);
    });
}

export function getAntiCacheUrl(url) {
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'v=' + new Date().getTime();
}

export class ErrorSolicitud extends Error {
    constructor(mensaje, { url, estado = null, causa = null } = {}) {
        super(mensaje);
        this.name = 'ErrorSolicitud';
        this.url = url;
        this.estado = estado;
        this.cause = causa;
    }
}

export async function solicitarRecurso(url, { tipo = 'text', timeoutMs = 15000, antiCache = false } = {}) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeoutMs);
    const urlFinal = antiCache ? getAntiCacheUrl(url) : url;

    try {
        const respuesta = await fetch(urlFinal, { signal: controller.signal });
        if (!respuesta.ok) {
            throw new ErrorSolicitud(`La solicitud respondió HTTP ${respuesta.status}.`, {
                url,
                estado: respuesta.status
            });
        }
        return tipo === 'json' ? await respuesta.json() : await respuesta.text();
    } catch (error) {
        if (error instanceof ErrorSolicitud) throw error;
        const esTimeout = error && error.name === 'AbortError';
        throw new ErrorSolicitud(
            esTimeout ? `La solicitud excedió ${timeoutMs} ms.` : 'No fue posible completar la solicitud.',
            { url, causa: error }
        );
    } finally {
        clearTimeout(temporizador);
    }
}

export function toggleAccordion(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.toggle('open');
}

// ============================================================
//  CONFIGURACIÓN Y REGIONALIZACIÓN
// ============================================================
export const DIVISIONES_POR_PAIS = {
    'GT': [ { id: 'GT Centro', nombre: 'GT Centro' }, { id: 'GT Norte', nombre: 'GT Norte' }, { id: 'GT Sur', nombre: 'GT Sur' } ],
    'SV': [ { id: 'SV Occidente', nombre: 'SV Occidente' }, { id: 'SV Centro', nombre: 'SV Centro' }, { id: 'SV Oriente', nombre: 'SV Oriente' } ],
    'HN': [ { id: 'HN Centro', nombre: 'HN Centro' }, { id: 'HN Norte', nombre: 'HN Norte' } ]
};

export const PAISES_MAPA_NOMBRES = {
    'GT': 'Guatemala',
    'SV': 'El Salvador',
    'HN': 'Honduras'
};

export const MAPEO_RUTAS_GRUPOS = {
    '1.1.54': 'GRUPO 02',
    '1.1.51': 'GRUPO 05',
    '1.2.45': 'GRUPO 06',
    '1.2.46': 'GRUPO 06'
};

export function normalizarNombreGrupo(gRaw) {
    if (!gRaw) return "Sin Grupo";
    let str = String(gRaw).trim();
    if (MAPEO_RUTAS_GRUPOS[str]) return MAPEO_RUTAS_GRUPOS[str];
    
    let upperStr = str.toUpperCase().replace(/_/g, ' ');
    if (upperStr === 'SIN GRUPO' || upperStr === 'S/G' || upperStr === 'NAN' || upperStr === 'UNDEFINED' || upperStr === 'NULL') {
        return "Sin Grupo";
    }
    
    const m = upperStr.match(/([0-9]+)/);
    if (m) {
        return "GRUPO " + m[1].padStart(2, '0');
    }
    return upperStr;
}

export function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[-_]/g, ' ');
}

export function parsearFloatSeguro(val) {
    if (val === null || val === undefined) return null;
    let str = String(val).trim().replace(',', '.');
    let num = parseFloat(str);
    return isNaN(num) ? null : num;
}

export function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function coincidePais(pSelNorm, c) {
    if (!pSelNorm || pSelNorm === 'todos') return true;
    if (!c._paisNorm) return false;
    if (pSelNorm === c._paisNorm) return true;
    if ((pSelNorm.includes('salvador') || pSelNorm === 'sv') && (c._paisNorm.includes('salvador') || c._paisNorm === 'sv')) return true;
    if ((pSelNorm.includes('guatemala') || pSelNorm === 'gt') && (c._paisNorm.includes('guatemala') || c._paisNorm === 'gt')) return true;
    if ((pSelNorm.includes('honduras') || pSelNorm === 'hn') && (c._paisNorm.includes('honduras') || c._paisNorm === 'hn')) return true;
    return pSelNorm.includes(c._paisNorm) || c._paisNorm.includes(pSelNorm);
}

export function coincideDivision(dSelClean, c) {
    if (!dSelClean || dSelClean === 'todos') return true;
    if (!c._divClean && !c.division) return false;
    
    let divCliente = normalizarTexto(c.division || c._divClean || '');
    let divSeleccionada = normalizarTexto(dSelClean);

    if (divCliente === divSeleccionada) return true;
    
    let palabraCliente = divCliente.replace(/^(sv|gt|hn)\s*/, '').trim();
    let palabraSel = divSeleccionada.replace(/^(sv|gt|hn)\s*/, '').trim();

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

export const COLORES_DIAS = {
    'Lunes': '#b91c1c',
    'Martes': '#0369a1',
    'Miércoles': '#15803d',
    'Jueves': '#5b21b6',
    'Viernes': '#c2410c',
    'Sábado': '#be185d'
};

// ============================================================
//  ESTADO CENTRALIZADO DE LA APLICACIÓN
// ============================================================
export function crearEstadoInicial() {
    return {
        usuariosRoles: [],
        paisSeleccionado: null,
        divisionSeleccionada: null,
        esAccesoRegional: false,
        rawClientes: [],
        rawGeocercas: { type: "FeatureCollection", features: [] },
        rawDistribuidoras: { type: "FeatureCollection", features: [] },
        rawRutasDistribuidoras: {},
        usuarioActual: null,
        swMasivos: false,
        swEspecificos: false,
        swTipoZona: false,
        diaSeleccionado: 'TODOS',
        map: null,
        clusterMarkersGroup: null,
        geocercasLayerGroup: null,
        distribuidorasLayerGroup: null,
        rutaOptimaLayerGroup: null,
        clienteMarkersMap: {},
        clientesVisitadosMap: new Map(),
        registroVisitasDetalleMap: new Map(),
        clienteEnEdicion: null,
        tempGpsLat: null,
        tempGpsLng: null,
        ultimoClientesFiltrados: [],
        ultimoClientesFuera: [],
        paisesSeleccionadosMultiples: [],
        divisionesSeleccionadasMultiples: [],
        gruposSeleccionadosMultiples: [],
        rutasSeleccionadasMultiples: [],
        ultimaNotificacionesiOS: '',
        ultimaSecuenciaOptimizada: [],
        isSatelliteActive: false,
        geocercasBBoxCache: [],
        searchDebounceTimeout: null,
        simIntervalId: null,
        simCurrentStep: 0,
        simTotalSteps: 0,
        simPathCoordinates: [],
        simTruckMarker: null,
        simIsPlaying: false,
        simCheckmarkMarkers: [],
    };
}

export const appState = crearEstadoInicial();

// ============================================================
//  CARGA DE DATOS DESDE REPOSITORIO (RUTAS EXACTAS DEFINITIVAS)
// ============================================================
