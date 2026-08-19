/**
 * Núcleo compartido: contiene el estado global controlado, utilidades de texto y navegación del acceso inicial.
 * Las funciones exportadas son utilizadas por otros módulos; appState concentra los datos compartidos.
 */

// ============================================================
//  DECLARACIÓN GLOBAL DE FUNCIONES DE NAVEGACIÓN Y LOGIN
// ============================================================
/**
 * Guarda el país elegido y avanza al paso de selección de división.
 */
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

/**
 * Configura el acceso regional, que permite consultar todas las divisiones disponibles.
 */
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

/**
 * Guarda la división elegida y prepara los usuarios permitidos para iniciar sesión.
 */
export function seleccionarDivision(idDivision) {
    appState.divisionSeleccionada = idDivision;
    document.getElementById('step-division').style.display = 'none';
    
    document.getElementById('txt-division-activa-label').textContent = `División: ${idDivision}`;
    document.getElementById('header-division-title').textContent = `BOCADELI - ${idDivision.toUpperCase()}`;
    
    poblarUsuariosPorDivision(idDivision);
    document.getElementById('step-credentials').style.display = 'block';
}

/**
 * Regresa al primer paso del acceso y limpia la selección temporal.
 */
export function volverAPasoPais() {
    document.getElementById('step-division').style.display = 'none';
    document.getElementById('step-pais').style.display = 'block';
}

/**
 * Vuelve desde las credenciales al paso apropiado de selección territorial.
 */
export function volverDesdeLogin() {
    document.getElementById('step-credentials').style.display = 'none';
    if (appState.esAccesoRegional) {
        document.getElementById('step-pais').style.display = 'block';
    } else {
        document.getElementById('step-division').style.display = 'block';
    }
}

/**
 * Llena el selector de usuarios con las cuentas asociadas a una división.
 */
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
        // El selector solo presenta el nombre; rol y división permanecen en el estado
        // para validar permisos después de que el usuario inicia sesión.
        opt.textContent = u.nombre;
        opt.style.color = '#0f172a';
        selectLogin.appendChild(opt);
    });
}

/**
 * Agrega un parámetro único a una URL para solicitar una copia reciente del archivo.
 */
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

/**
 * Solicita un recurso con tiempo límite, mensajes de error claros y conversión al tipo solicitado.
 */
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

/**
 * Abre o cierra una sección lateral y actualiza el icono que indica su estado.
 */
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

/**
 * Unifica nombres de grupos para que variantes equivalentes puedan compararse.
 */
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

/**
 * Convierte texto a una forma comparable: mayúsculas, sin tildes y sin espacios sobrantes.
 */
export function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[-_]/g, ' ');
}

/**
 * Convierte un valor a número decimal y devuelve null cuando no es válido.
 */
export function parsearFloatSeguro(val) {
    if (val === null || val === undefined) return null;
    let str = String(val).trim().replace(',', '.');
    let num = parseFloat(str);
    return isNaN(num) ? null : num;
}

/**
 * Escapa caracteres especiales antes de insertar datos externos dentro del HTML.
 */
export function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * Crea una etiqueta segura con las rutas presentes para incorporarla a archivos descargados.
 */
export function crearEtiquetaRutas(clientes = []) {
    const rutasFiltro = appState.rutasSeleccionadasMultiples || [];
    const rutasDatos = clientes.map(cliente => cliente?.ruta).filter(Boolean);
    const rutas = [...new Set((rutasFiltro.length ? rutasFiltro : rutasDatos).map(String))].sort();
    const texto = rutas.length === 0 ? 'Sin_Ruta' : rutas.length <= 3 ? rutas.join('-') : 'Multiples_Rutas';
    return texto.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

/**
 * Indica si un cliente pertenece al país seleccionado.
 */
export function coincidePais(pSelNorm, c) {
    if (!pSelNorm || pSelNorm === 'todos') return true;
    if (!c._paisNorm) return false;
    if (pSelNorm === c._paisNorm) return true;
    if ((pSelNorm.includes('salvador') || pSelNorm === 'sv') && (c._paisNorm.includes('salvador') || c._paisNorm === 'sv')) return true;
    if ((pSelNorm.includes('guatemala') || pSelNorm === 'gt') && (c._paisNorm.includes('guatemala') || c._paisNorm === 'gt')) return true;
    if ((pSelNorm.includes('honduras') || pSelNorm === 'hn') && (c._paisNorm.includes('honduras') || c._paisNorm === 'hn')) return true;
    return pSelNorm.includes(c._paisNorm) || c._paisNorm.includes(pSelNorm);
}

/**
 * Indica si un cliente pertenece a la división seleccionada.
 */
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

/**
 * Indica si un cliente coincide con el grupo seleccionado.
 */
export function coincideGrupo(gSelNorm, c) {
    if (!gSelNorm || gSelNorm === 'TODOS' || gSelNorm === 'todos') return true;
    const g1 = normalizarTexto(gSelNorm);
    const g2 = normalizarTexto(c.grupo || c._grupoNorm);
    return g1 === g2 || g1.includes(g2) || g2.includes(g1);
}

/**
 * Indica si un cliente coincide con la ruta seleccionada.
 */
export function coincideRuta(rSelNorm, c) {
    if (!rSelNorm || rSelNorm === 'todos' || rSelNorm === 'TODOS') return true;
    const r1 = normalizarTexto(rSelNorm);
    const r2 = normalizarTexto(c.ruta || c._rutaNorm);
    return r1 === r2 || r1.includes(r2) || r2.includes(r1);
}

/**
 * Indica si un cliente está programado para el día seleccionado.
 */
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
/**
 * Crea el estado inicial de la aplicación en un único objeto predecible.
 */
export function crearEstadoInicial() {
    return {
        usuariosRoles: [],
        paisSeleccionado: null,
        divisionSeleccionada: null,
        esAccesoRegional: false,
        respaldoCargaTemporal: null,
        rawClientes: [],
        rawGeocercas: { type: "FeatureCollection", features: [] },
        rawDistribuidoras: { type: "FeatureCollection", features: [] },
        rawRutasDistribuidoras: {},
        datosInicialesListos: false,
        usuarioActual: null,
        swMasivos: false,
        swEspecificos: false,
        swTipoZona: false,
        // Ningún día se filtra al arrancar para evitar renderizar todos los
        // clientes antes de que el usuario indique qué jornada necesita.
        diaSeleccionado: 'NINGUNO',
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
