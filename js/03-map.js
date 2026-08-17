const PALETA_COLORES_SOLIDOS = [
    '#0369a1', '#15803d', '#0d9488', '#b45309', '#5b21b6', '#be185d', 
    '#475569', '#374151', '#4f46e5', '#047857', '#0284c7', '#059669', 
    '#d97706', '#9333ea', '#e11d48', '#64748b', '#1e3a8a', '#7c2d12'
];

const COLORES_PAIS_FIJOS = {
    'EL SALVADOR': '#0369a1',
    'GUATEMALA': '#b45309',
    'HONDURAS': '#15803d',
    'SV': '#0369a1',
    'GT': '#b45309',
    'HN': '#15803d'
};

const COLORES_CANALES_MASIVOS = {
    'DETALLE': '#15803d',
    'PREFERENCIAL': '#0369a1'
};

const COLORES_CANALES_ESPECIFICOS = {
    'MAYOREO': '#b45309',
    'SUPERMERCADOS': '#7c2d12',
    'SUPERMERCADO': '#7c2d12',
    'DEDICADA': '#5b21b6',
    'DEDICADO': '#5b21b6',
    'EVENTOS-PUBLICIDAD': '#be185d',
    'EVENTOS': '#be185d',
    'EVENTO': '#be185d',
    'DISTRIBUIDOR': '#0d9488',
    'DISTRIBUIDORES': '#0d9488',
    'GUDAFF': '#4f46e5',
    'CADENA': '#9333ea',
    'CADENAS': '#9333ea',
    'PX': '#e11d48'
};

const COLORES_TIPO_ZONA_FIJOS = {
    'URBANA': '#0369a1',
    'URBANO': '#0369a1',
    'RURAL': '#15803d',
    'FORANEA': '#b45309',
    'FORANEO': '#b45309',
    'CONTORNO': '#5b21b6',
    'RURAL / URBANO': '#be185d',
    'RURAL/URBANO': '#be185d',
    'SIN ZONA ASIGNADA': '#64748b',
    'SIN ZONA': '#64748b'
};

function obtenerColorPorPais(paisStr) {
    if (!paisStr) return '#4f46e5';
    const norm = String(paisStr).toUpperCase().trim();
    for (let key in COLORES_PAIS_FIJOS) {
        if (norm.includes(key)) return COLORES_PAIS_FIJOS[key];
    }
    return obtenerColorDinamico(paisStr);
}

function obtenerColorPorCanal(canalStr) {
    if (!canalStr) return '#64748b';
    const norm = String(canalStr).toUpperCase().trim();
    if (norm.includes('DETALLE')) return COLORES_CANALES_MASIVOS['DETALLE'];
    if (norm.includes('PREFERENCIAL')) return COLORES_CANALES_MASIVOS['PREFERENCIAL'];
    
    for (let key in COLORES_CANALES_ESPECIFICOS) {
        if (norm.includes(key)) return COLORES_CANALES_ESPECIFICOS[key];
    }
    return obtenerColorDinamico(canalStr);
}

function obtenerColorPorTipoZona(tzStr) {
    if (!tzStr) return '#64748b';
    const norm = String(tzStr).toUpperCase().trim();
    for (let key in COLORES_TIPO_ZONA_FIJOS) {
        if (norm.includes(key)) return COLORES_TIPO_ZONA_FIJOS[key];
    }
    return obtenerColorDinamico(tzStr);
}

function obtenerColorDinamico(valor) {
    if (!valor || valor === 'N/A' || valor === 'N/D') return '#0369a1';
    let hash = 0;
    const str = String(valor).toLowerCase().trim();
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALETA_COLORES_SOLIDOS.length;
    return PALETA_COLORES_SOLIDOS[index];
}

function actualizarLeyendaMapa() {
    const legendBox = document.getElementById('map-legend-box');
    const titleEl = document.getElementById('legend-box-title');
    const listEl = document.getElementById('legend-items-list');
    
    if (!appState.swMasivos && !appState.swEspecificos && !appState.swTipoZona) {
        legendBox.style.display = 'none';
        return;
    }

    legendBox.style.display = 'flex';
    listEl.innerHTML = '';

    if (appState.swMasivos) {
        titleEl.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Canales Masivos';
        const items = [
            { label: 'Detalle', color: COLORES_CANALES_MASIVOS['DETALLE'] },
            { label: 'Preferencial', color: COLORES_CANALES_MASIVOS['PREFERENCIAL'] }
        ];
        items.forEach(it => {
            listEl.innerHTML += `<div class="legend-item-row"><div class="legend-color-dot" style="background:${it.color};"></div><span>${it.label}</span></div>`;
        });
    } else if (appState.swEspecificos) {
        titleEl.innerHTML = '<i class="fa-solid fa-boxes-packing"></i> Canales Específicos';
        const items = [
            { label: 'Mayoreo', color: COLORES_CANALES_ESPECIFICOS['MAYOREO'] },
            { label: 'Supermercados', color: COLORES_CANALES_ESPECIFICOS['SUPERMERCADOS'] },
            { label: 'Dedicada', color: COLORES_CANALES_ESPECIFICOS['DEDICADA'] },
            { label: 'Eventos', color: COLORES_CANALES_ESPECIFICOS['EVENTOS'] },
            { label: 'Distribuidor', color: COLORES_CANALES_ESPECIFICOS['DISTRIBUIDOR'] }
        ];
        items.forEach(it => {
            listEl.innerHTML += `<div class="legend-item-row"><div class="legend-color-dot" style="background:${it.color};"></div><span>${it.label}</span></div>`;
        });
    } else if (appState.swTipoZona) {
        titleEl.innerHTML = '<i class="fa-solid fa-map-pin"></i> Tipos de Zona';
        const items = [
            { label: 'Urbana', color: COLORES_TIPO_ZONA_FIJOS['URBANA'] },
            { label: 'Rural', color: COLORES_TIPO_ZONA_FIJOS['RURAL'] },
            { label: 'Foránea', color: COLORES_TIPO_ZONA_FIJOS['FORANEA'] },
            { label: 'Contorno', color: COLORES_TIPO_ZONA_FIJOS['CONTORNO'] }
        ];
        items.forEach(it => {
            listEl.innerHTML += `<div class="legend-item-row"><div class="legend-color-dot" style="background:${it.color};"></div><span>${it.label}</span></div>`;
        });
    }
}

function renderizarGeocercas(featuresGeocercasFiltradas) {
    appState.geocercasLayerGroup.clearLayers();
    appState.geocercasBBoxCache = [];

    if (!featuresGeocercasFiltradas || featuresGeocercasFiltradas.length === 0) return null;

    featuresGeocercasFiltradas.forEach(feat => {
        const geom = feat.geometry;
        if (!geom) return;
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        const extractRings = (rings) => {
            rings.forEach(ring => {
                ring.forEach(pt => {
                    if (pt[0] < minLng) minLng = pt[0];
                    if (pt[0] > maxLng) maxLng = pt[0];
                    if (pt[1] < minLat) minLat = pt[1];
                    if (pt[1] > maxLat) maxLat = pt[1];
                });
            });
        };
        if (geom.type === 'Polygon') extractRings(geom.coordinates);
        else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(poly => extractRings(poly));

        appState.geocercasBBoxCache.push({
            feature: feat,
            bbox: [minLng, minLat, maxLng, maxLat]
        });
    });
    
    const geoJsonLayer = L.geoJSON(
        { type: "FeatureCollection", features: featuresGeocercasFiltradas },
        {
            style: function(feature) {
                if (appState.isSatelliteActive) {
                    return { color: '#38bdf8', weight: 2.5, fillColor: '#38bdf8', fillOpacity: 0.2 };
                }
                const props = feature.properties || {};
                const realPais = props.pais_clean || 'N/D';
                const realDivision = props.division_clean || 'N/D';
                const realGrupo = props.grupo_clean || 'Sin Grupo';
                const realRuta = props.ruta_clean || 'N/A';
                
                const infoRuta = appState.rawRutasDistribuidoras[realRuta] || appState.rawRutasDistribuidoras[props._rutaNorm] || {};
                const realCanal = (infoRuta.canal || props.CANAL || props.Canal || 'N/D').toUpperCase().trim();
                const realTipoZona = (infoRuta.tipoZona || props.TIPO_ZONA || props.Tipo_Zona || 'N/D').toUpperCase().trim();

                let colorBase = '#0369a1';

                if (appState.swMasivos) {
                    colorBase = obtenerColorPorCanal(realCanal);
                } else if (appState.swEspecificos) {
                    colorBase = obtenerColorPorCanal(realCanal);
                } else if (appState.swTipoZona) {
                    colorBase = obtenerColorPorTipoZona(realTipoZona);
                } else {
                    if (appState.paisesSeleccionadosMultiples.length === 0 || appState.paisesSeleccionadosMultiples.length > 1) {
                        colorBase = obtenerColorPorPais(realPais);
                    } else if (appState.divisionesSeleccionadasMultiples.length === 0 || appState.divisionesSeleccionadasMultiples.length > 1) {
                        colorBase = obtenerColorDinamico(realDivision);
                    } else {
                        colorBase = obtenerColorDinamico(realGrupo);
                    }
                }

                return { color: colorBase, weight: 2, fillColor: colorBase, fillOpacity: 0.22 };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties || {};
                const realPais = props.pais_clean || 'N/D';
                const realDivision = props.division_clean || 'N/D';
                const realGrupo = props.grupo_clean || 'Sin Grupo';
                const realRuta = props.ruta_clean || 'N/A';
                
                const infoRuta = appState.rawRutasDistribuidoras[realRuta] || appState.rawRutasDistribuidoras[props._rutaNorm] || {};
                const realCanal = infoRuta.canal || props.CANAL || props.Canal || 'N/D';
                const realTipoZona = infoRuta.tipoZona || props.TIPO_ZONA || props.Tipo_Zona || 'N/D';

                layer.bindPopup(`
                    <div style="font-family:'Inter',sans-serif; padding:6px; min-width:170px;">
                        <b style="color:#1e3a8a; font-size:0.95rem; display:block; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px;">
                            <i class="fa-solid fa-draw-polygon"></i> Cobertura Geocerca
                        </b>
                        <div style="font-size:0.85rem; line-height:1.4;">
                            <b>País:</b> ${escapeHTML(realPais)}<br>
                            <b>División:</b> ${escapeHTML(realDivision)}<br>
                            <b>Grupo:</b> ${escapeHTML(realGrupo)}<br>
                            <b>Ruta:</b> ${escapeHTML(realRuta)}<br>
                            <b>Canal:</b> ${escapeHTML(realCanal)}<br>
                            <b>Tipo Zona:</b> ${escapeHTML(realTipoZona)}
                        </div>
                    </div>
                `);
            }
        }
    ).addTo(appState.geocercasLayerGroup);

    actualizarLeyendaMapa();
    return geoJsonLayer.getBounds();
}

function renderizarDistribuidoras(distribuidorasData) {
    appState.distribuidorasLayerGroup.clearLayers();
    if (!distribuidorasData || !distribuidorasData.features || distribuidorasData.features.length === 0) return;
    L.geoJSON(distribuidorasData, {
        style: { color: appState.isSatelliteActive ? '#f43f5e' : '#b91c1c', weight: 2.5, fillColor: '#b91c1c', fillOpacity: 0.2 },
        onEachFeature: function(feature, layer) {
            const props = feature.properties || {};
            let nombreDist = obtenerValorPropiedad(props, 'Ruta', 'RUTA', 'ruta', 'DISTRIBUIDORA', 'Distribuidora', 'distribuidora', 'BOCADELI', 'Bocadeli', 'bocadeli', 'NOMBRE', 'Nombre', 'nombre');
            
            if (!nombreDist) {
                nombreDist = 'Distribuidora Bocadeli';
            }
            layer.bindPopup(`
                <div style="font-family:'Inter',sans-serif; padding:4px;">
                    <b style="color:#0b1e42; font-size:0.9rem;"><i class="fa-solid fa-building"></i> ${escapeHTML(nombreDist)}</b>
                </div>
            `);
        }
    }).addTo(appState.distribuidorasLayerGroup);
}

function renderizarMarcadores(clientesFiltrados, featuresGeocercasFiltradas) {
    appState.clusterMarkersGroup.clearLayers();
    Object.keys(appState.clienteMarkersMap).forEach(key => delete appState.clienteMarkersMap[key]);
    let bounds = L.latLngBounds();
    let conCoords = 0;
    const fuera = [];

    const spatialGridMap = {};
    const newMarkersList = [];
    const tieneGeocercas = (featuresGeocercasFiltradas && featuresGeocercasFiltradas.length > 0);

    clientesFiltrados.forEach(c => {
        if (c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)) {
            conCoords++;
            bounds.extend([c.lat, c.lng]);
            const isVisited = appState.clientesVisitadosMap.get(c.codigo) || false;

            const gridLat = Math.round(c.lat / 0.000072);
            const gridLng = Math.round(c.lng / 0.000072);
            const gridKey = `${gridLat}_${gridLng}`;

            spatialGridMap[gridKey] = (spatialGridMap[gridKey] || 0) + 1;
            const count = spatialGridMap[gridKey];

            let renderLat = c.lat;
            let renderLng = c.lng;

            if (count > 1) {
                const angle = (count - 1) * (2 * Math.PI / 5);
                const offsetDist = 0.000085;
                renderLat += Math.sin(angle) * offsetDist;
                renderLng += Math.cos(angle) * offsetDist;
            }
            
            let colorFill = isVisited ? '#15803d' : '#0369a1';
            let colorStroke = isVisited ? '#166534' : '#075985';
            
            if (appState.isSatelliteActive) {
                colorFill = isVisited ? '#22c55e' : '#38bdf8';
                colorStroke = '#ffffff';
            }

            const marker = L.circleMarker([renderLat, renderLng], {
                radius: appState.isSatelliteActive ? 7 : 6,
                fillColor: colorFill,
                color: colorStroke,
                weight: appState.isSatelliteActive ? 2.5 : 1.5,
                fillOpacity: 0.95
            }).bindPopup(generarPopupHTML(c, isVisited));
            
            newMarkersList.push(marker);
            appState.clienteMarkersMap[c.codigo] = marker;

            if (tieneGeocercas && !estaDentroDeGeocercasOptimizado(c.lat, c.lng)) {
                fuera.push(c);
            }
        }
    });

    if (newMarkersList.length > 0) {
        appState.clusterMarkersGroup.addLayers(newMarkersList);
    }

    document.getElementById('kpi-coords').innerText = conCoords;
    document.getElementById('kpi-fuera').innerText = fuera.length;
    return { bounds, fuera };
}

function generarPopupHTML(c, isVisited, numeroParada = null, diaRuta = null) {
    const safe = {
        codigo: escapeHTML(c.codigo),
        nombre: escapeHTML(c.nombre),
        grupo: escapeHTML(c.grupo),
        ruta: escapeHTML(c.ruta),
        dia: escapeHTML(c.dia),
        telefono: escapeHTML(c.telefono || 'N/A'),
        direccion: escapeHTML(c.direccion),
    };
    const safeDiaRuta = escapeHTML(diaRuta || '');
    let headerParada = numeroParada 
        ? `<div style="background:#4f46e5; color:white; font-size:0.7rem; font-weight:800; padding:3px 8px; border-radius:12px; display:inline-block; margin-bottom:6px;">
            <i class="fa-solid fa-flag"></i> PARADA #${Number(numeroParada)} ${diaRuta ? ' (' + safeDiaRuta + ')' : ''}
           </div>`
        : "";

    let navButtons = (c.lat !== null && c.lng !== null) 
        ? `<div style="display: flex; gap: 6px; margin: 8px 0;">
            <a href="https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}" target="_blank" rel="noopener noreferrer" class="nav-btn btn-gmaps" style="background:#0369a1; color:white; padding:4px 8px; border-radius:6px; font-size:0.72rem; text-decoration:none;"><i class="fa-solid fa-location-dot"></i> Maps</a>
            <a href="https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes" target="_blank" rel="noopener noreferrer" class="nav-btn btn-waze" style="background:#0284c7; color:white; padding:4px 8px; border-radius:6px; font-size:0.72rem; text-decoration:none;"><i class="fa-solid fa-location-arrow"></i> Waze</a>
           </div>`
        : `<div style="font-size: 0.75rem; color: #ef4444; margin: 6px 0; font-weight: 600;">⚠️ Sin coordenadas registradas</div>`;
        
    return `
        <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 210px;">
            ${headerParada}
            <b style="font-size: 0.95rem; color: #0f172a; display:block;">${safe.nombre}</b>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid #cbd5e1;">
            <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
                <b>Código:</b> ${safe.codigo}<br>
                <b>Grupo:</b> ${safe.grupo}<br>
                <b>Ruta:</b> ${safe.ruta}<br>
                <b>Día:</b> ${safe.dia}<br>
                <b>Teléfono:</b> ${safe.telefono}<br>
                <b>Dirección:</b> ${safe.direccion}
            </div>
            ${navButtons}
            <div style="margin-top: 8px;">
                <button data-action="open-visit" data-client-code="${safe.codigo}" style="width:100%; background:${isVisited ? '#15803d' : '#1e3a8a'}; color:white; border:none; padding:7px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer;">
                    <i class="fa-solid fa-pen-to-square"></i> ${isVisited ? 'Editar Visita / Datos' : 'Registrar Visita / Datos'}
                </button>
            </div>
        </div>
    `;
}

function puntoEnPoligono(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function estaDentroDeGeocercasOptimizado(lat, lng) {
    if (!appState.geocercasBBoxCache || appState.geocercasBBoxCache.length === 0) return true;
    const pt = [lng, lat];
    for (let i = 0; i < appState.geocercasBBoxCache.length; i++) {
        const item = appState.geocercasBBoxCache[i];
        const bbox = item.bbox;
        if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
        const geom = item.feature.geometry;
        if (!geom) continue;
        if (geom.type === 'Polygon') {
            for (let ring of geom.coordinates) {
                if (puntoEnPoligono(pt, ring)) return true;
            }
        } else if (geom.type === 'MultiPolygon') {
            for (let polyCoords of geom.coordinates) {
                for (let ring of polyCoords) {
                    if (puntoEnPoligono(pt, ring)) return true;
                }
            }
        }
    }
    return false;
}

// ============================================================
//  LÓGICA DEL MODAL DE VISITA Y ACTUALIZACIÓN DE DATOS
// ============================================================
