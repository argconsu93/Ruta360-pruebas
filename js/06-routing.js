function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function obtenerCentroideDistribuidoraPorNombre(nombreDistribuidora) {
    if (!appState.rawDistribuidoras || !appState.rawDistribuidoras.features) return null;
    const targetNorm = normalizarTexto(nombreDistribuidora);
    
    const feat = appState.rawDistribuidoras.features.find(f => {
        const props = f.properties || {};
        let n = obtenerValorPropiedad(props, 'Ruta', 'RUTA', 'ruta', 'DISTRIBUIDORA', 'Distribuidora', 'distribuidora', 'BOCADELI', 'Bocadeli', 'bocadeli', 'NOMBRE', 'Nombre', 'nombre') || '';
        const nNorm = normalizarTexto(n);
        return nNorm.includes(targetNorm) || targetNorm.includes(nNorm);
    });
    if (!feat || !feat.geometry) return null;

    let coords = [];
    if (feat.geometry.type === 'Polygon') coords = feat.geometry.coordinates[0];
    else if (feat.geometry.type === 'MultiPolygon') coords = feat.geometry.coordinates[0][0];

    if (coords.length === 0) return null;
    let sumLat = 0, sumLng = 0;
    coords.forEach(pt => { sumLng += pt[0]; sumLat += pt[1]; });
    return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

function formatearMinutosAHorasMinutos(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = Math.round(totalMin % 60);
    return `${h}h ${m}m`;
}

function formatearMinutosAHora12(totalMin) {
    let totalSegundos = Math.round(totalMin * 60);
    let mAbs = Math.floor(totalSegundos / 60);
    const mNorm = mAbs % 1440;
    let h = Math.floor(mNorm / 60);
    let m = mNorm % 60;
    let ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12 || 12;
    const hStr = h12 < 10 ? '0' + h12 : h12;
    const mStr = m < 10 ? '0' + m : m;
    return `${hStr}:${mStr} ${ampm}`;
}

function optimizarSecuenciaSweep2OPT(secuenciaOriginal, puntoOrigen) {
    if (secuenciaOriginal.length <= 2) return secuenciaOriginal;

    // 1. Barrido Sectorial (Sweep): Ordenar estrictamente por ángulo polar (coordenadas polares) desde el depósito.
    // Esto asegura que la ruta barra de forma continua en abanico/círculo sin saltos erráticos ni retornos.
    let conAngulos = secuenciaOriginal.map(c => {
        let angulo = Math.atan2(c.lat - puntoOrigen.lat, c.lng - puntoOrigen.lng);
        return { cliente: c, angulo: angulo };
    });

    conAngulos.sort((a, b) => a.angulo - b.angulo);
    let puntosOrdenados = conAngulos.map(item => item.cliente);

    // 2. Refinamiento local riguroso con 2-OPT para minimizar cruces de aristas locales
    let puntos = [puntoOrigen, ...puntosOrdenados];
    let n = puntos.length;
    
    let matrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                matrix[i][j] = calcularDistancia(puntos[i].lat, puntos[i].lng, puntos[j].lat, puntos[j].lng);
            }
        }
    }

    let rutaIndices = Array.from({ length: n }, (_, i) => i);
    let mejorado = true;
    let iteraciones = 0;
    while (mejorado && iteraciones < 200) {
        mejorado = false;
        iteraciones++;
        for (let i = 1; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                if (j - i === 1) continue;
                
                let distActual = matrix[rutaIndices[i-1]][rutaIndices[i]] + (j < n - 1 ? matrix[rutaIndices[j]][rutaIndices[j+1]] : 0);
                let distNueva = matrix[rutaIndices[i-1]][rutaIndices[j]] + (j < n - 1 ? matrix[rutaIndices[i]][rutaIndices[j+1]] : 0);

                if (distNueva < distActual - 0.0001) {
                    let tramoInvertido = rutaIndices.slice(i, j + 1).reverse();
                    rutaIndices.splice(i, tramoInvertido.length, ...tramoInvertido);
                    mejorado = true;
                    break;
                }
            }
            if (mejorado) break;
        }
    }

    return rutaIndices.slice(1).map(idx => puntos[idx]);
}

async function trazarRutaOptima() {
    if (appState.rutaOptimaLayerGroup) appState.rutaOptimaLayerGroup.clearLayers();
    if (appState.clusterMarkersGroup) appState.clusterMarkersGroup.clearLayers();
    appState.ultimaSecuenciaOptimizada = [];
    detenerSimulacion();

    const btnOpt = document.getElementById('btn-trazar-ruta');
    const originalText = btnOpt.innerHTML;
    btnOpt.disabled = true;
    btnOpt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Optimizando con Barrido Sectorial...';

    const rutaSel = appState.rutasSeleccionadasMultiples[0];
    const minutosPorParada = parseInt(document.getElementById('input-tiempo-parada').value) || 10;
    const horaSalidaStr = document.getElementById('input-hora-salida').value || '08:00';
    const [salidaH, salidaM] = horaSalidaStr.split(':').map(Number);
    const minutosInicioTotal = (salidaH || 8) * 60 + (salidaM || 0);

    let velocidadKmh = 40;
    if ((salidaH >= 7 && salidaH <= 9) || (salidaH >= 17 && salidaH <= 19)) {
        velocidadKmh = 25;
    } else if (salidaH < 6 || salidaH > 21) {
        velocidadKmh = 50;
    }

    let nombreDistribuidora = "";
    const distEntry = appState.rawRutasDistribuidoras[rutaSel];
    if (distEntry) {
        nombreDistribuidora = typeof distEntry === 'object' ? (distEntry.distribuidora || '') : String(distEntry);
    }
    
    let puntoReferencia = nombreDistribuidora ? obtenerCentroideDistribuidoraPorNombre(nombreDistribuidora) : null;
    if (!puntoReferencia && appState.rawDistribuidoras && appState.rawDistribuidoras.features && appState.rawDistribuidoras.features.length > 0) {
        const featDef = appState.rawDistribuidoras.features[0];
        let coordsDef = featDef.geometry.type === 'Polygon' ? featDef.geometry.coordinates[0] : featDef.geometry.coordinates[0][0];
        let sLat = 0, sLng = 0;
        coordsDef.forEach(pt => { sLng += pt[0]; sLat += pt[1]; });
        puntoReferencia = { lat: sLat / coordsDef.length, lng: sLng / coordsDef.length };
    }

    let diasAProcesar = (appState.diaSeleccionado === 'TODOS') 
        ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] 
        : [appState.diaSeleccionado];

    let totalProcesados = 0;
    let erroresEnrutamiento = 0;
    let clientesFueraTotal = [];
    let boundsGlobal = L.latLngBounds();
    appState.simPathCoordinates = [];

    let acumuladorDistanciaTransito = 0;
    let acumuladorDistanciaGeocerca = 0;
    let acumuladorTiempoVisitasMin = 0;

    for (let diaNombre of diasAProcesar) {
        const clientesDia = appState.ultimoClientesFiltrados.filter(c => {
            if (c.lat === null || c.lng === null || isNaN(c.lat) || isNaN(c.lng)) return false;
            return coincideDia(normalizarTexto(diaNombre), c);
        });

        const clientesValidosEnGeocerca = [];
        clientesDia.forEach(c => {
            if (appState.ultimoClientesFuera.some(f => f.codigo === c.codigo)) {
                clientesFueraTotal.push(c);
            } else {
                clientesValidosEnGeocerca.push(c);
            }
        });

        if (clientesValidosEnGeocerca.length < 1) continue;

        let secuenciaDia = optimizarSecuenciaSweep2OPT(clientesValidosEnGeocerca, puntoReferencia);

        acumuladorDistanciaTransito += calcularDistancia(puntoReferencia.lat, puntoReferencia.lng, secuenciaDia[0].lat, secuenciaDia[0].lng);
        acumuladorDistanciaTransito += calcularDistancia(puntoReferencia.lat, puntoReferencia.lng, secuenciaDia[secuenciaDia.length - 1].lat, secuenciaDia[secuenciaDia.length - 1].lng);

        for (let i = 0; i < secuenciaDia.length - 1; i++) {
            acumuladorDistanciaGeocerca += calcularDistancia(secuenciaDia[i].lat, secuenciaDia[i].lng, secuenciaDia[i+1].lat, secuenciaDia[i+1].lng);
        }

        let coordsListOSRM = [`${puntoReferencia.lng},${puntoReferencia.lat}`];
        secuenciaDia.forEach(c => coordsListOSRM.push(`${c.lng},${c.lat}`));
        coordsListOSRM.push(`${puntoReferencia.lng},${puntoReferencia.lat}`);

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsListOSRM.join(';')}?overview=full&geometries=geojson`;

        try {
            const data = await solicitarRecurso(osrmUrl, { tipo: 'json', timeoutMs: 20000 });

            if (!data || typeof data.code !== 'string' || !Array.isArray(data.routes)) {
                throw new ErrorSolicitud('El servicio de rutas devolvió una respuesta inválida.', { url: osrmUrl });
            }

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const colorHex = COLORES_DIAS[diaNombre] || '#4f46e5';
                const routeGeometry = data.routes[0].geometry;
                
                if (routeGeometry && routeGeometry.coordinates) {
                    appState.simPathCoordinates = routeGeometry.coordinates.map(pt => [pt[1], pt[0]]);
                }

                const routePath = L.geoJSON(routeGeometry, {
                    style: { color: colorHex, weight: 4, opacity: 0.85 }
                }).addTo(appState.rutaOptimaLayerGroup);

                boundsGlobal.extend(routePath.getBounds());

                const coordsCountMap = {};
                let minutosAcumulados = minutosInicioTotal;

                const distTransitoInicial = calcularDistancia(puntoReferencia.lat, puntoReferencia.lng, secuenciaDia[0].lat, secuenciaDia[0].lng);
                minutosAcumulados += (distTransitoInicial / velocidadKmh) * 60;

                secuenciaDia.forEach((c, idx) => {
                    const num = idx + 1;
                    const isVisited = appState.clientesVisitadosMap.get(c.codigo) || false;

                    minutosAcumulados += minutosPorParada;
                    acumuladorTiempoVisitasMin += minutosPorParada;

                    let horaActualMin = minutosAcumulados % 1440;
                    if (horaActualMin >= 720 && horaActualMin < 780) {
                        minutosAcumulados += 60;
                    }

                    if (idx < secuenciaDia.length - 1) {
                        const distSiguiente = calcularDistancia(c.lat, c.lng, secuenciaDia[idx+1].lat, secuenciaDia[idx+1].lng);
                        const minsSiguiente = (distSiguiente / velocidadKmh) * 60;
                        minutosAcumulados += minsSiguiente;
                        acumuladorTiempoVisitasMin += minsSiguiente;
                    }

                    let horaLlegadaStr = formatearMinutosAHora12(minutosAcumulados);

                    const coordKey = `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
                    coordsCountMap[coordKey] = (coordsCountMap[coordKey] || 0) + 1;
                    const count = coordsCountMap[coordKey];

                    let renderLat = c.lat;
                    let renderLng = c.lng;
                    if (count > 1) {
                        const angle = (count - 1) * (2 * Math.PI / 4);
                        const offset = 0.000085;
                        renderLat += Math.sin(angle) * offset;
                        renderLng += Math.cos(angle) * offset;
                    }

                    const customIcon = L.divIcon({
                        className: 'custom-route-icon',
                        html: `<div style="background:${colorHex}; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4);">${num}</div>`,
                        iconSize: [26, 26],
                        iconAnchor: [13, 13]
                    });

                    const markerOpt = L.marker([renderLat, renderLng], { icon: customIcon })
                        .bindPopup(generarPopupHTML(c, isVisited, num, diaNombre));

                    appState.clusterMarkersGroup.addLayer(markerOpt);
                    appState.clienteMarkersMap[c.codigo] = markerOpt;

                    appState.ultimaSecuenciaOptimizada.push({
                        "Orden de Visita": num,
                        "Día de Visita": diaNombre,
                        "Ruta": c.ruta,
                        "Grupo": c.grupo,
                        "Código": c.codigo,
                        "Cliente": c.nombre,
                        "Teléfono": c.telefono,
                        "Dirección": c.direccion,
                        "Latitud": c.lat,
                        "Longitud": c.lng,
                        "Hora Est. Llegada": horaLlegadaStr,
                        "Estado Visitado": isVisited ? "SÍ" : "NO"
                    });
                });

                const distRetorno = calcularDistancia(secuenciaDia[secuenciaDia.length - 1].lat, secuenciaDia[secuenciaDia.length - 1].lng, puntoReferencia.lat, puntoReferencia.lng);
                minutosAcumulados += (distRetorno / velocidadKmh) * 60;

                totalProcesados += secuenciaDia.length;

                const tiempoTransitoMin = (acumuladorDistanciaTransito / velocidadKmh) * 60;
                const tiempoGeocercaMin = (acumuladorDistanciaGeocerca / velocidadKmh) * 60 + acumuladorTiempoVisitasMin;
                const tiempoTotalMin = tiempoTransitoMin + tiempoGeocercaMin;
                const horaFinalizacionStr = formatearMinutosAHora12(minutosInicioTotal + tiempoTotalMin);

                document.getElementById('metric-t-total').textContent = formatearMinutosAHorasMinutos(tiempoTotalMin);
                document.getElementById('metric-t-visita').textContent = formatearMinutosAHorasMinutos(acumuladorTiempoVisitasMin);
                document.getElementById('metric-t-geocerca').textContent = formatearMinutosAHorasMinutos(tiempoGeocercaMin);
                document.getElementById('metric-t-transito').textContent = formatearMinutosAHorasMinutos(tiempoTransitoMin);
                document.getElementById('metric-h-fin').textContent = horaFinalizacionStr;
            }
        } catch (e) {
            erroresEnrutamiento += 1;
            console.warn(`Error trazando día ${diaNombre}:`, e);
        }
    }

    if (totalProcesados > 0) {
        if (boundsGlobal.isValid()) appState.map.fitBounds(boundsGlobal, { padding: [50, 50] });
        document.getElementById('btn-descargar-optimizacion').disabled = false;
        document.getElementById('btn-gmaps-redirect').style.display = 'flex';
        document.getElementById('route-simulation-container').style.display = 'flex';

        inicializarSimuladorRuta();

        let msgDetails = `<b>Optimización Sectorial Completada:</b> ${totalProcesados} clientes trazados.<br>`;
        msgDetails += `• <b>Hora Salida:</b> ${horaSalidaStr} (Tráfico Waze: ${velocidadKmh} km/h)<br>`;
        msgDetails += `• <b>Regla Almuerzo y Paradas (${minutosPorParada} min/c):</b> Consideradas.<br>`;

        if (clientesFueraTotal.length > 0) {
            msgDetails += `<br><span style="color:#dc2626; font-weight:bold;">⚠️ Puntos Excluidos (${clientesFueraTotal.length}):</span><br>`;
            clientesFueraTotal.forEach(f => {
                msgDetails += `- Cód. ${escapeHTML(f.codigo)}: ${escapeHTML(f.nombre)} (${escapeHTML(f.dia)})<br>`;
            });
        }
        mostrarNotificacioniOS("Optimización Exitosa", msgDetails, "success", true);
    } else if (erroresEnrutamiento > 0) {
        mostrarNotificacioniOS(
            "Servicio de rutas no disponible",
            "No fue posible calcular la ruta en este momento. Revise la conexión e intente nuevamente.",
            "warning"
        );
    } else {
        mostrarNotificacioniOS("Aviso de Enrutamiento", "No hay suficientes clientes con coordenadas válidas para optimizar en los días seleccionados.", "warning");
    }

    btnOpt.disabled = false;
    btnOpt.innerHTML = originalText;
}

// ============================================================
//  FUNCIONES DE SIMULACIÓN DE CAMIÓN (Tolerancia 75 metros)
// ============================================================
function inicializarSimuladorRuta() {
    if (!appState.simPathCoordinates || appState.simPathCoordinates.length === 0) return;
    appState.simCurrentStep = 0;
    appState.simTotalSteps = appState.simPathCoordinates.length;
    document.getElementById('sim-range-progress').value = 0;
    document.getElementById('sim-parada-label').textContent = `Paso: 0 / ${appState.simTotalSteps}`;
    document.getElementById('sim-time-display').textContent = document.getElementById('input-hora-salida').value || '08:00';

    appState.simCheckmarkMarkers.forEach(m => appState.map.removeLayer(m));
    appState.simCheckmarkMarkers = [];

    const truckIcon = L.divIcon({
        className: 'truck-sim-icon',
        html: `<div style="background:#1e3a8a; color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.4);"><i class="fa-solid fa-truck-fast"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    if (appState.simTruckMarker) {
        appState.map.removeLayer(appState.simTruckMarker);
    }
    appState.simTruckMarker = L.marker(appState.simPathCoordinates[0], { icon: truckIcon }).addTo(appState.map);
}

function toggleSimulacionRecorrido() {
    if (!appState.simPathCoordinates || appState.simPathCoordinates.length === 0) return;
    const iconBtn = document.getElementById('sim-play-icon');
    
    if (appState.simIsPlaying) {
        detenerSimulacion();
        iconBtn.className = "fa-solid fa-play";
    } else {
        appState.simIsPlaying = true;
        iconBtn.className = "fa-solid fa-pause";
        
        if (appState.simCurrentStep >= appState.simTotalSteps - 1) {
            appState.simCurrentStep = 0;
            appState.simCheckmarkMarkers.forEach(m => appState.map.removeLayer(m));
            appState.simCheckmarkMarkers = [];
        }

        appState.simIntervalId = setInterval(() => {
            if (appState.simCurrentStep < appState.simTotalSteps) {
                const pt = appState.simPathCoordinates[appState.simCurrentStep];
                appState.simTruckMarker.setLatLng(pt);

                let progressPct = Math.round((appState.simCurrentStep / (appState.simTotalSteps - 1)) * 100);
                document.getElementById('sim-range-progress').value = progressPct;
                document.getElementById('sim-parada-label').textContent = `Paso: ${appState.simCurrentStep + 1} / ${appState.simTotalSteps}`;

                appState.ultimaSecuenciaOptimizada.forEach(parada => {
                    const distCheck = calcularDistancia(pt[0], pt[1], parada.Latitud, parada.Longitud);
                    if (distCheck <= 0.075) {
                        const yaExiste = appState.simCheckmarkMarkers.some(m => {
                            const ll = m.getLatLng();
                            return Math.abs(ll.lat - parada.Latitud) < 0.0001 && Math.abs(ll.lng - parada.Longitud) < 0.0001;
                        });
                        if (!yaExiste) {
                            const checkIcon = L.divIcon({
                                className: 'checkmark-overlay-icon',
                                html: `<div style="background:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; border:2px solid #15803d; box-shadow:0 2px 6px rgba(0,0,0,0.3);"><i class="fa-solid fa-check" style="color:#15803d; font-size:13px; font-weight:bold;"></i></div>`,
                                iconSize: [26, 26],
                                iconAnchor: [13, 13]
                            });
                            const chkMarker = L.marker([parada.Latitud, parada.Longitud], { icon: checkIcon, zIndexOffset: 1000 }).addTo(appState.map);
                            appState.simCheckmarkMarkers.push(chkMarker);
                        }
                    }
                });

                appState.simCurrentStep++;
            } else {
                detenerSimulacion();
                document.getElementById('sim-play-icon').className = "fa-solid fa-play";
            }
        }, 80);
    }
}

function detenerSimulacion() {
    appState.simIsPlaying = false;
    if (appState.simIntervalId) {
        clearInterval(appState.simIntervalId);
        appState.simIntervalId = null;
    }
}

function cambiarPasoSimulacion(valPercent) {
    if (!appState.simPathCoordinates || appState.simPathCoordinates.length === 0) return;
    detenerSimulacion();
    document.getElementById('sim-play-icon').className = "fa-solid fa-play";

    appState.simCurrentStep = Math.floor((valPercent / 100) * (appState.simTotalSteps - 1));
    const pt = appState.simPathCoordinates[appState.simCurrentStep];
    if (appState.simTruckMarker) {
        appState.simTruckMarker.setLatLng(pt);
    }
    document.getElementById('sim-parada-label').textContent = `Paso: ${appState.simCurrentStep + 1} / ${appState.simTotalSteps}`;
}

// ============================================================
//  REDIRECCIÓN A GOOGLE MAPS MULTIPUNTO
// ============================================================
function abrirRutaEnGoogleMaps() {
    if (!appState.ultimaSecuenciaOptimizada || appState.ultimaSecuenciaOptimizada.length === 0) {
        mostrarNotificacioniOS("Sin Ruta", "⚠️ Primero debe optimizar una ruta para generar la guía de Google Maps.", "warning");
        return;
    }

    const first = appState.ultimaSecuenciaOptimizada[0];
    const last = appState.ultimaSecuenciaOptimizada[appState.ultimaSecuenciaOptimizada.length - 1];
    
    let origin = `${first.Latitud},${first.Longitud}`;
    let destination = `${last.Latitud},${last.Longitud}`;
    
    let waypoints = [];
    if (appState.ultimaSecuenciaOptimizada.length > 2) {
        for (let i = 1; i < appState.ultimaSecuenciaOptimizada.length - 1; i++) {
            waypoints.push(`${appState.ultimaSecuenciaOptimizada[i].Latitud},${appState.ultimaSecuenciaOptimizada[i].Longitud}`);
        }
    }

    let gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints.length > 0) {
        gmapsUrl += `&waypoints=${waypoints.join('|')}`;
    }
    gmapsUrl += `&travelmode=driving`;

    window.open(gmapsUrl, '_blank');
}

function descargarOptimizacionRuta() {
    if (!appState.ultimaSecuenciaOptimizada || appState.ultimaSecuenciaOptimizada.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ Primero debe ejecutar la 'Optimización de ruta' para generar el listado ordenado.", "warning");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(appState.ultimaSecuenciaOptimizada);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ruta Optimizada");
    
    const rutaSel = appState.rutasSeleccionadasMultiples[0] || "Ruta";
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Optimizacion_Ruta_${rutaSel}_${appState.diaSeleccionado}_${fecha}.xlsx`);
}
