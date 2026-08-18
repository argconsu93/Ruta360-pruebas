import {
    ErrorSolicitud, MAPEO_RUTAS_GRUPOS, appState, normalizarNombreGrupo,
    normalizarTexto, parsearFloatSeguro, solicitarRecurso
} from './01-core.js';
import { aplicarFiltros } from './05-filters.js';

export const LIMITES_CARGA = Object.freeze({
    csvBytes: 75 * 1024 * 1024,
    geojsonBytes: 30 * 1024 * 1024
});

export function validarArchivoCarga(file, { extensiones, maxBytes }) {
    if (!file || typeof file.name !== 'string') {
        throw new Error('No se recibió un archivo válido.');
    }
    const nombre = file.name.toLowerCase();
    if (!extensiones.some(extension => nombre.endsWith(extension))) {
        throw new Error(`Extensión no permitida. Use: \${extensiones.join(', ')}.`);
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
        throw new Error('El archivo está vacío.');
    }
    if (file.size > maxBytes) {
        const maxMb = Math.round(maxBytes / (1024 * 1024));
        throw new Error(`El archivo supera el límite de \${maxMb} MB.`);
    }
}

export function validarColeccionGeoJSON(datos) {
    if (!datos || datos.type !== 'FeatureCollection' || !Array.isArray(datos.features)) {
        throw new Error('El contenido debe ser una colección GeoJSON válida.');
    }
    if (datos.features.length === 0) {
        throw new Error('El GeoJSON no contiene elementos.');
    }
    const geometriaInvalida = datos.features.some(feature =>
        !feature || feature.type !== 'Feature' || !feature.geometry ||
        !['Polygon', 'MultiPolygon'].includes(feature.geometry.type) ||
        !Array.isArray(feature.geometry.coordinates)
    );
    if (geometriaInvalida) {
        throw new Error('Todas las geocercas deben tener geometría Polygon o MultiPolygon.');
    }
    return datos;
}

export function validarClientesImportados(clientes, erroresParseo = []) {
    if (erroresParseo.some(error => error && error.type === 'Quotes')) {
        throw new Error('El CSV contiene comillas o columnas mal formadas.');
    }
    if (!Array.isArray(clientes) || clientes.length === 0) {
        throw new Error('El CSV no contiene clientes.');
    }
    if (!clientes.some(cliente => cliente.codigo && cliente.codigo !== 'S/C')) {
        throw new Error('No se encontró una columna válida de código de cliente.');
    }
    return clientes;
}

export function cargarUsuariosDesdeCSV() {
    return solicitarRecurso('data/usuarios.csv', { antiCache: true })
        .then(csvText => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 0) {
                        appState.usuariosRoles = results.data.map(u => {
                            const pRaw = (u.Pais || u.PAIS || u.pais || '').trim();
                            const dRaw = (u.Division || u.DIVISION || u.division || '').trim();
                            const gRaw = (u.Grupo || u.GRUPO || u.grupo || '').trim();

                            return {
                                nombre: (u.Nombres || u.NOMBRE || u.Usuario || u.nombre || '').trim(),
                                rol: (u.Roles || u.ROL || u.rol || "Supervisor").trim(),
                                pais: (pRaw.toUpperCase() === 'REGION' || pRaw.toUpperCase() === 'TODOS' || !pRaw) ? 'TODOS' : pRaw,
                                division: (!dRaw || dRaw.toUpperCase() === 'REGION' || dRaw.toUpperCase() === 'TODOS') ? 'TODOS' : dRaw,
                                grupo: (!gRaw || gRaw.toUpperCase() === 'TODOS') ? 'TODOS' : gRaw,
                                pass: (u.Contraseña || u.PASSWORD || u.pass || '').trim()
                            };
                        });
                    }
                }
            });
        })
        .catch(err => {
            appState.usuariosRoles = [];
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = '⚠️ No fue posible cargar los usuarios. Recargue la página o contacte al administrador.';
            errorDiv.style.display = 'block';
            console.error('Error cargando usuarios:', err);
        });
}

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
        const nCol = findKey(['nombrecliente', 'nomcliente', 'nombre', 'razonsocial', 'cliente']) || (keys[1] !== cCol ? keys[1] : keys[0]);
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
        if (MAPEO_RUTAS_GRUPOS[rVal]) grupoClean = MAPEO_RUTAS_GRUPOS[rVal];

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

export function cargarClientes() {
    return solicitarRecurso('clientes.csv', { antiCache: true })
        .then(csvText => {
            return new Promise((resolve) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        const clientes = parsearFilasClientes(results.data);
                        appState.rawClientes = clientes;
                        resolve(clientes);
                    }
                });
            });
        });
}

export function cargarGeoJSON(url) {
    return solicitarRecurso(url, { tipo: 'json', antiCache: true }).then(datos => {
        if (!datos || datos.type !== 'FeatureCollection' || !Array.isArray(datos.features)) {
            throw new ErrorSolicitud('El archivo GeoJSON no tiene una colección de elementos válida.', { url });
        }
        return datos;
    });
}

export function cargarMapeoRutasDistribuidoras() {
    return solicitarRecurso('data/rutas_distribuidoras.csv', { antiCache: true })
        .then(csvText => {
            const lineas = csvText.split(/\r?\n/);
            if (lineas.length === 0) return;
            const sep = lineas[0].includes(';') ? ';' : ',';
            const headers = lineas[0].split(sep).map(h => h.trim().toUpperCase());
            const idxRuta = headers.findIndex(h => h.includes('RUTA'));
            const idxDist = headers.findIndex(h => h.includes('DISTRIB') || h.includes('DISTRIBUIDORA') || h.includes('BOCADELI'));
            const idxCanal = headers.findIndex(h => h.includes('CANAL'));
            const idxTipoZona = headers.findIndex(h => h.includes('TIPO') || h.includes('ZONA'));

            lineas.slice(1).forEach(linea => {
                if (!linea.trim()) return;
                const partes = linea.split(sep);
                const r = idxRuta !== -1 && partes[idxRuta] ? partes[idxRuta].trim() : (partes[0] ? partes[0].trim() : '');
                const d = idxDist !== -1 && partes[idxDist] ? partes[idxDist].trim() : (partes[1] ? partes[1].trim() : '');
                const canal = idxCanal !== -1 && partes[idxCanal] ? partes[idxCanal].trim() : '';
                const tipoZona = idxTipoZona !== -1 && partes[idxTipoZona] ? partes[idxTipoZona].trim() : '';

                if (r && r.toUpperCase() !== 'RUTA') {
                    appState.rawRutasDistribuidoras[r] = {
                        distribuidora: d,
                        canal: canal,
                        tipoZona: tipoZona,
                        toString: function() { return this.distribuidora || d; }
                    };
                }
            });
        })
        .catch(err => console.warn('No se pudo cargar rutas_distribuidoras.csv:', err));
}

export function sincronizarGruposClientes() {
    if (!appState.rawClientes || !appState.rawGeocercas || !appState.rawGeocercas.features) return;
    const rutaToGrupoMap = {};
    for (let r in MAPEO_RUTAS_GRUPOS) {
        rutaToGrupoMap[r.toLowerCase().trim()] = MAPEO_RUTAS_GRUPOS[r];
    }
    appState.rawGeocercas.features.forEach(f => {
        const props = f.properties || {};
        const rClean = (props.ruta_clean || props.RUTA || props.Ruta || '').toLowerCase().trim();
        const gClean = props.grupo_clean || props.GRUPO || props.Grupo;
        if (rClean && gClean && gClean !== 'Sin Grupo') {
            rutaToGrupoMap[rClean] = normalizarNombreGrupo(gClean);
        }
    });
    appState.rawClientes.forEach(c => {
        const rNorm = (c.ruta || '').toLowerCase().trim();
        if ((!c.grupo || c.grupo === 'Sin Grupo') && rutaToGrupoMap[rNorm]) {
            c.grupo = rutaToGrupoMap[rNorm];
            c._grupoNorm = rutaToGrupoMap[rNorm];
        }
    });
}

export function cargarDatosIniciales() {
    const promUsuarios = cargarUsuariosDesdeCSV();
    const promClientes = cargarClientes().catch(() => []);
    const promGeocercas = cargarGeoJSON('data/geocercas_rutas.geojson').catch(() => ({ type: "FeatureCollection", features: [] }));
    const promDistribuidoras = cargarGeoJSON('data/geocercas_distribuidoras.geojson').catch(() => ({ type: "FeatureCollection", features: [] }));
    const promRutasDist = cargarMapeoRutasDistribuidoras();

    return Promise.all([promUsuarios, promClientes, promGeocercas, promDistribuidoras, promRutasDist])
        .then(([, clientes, geocercas, distribuidoras]) => {
            appState.rawClientes = clientes;
            appState.rawGeocercas = geocercas || { type: "FeatureCollection", features: [] };
            appState.rawDistribuidoras = distribuidoras || { type: "FeatureCollection", features: [] };
            procesarPropiedadesGeocercas();
            sincronizarGruposClientes();
            return { clientes, geocercas: appState.rawGeocercas, distribuidoras: appState.rawDistribuidoras };
        });
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

export function procesarPropiedadesGeocercas() {
    if (!appState.rawGeocercas || !appState.rawGeocercas.features) return;
    appState.rawGeocercas.features.forEach(feat => {
        const props = feat.properties || {};
        
        let rutaName = obtenerValorPropiedad(props, 'Ruta', 'RUTA', 'ruta', 'COD_RUTA', 'Cod_Ruta', 'Name', 'name', 'nambe', 'Geocercas_SV_Ruta', 'Geocercas_SV_RUTA');
        let paisClean = obtenerValorPropiedad(props, 'Pais', 'PAIS', 'pais', 'Country', 'Geocercas_SV_Pais');
        let divisionClean = obtenerValorPropiedad(props, 'Division', 'DIVISION', 'division', 'Geocercas_SV_Division');
        let grupoClean = obtenerValorPropiedad(props, 'Grupo', 'GRUPO', 'grupo', 'GROUP', 'Geocercas_SV_Grupo');

        if (!rutaName) {
            const searchStr = `${props.description || ''} ${props.Name || ''} ${props.name || ''}`;
            const matchRuta = searchStr.match(/RUT[A]?[-_:]?\s*([A-Z0-9_-]+)/i);
            if (matchRuta) rutaName = matchRuta[1];
        }

        if (!grupoClean || grupoClean === "Sin Grupo") {
            if (MAPEO_RUTAS_GRUPOS[rutaName]) {
                grupoClean = MAPEO_RUTAS_GRUPOS[rutaName];
            } else {
                const searchStr = `${props.description || ''} ${props.Name || ''} ${props.GRUPO || ''} ${props.grupo || ''}`;
                const matchGrupo = searchStr.match(/GRUPO[_\s]*([0-9]+)/i);
                if (matchGrupo) {
                    grupoClean = "GRUPO " + matchGrupo[1].padStart(2, '0');
                } else if (appState.rawClientes && appState.rawClientes.length > 0) {
                    const matchCliente = appState.rawClientes.find(c => c.ruta === rutaName && c.grupo && c.grupo !== "Sin Grupo");
                    if (matchCliente) {
                        grupoClean = matchCliente.grupo;
                        if (!paisClean) paisClean = matchCliente.pais || '';
                        if (!divisionClean) divisionClean = matchCliente.division || '';
                    }
                }
            }
        }

        if ((!paisClean || !divisionClean) && appState.rawClientes && appState.rawClientes.length > 0 && rutaName) {
            const clienteRef = appState.rawClientes.find(c => c.ruta === rutaName || c._rutaNorm === rutaName.toLowerCase());
            if (clienteRef) {
                if (!paisClean) paisClean = clienteRef.pais || '';
                if (!divisionClean) divisionClean = clienteRef.division || '';
            }
        }

        feat.properties.ruta_clean = rutaName || 'Sin Ruta';
        feat.properties._rutaNorm = (rutaName || '').toLowerCase();
        feat.properties.grupo_clean = normalizarNombreGrupo(grupoClean || 'Sin Grupo');
        feat.properties.pais_clean = paisClean || '';
        feat.properties.division_clean = divisionClean || '';
    });
}

// ============================================================
//  MAPA, CAPAS Y MARCADORES
// ============================================================
export function inicializarMapa() {
    if (appState.map) { appState.map.remove(); appState.map = null; }
    
    const googleRoad = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Maps' });
    const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '© Google Satellite' });
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });

    appState.map = L.map('map', {
        center: [13.6929, -89.2182],
        zoom: 11,
        layers: [googleRoad],
        preferCanvas: true
    });

    const baseMaps = {
        "Google Maps": googleRoad,
        "Google Satélite": googleSat,
        "OpenStreetMap": osmLayer
    };

    L.control.layers(baseMaps).addTo(appState.map);

    appState.map.on('baselayerchange', function(e) {
        appState.isSatelliteActive = e.name.toLowerCase().includes('satélite') || e.name.toLowerCase().includes('satellite');
        aplicarFiltros();
    });

    appState.distribuidorasLayerGroup = L.layerGroup().addTo(appState.map);
    appState.geocercasLayerGroup = L.layerGroup().addTo(appState.map);
    
    appState.clusterMarkersGroup = L.markerClusterGroup({
        maxClusterRadius: 0,
        disableClusteringAtZoom: 1,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        chunkedLoading: true,
        chunkInterval: 50,
        chunkDelay: 10
    }).addTo(appState.map);

    appState.rutaOptimaLayerGroup = L.layerGroup().addTo(appState.map);
}
