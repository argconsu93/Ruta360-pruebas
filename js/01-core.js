// ============================================================
//  DECLARACIÓN GLOBAL DE FUNCIONES DE NAVEGACIÓN Y LOGIN
// ============================================================
let paisSeleccionado = null;
let divisionSeleccionada = null;
let esAccesoRegionalGlobal = false;

function seleccionarPais(codigoPais, nombrePais) {
    paisSeleccionado = codigoPais;
    esAccesoRegionalGlobal = false;
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

function seleccionarAccesoRegional() {
    esAccesoRegionalGlobal = true;
    paisSeleccionado = 'TODOS';
    divisionSeleccionada = 'TODOS';

    document.getElementById('step-pais').style.display = 'none';
    document.getElementById('txt-division-activa-label').textContent = `Acceso Regional`;
    document.getElementById('header-division-title').textContent = `BOCADELI - REGIONAL`;

    poblarUsuariosPorDivision('TODOS');
    document.getElementById('step-credentials').style.display = 'block';
}

function seleccionarDivision(idDivision) {
    divisionSeleccionada = idDivision;
    document.getElementById('step-division').style.display = 'none';
    
    document.getElementById('txt-division-activa-label').textContent = `División: ${idDivision}`;
    document.getElementById('header-division-title').textContent = `BOCADELI - ${idDivision.toUpperCase()}`;
    
    poblarUsuariosPorDivision(idDivision);
    document.getElementById('step-credentials').style.display = 'block';
}

function volverAPasoPais() {
    document.getElementById('step-division').style.display = 'none';
    document.getElementById('step-pais').style.display = 'block';
}

function volverDesdeLogin() {
    document.getElementById('step-credentials').style.display = 'none';
    if (esAccesoRegionalGlobal) {
        document.getElementById('step-pais').style.display = 'block';
    } else {
        document.getElementById('step-division').style.display = 'block';
    }
}

function poblarUsuariosPorDivision(division) {
    const selectLogin = document.getElementById('select-usuario-login');
    selectLogin.innerHTML = '<option value="" disabled selected hidden>Seleccione su nombre</option>';
    
    let filtrados = USUARIOS_ROLES.filter(u => {
        if (esAccesoRegionalGlobal) {
            return (u.pais.toUpperCase() === 'TODOS' || u.division.toUpperCase() === 'TODOS' || u.rol === 'Administrador' || u.rol === 'Jefatura');
        }
        
        const nombrePaisSel = PAISES_MAPA_NOMBRES[paisSeleccionado] || '';
        const matchPais = (u.pais === 'TODOS' || u.pais.toLowerCase() === nombrePaisSel.toLowerCase() || u.pais.toLowerCase() === (paisSeleccionado || '').toLowerCase());
        const matchDiv = (u.division === 'TODOS' || u.division.toLowerCase() === division.toLowerCase() || division === 'TODOS');
        return matchPais && matchDiv;
    });

    if (filtrados.length === 0) {
        filtrados = USUARIOS_ROLES;
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

function getAntiCacheUrl(url) {
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'v=' + new Date().getTime();
}

function toggleAccordion(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.classList.toggle('open');
}

// ============================================================
//  CONFIGURACIÓN Y REGIONALIZACIÓN
// ============================================================
const DIVISIONES_POR_PAIS = {
    'GT': [ { id: 'GT Centro', nombre: 'GT Centro' }, { id: 'GT Norte', nombre: 'GT Norte' }, { id: 'GT Sur', nombre: 'GT Sur' } ],
    'SV': [ { id: 'SV Occidente', nombre: 'SV Occidente' }, { id: 'SV Centro', nombre: 'SV Centro' }, { id: 'SV Oriente', nombre: 'SV Oriente' } ],
    'HN': [ { id: 'HN Centro', nombre: 'HN Centro' }, { id: 'HN Norte', nombre: 'HN Norte' } ]
};

const PAISES_MAPA_NOMBRES = {
    'GT': 'Guatemala',
    'SV': 'El Salvador',
    'HN': 'Honduras'
};

let USUARIOS_ROLES = [
    { nombre: "JORGE LUIS PINEDA", rol: "Supervisor", pais: "El Salvador", division: "SV Centro", grupo: "GRUPO 01", pass: "G01" },
    { nombre: "NOE HERNANDEZ", rol: "Jefatura", pais: "El Salvador", division: "SV Centro", grupo: "TODOS", pass: "BOCADELI" },
    { nombre: "ISRAEL CONSUEGRA", rol: "Administrador", pais: "TODOS", division: "TODOS", grupo: "TODOS", pass: "SVCENTRO" }
];

const MAPEO_RUTAS_GRUPOS = {
    '1.1.54': 'GRUPO 02',
    '1.1.51': 'GRUPO 05',
    '1.2.45': 'GRUPO 06',
    '1.2.46': 'GRUPO 06'
};

function normalizarNombreGrupo(gRaw) {
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

function normalizarTexto(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[-_]/g, ' ');
}

function parsearFloatSeguro(val) {
    if (val === null || val === undefined) return null;
    let str = String(val).trim().replace(',', '.');
    let num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function coincidePais(pSelNorm, c) {
    if (!pSelNorm || pSelNorm === 'todos') return true;
    if (!c._paisNorm) return false;
    if (pSelNorm === c._paisNorm) return true;
    if ((pSelNorm.includes('salvador') || pSelNorm === 'sv') && (c._paisNorm.includes('salvador') || c._paisNorm === 'sv')) return true;
    if ((pSelNorm.includes('guatemala') || pSelNorm === 'gt') && (c._paisNorm.includes('guatemala') || c._paisNorm === 'gt')) return true;
    if ((pSelNorm.includes('honduras') || pSelNorm === 'hn') && (c._paisNorm.includes('honduras') || c._paisNorm === 'hn')) return true;
    return pSelNorm.includes(c._paisNorm) || c._paisNorm.includes(pSelNorm);
}

function coincideDivision(dSelClean, c) {
    if (!dSelClean || dSelClean === 'todos') return true;
    if (!c._divClean && !c.division) return false;
    
    let divCliente = normalizarTexto(c.division || c._divClean || '');
    let divSeleccionada = normalizarTexto(dSelClean);

    if (divCliente === divSeleccionada) return true;
    
    let palabraCliente = divCliente.replace(/^(sv|gt|hn)\s*/, '').trim();
    let palabraSel = divSeleccionada.replace(/^(sv|gt|hn)\s*/, '').trim();

    return palabraCliente.includes(palabraSel) || palabraSel.includes(palabraCliente);
}

function coincideGrupo(gSelNorm, c) {
    if (!gSelNorm || gSelNorm === 'TODOS' || gSelNorm === 'todos') return true;
    const g1 = normalizarTexto(gSelNorm);
    const g2 = normalizarTexto(c.grupo || c._grupoNorm);
    return g1 === g2 || g1.includes(g2) || g2.includes(g1);
}

function coincideRuta(rSelNorm, c) {
    if (!rSelNorm || rSelNorm === 'todos' || rSelNorm === 'TODOS') return true;
    const r1 = normalizarTexto(rSelNorm);
    const r2 = normalizarTexto(c.ruta || c._rutaNorm);
    return r1 === r2 || r1.includes(r2) || r2.includes(r1);
}

function coincideDia(diaSelNorm, c) {
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

const COLORES_DIAS = {
    'Lunes': '#b91c1c',
    'Martes': '#0369a1',
    'Miércoles': '#15803d',
    'Jueves': '#5b21b6',
    'Viernes': '#c2410c',
    'Sábado': '#be185d'
};

// ============================================================
//  VARIABLES GLOBALES
// ============================================================
let rawClientes = [];
let rawGeocercas = { type: "FeatureCollection", features: [] };
let rawDistribuidoras = { type: "FeatureCollection", features: [] };
let rawRutasDistribuidoras = {};
let usuarioActual = null;
let swMasivos = false;
let swEspecificos = false;
let swTipoZona = false;
let diaSeleccionado = 'TODOS';
let map = null;

let clusterMarkersGroup = null;
let geocercasLayerGroup = null;
let distribuidorasLayerGroup = null;
let rutaOptimaLayerGroup = null;

const clienteMarkersMap = {};
const clientesVisitadosMap = new Map();
const registroVisitasDetalleMap = new Map();

let clienteEnEdicion = null;
let tempGpsLat = null;
let tempGpsLng = null;

let ultimoClientesFiltrados = [];
let ultimoClientesFuera = [];

let paisesSeleccionadosMultiples = [];
let divisionesSeleccionadasMultiples = [];
let gruposSeleccionadosMultiples = [];
let rutasSeleccionadasMultiples = [];

let ultimaNotificacionesiOS = "";
let ultimaSecuenciaOptimizada = [];
let isSatelliteActive = false;
let geocercasBBoxCache = [];

let searchDebounceTimeout = null;

// Variables de Simulación de Ruta
let simIntervalId = null;
let simCurrentStep = 0;
let simTotalSteps = 0;
let simPathCoordinates = [];
let simTruckMarker = null;
let simIsPlaying = false;
let simCheckmarkMarkers = [];

// ============================================================
//  CARGA DE DATOS DESDE REPOSITORIO (RUTAS EXACTAS DEFINITIVAS)
// ============================================================
