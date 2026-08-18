/**
 * Filtros y tablas: construye opciones según permisos, aplica selecciones y actualiza indicadores y listados.
 * Las funciones exportadas son utilizadas por otros módulos; appState concentra los datos compartidos.
 */

import {
    DIVISIONES_POR_PAIS, PAISES_MAPA_NOMBRES, appState, coincideDia,
    coincideDivision, coincideGrupo, coincidePais, coincideRuta, escapeHTML,
    normalizarNombreGrupo, normalizarTexto
} from './01-core.js';
import { renderizarDistribuidoras, renderizarGeocercas, renderizarMarcadores } from './03-map.js';
import { detenerSimulacion } from './06-routing.js';
import { mostrarNotificacioniOS, toggleDrawer } from './07-session-export.js';

/**
 * Indica si el usuario actual puede consultar más de una región o división.
 */
export function esRolAvanzado() {
    return appState.usuarioActual && ['Jefatura', 'Analista', 'Administrador'].includes(appState.usuarioActual.rol);
}

/**
 * Inicializa los filtros respetando el territorio autorizado para la sesión.
 */
export function poblarFiltrosPermitidos() {
    poblarFiltroPais();
}

/**
 * Construye las opciones de país disponibles para el usuario.
 */
export function poblarFiltroPais() {
    const selectPais = document.getElementById('select-pais');
    selectPais.innerHTML = '';

    if (appState.usuarioActual && appState.usuarioActual.pais !== 'TODOS') {
        appState.paisesSeleccionadosMultiples = [appState.usuarioActual.pais];
        selectPais.disabled = true;
    } else {
        selectPais.disabled = false;
        const optTodos = document.createElement('option');
        optTodos.value = "TODOS";
        optTodos.textContent = "Seleccionar País";
        selectPais.appendChild(optTodos);

        const paisesDisponibles = ['Guatemala', 'El Salvador', 'Honduras'];
        paisesDisponibles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            selectPais.appendChild(opt);
        });
    }

    renderizarChipsPaises();
    actualizarOpcionesDivision();
}

/**
 * Muestra las selecciones de país como etiquetas removibles.
 */
export function renderizarChipsPaises() {
    const container = document.getElementById('chips-paises');
    container.innerHTML = '';
    appState.paisesSeleccionadosMultiples.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'chip-item chip-pais';
        const label = document.createElement('span');
        label.textContent = p;
        chip.appendChild(label);
        if (appState.usuarioActual && appState.usuarioActual.pais === 'TODOS') {
            const btnRemove = document.createElement('span');
            btnRemove.className = 'btn-remove-chip';
            btnRemove.innerHTML = '&times;';
            btnRemove.onclick = () => removerPaisMultiple(p);
            chip.appendChild(btnRemove);
        }
        container.appendChild(chip);
    });
}

/**
 * Quita un país de la selección múltiple y actualiza filtros dependientes.
 */
export function removerPaisMultiple(pais) {
    appState.paisesSeleccionadosMultiples = appState.paisesSeleccionadosMultiples.filter(p => p !== pais);
    renderizarChipsPaises();
    actualizarOpcionesDivision();
    aplicarFiltros();
}

/**
 * Recalcula divisiones válidas según los países seleccionados.
 */
export function actualizarOpcionesDivision() {
    const selectDiv = document.getElementById('select-division');
    selectDiv.innerHTML = '';

    if (appState.usuarioActual && appState.usuarioActual.division !== 'TODOS') {
        appState.divisionesSeleccionadasMultiples = [appState.usuarioActual.division];
        selectDiv.disabled = true;
    } else {
        selectDiv.disabled = false;
        const optTodos = document.createElement('option');
        optTodos.value = "TODOS";
        optTodos.textContent = "Seleccionar División";
        selectDiv.appendChild(optTodos);

        let divisionesDisponibles = [];
        if (appState.paisesSeleccionadosMultiples.length === 0) {
            Object.values(DIVISIONES_POR_PAIS).forEach(list => {
                list.forEach(d => divisionesDisponibles.push(d.nombre));
            });
        } else {
            appState.paisesSeleccionadosMultiples.forEach(p => {
                const cod = Object.keys(PAISES_MAPA_NOMBRES).find(k => PAISES_MAPA_NOMBRES[k] === p);
                if (cod && DIVISIONES_POR_PAIS[cod]) {
                    DIVISIONES_POR_PAIS[cod].forEach(d => divisionesDisponibles.push(d.nombre));
                }
            });
        }

        divisionesDisponibles = [...new Set(divisionesDisponibles)].sort();
        divisionesDisponibles.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            selectDiv.appendChild(opt);
        });

        appState.divisionesSeleccionadasMultiples = appState.divisionesSeleccionadasMultiples.filter(d => divisionesDisponibles.includes(d));
    }

    renderizarChipsDivisiones();
    actualizarOpcionesGrupo();
}

/**
 * Muestra las divisiones seleccionadas como etiquetas removibles.
 */
export function renderizarChipsDivisiones() {
    const container = document.getElementById('chips-divisiones');
    container.innerHTML = '';
    appState.divisionesSeleccionadasMultiples.forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'chip-item chip-division';
        const label = document.createElement('span');
        label.textContent = d;
        chip.appendChild(label);
        if (appState.usuarioActual && appState.usuarioActual.division === 'TODOS') {
            const btnRemove = document.createElement('span');
            btnRemove.className = 'btn-remove-chip';
            btnRemove.innerHTML = '&times;';
            btnRemove.onclick = () => removerDivisionMultiple(d);
            chip.appendChild(btnRemove);
        }
        container.appendChild(chip);
    });
}

/**
 * Quita una división y recalcula los filtros que dependen de ella.
 */
export function removerDivisionMultiple(division) {
    appState.divisionesSeleccionadasMultiples = appState.divisionesSeleccionadasMultiples.filter(d => d !== division);
    renderizarChipsDivisiones();
    actualizarOpcionesGrupo();
    aplicarFiltros();
}

/**
 * Recalcula los grupos disponibles según el territorio seleccionado.
 */
export function actualizarOpcionesGrupo() {
    const selectGrupo = document.getElementById('select-grupo');
    selectGrupo.innerHTML = '<option value="TODOS">Seleccionar Grupo</option>';

    if (appState.usuarioActual && appState.usuarioActual.grupo && appState.usuarioActual.grupo !== 'TODOS') {
        appState.gruposSeleccionadosMultiples = [normalizarNombreGrupo(appState.usuarioActual.grupo)];
        selectGrupo.disabled = true;
    } else {
        selectGrupo.disabled = false;

        const pNorms = appState.paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
        const dCleans = appState.divisionesSeleccionadasMultiples.map(d => d);

        let clientesBase = appState.rawClientes;
        if (pNorms.length > 0) {
            clientesBase = clientesBase.filter(c => pNorms.some(p => coincidePais(p, c)));
        }
        if (dCleans.length > 0) {
            clientesBase = clientesBase.filter(c => dCleans.some(d => coincideDivision(d, c)));
        }

        const gruposClientes = clientesBase.map(c => c.grupo || c._grupoNorm);
        
        let geocercasBase = (appState.rawGeocercas && appState.rawGeocercas.features) ? appState.rawGeocercas.features : [];
        if (dCleans.length > 0) {
            geocercasBase = geocercasBase.filter(f => {
                const divGeo = f.properties.division_clean || f.properties.DIVISION || f.properties.Division || '';
                return dCleans.some(d => coincideDivision(d, { division: divGeo, _divClean: normalizarTexto(divGeo) }));
            });
        }

        const gruposGeocercas = geocercasBase.map(f => f.properties.grupo_clean || f.properties.GRUPO || f.properties.Grupo);
        
        const gruposUnicos = [...new Set([...gruposClientes, ...gruposGeocercas])]
            .filter(g => g && g !== 'Sin Grupo' && g !== 'undefined' && g !== 'null')
            .map(g => normalizarNombreGrupo(g))
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        gruposUnicos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            opt.style.color = '#0f172a';
            selectGrupo.appendChild(opt);
        });

        appState.gruposSeleccionadosMultiples = appState.gruposSeleccionadosMultiples.filter(g => gruposUnicos.includes(g));
    }

    renderizarChipsGrupos();
    actualizarOpcionesRuta();
}

/**
 * Muestra los grupos seleccionados como etiquetas removibles.
 */
export function renderizarChipsGrupos() {
    const container = document.getElementById('chips-grupos');
    container.innerHTML = '';
    appState.gruposSeleccionadosMultiples.forEach(g => {
        const chip = document.createElement('div');
        chip.className = 'chip-item';
        const label = document.createElement('span');
        label.textContent = g;
        chip.appendChild(label);
        if (esRolAvanzado()) {
            const btnRemove = document.createElement('span');
            btnRemove.className = 'btn-remove-chip';
            btnRemove.innerHTML = '&times;';
            btnRemove.onclick = () => removerGrupoMultiple(g);
            chip.appendChild(btnRemove);
        }
        container.appendChild(chip);
    });
}

/**
 * Quita un grupo y refresca las rutas disponibles.
 */
export function removerGrupoMultiple(grupo) {
    appState.gruposSeleccionadosMultiples = appState.gruposSeleccionadosMultiples.filter(g => g !== grupo);
    renderizarChipsGrupos();
    actualizarOpcionesRuta();
    aplicarFiltros();
}

/**
 * Recalcula las rutas que corresponden a los filtros superiores.
 */
export function actualizarOpcionesRuta() {
    const selectRuta = document.getElementById('select-ruta');
    selectRuta.innerHTML = '<option value="TODOS">Seleccionar Ruta</option>';

    const pNorms = appState.paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = appState.divisionesSeleccionadasMultiples.map(d => d);

    let clientesBase = appState.rawClientes;
    if (pNorms.length > 0) {
        clientesBase = clientesBase.filter(c => pNorms.some(p => coincidePais(p, c)));
    }
    if (dCleans.length > 0) {
        clientesBase = clientesBase.filter(c => dCleans.some(d => coincideDivision(d, c)));
    }
    if (appState.gruposSeleccionadosMultiples.length > 0) {
        clientesBase = clientesBase.filter(c => appState.gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c)));
    }

    let geocercasBase = (appState.rawGeocercas && appState.rawGeocercas.features) ? appState.rawGeocercas.features : [];
    if (dCleans.length > 0) {
        geocercasBase = geocercasBase.filter(f => {
            const divGeo = f.properties.division_clean || f.properties.DIVISION || f.properties.Division || '';
            return dCleans.some(d => coincideDivision(d, { division: divGeo, _divClean: normalizarTexto(divGeo) }));
        });
    }
    if (appState.gruposSeleccionadosMultiples.length > 0) {
        geocercasBase = geocercasBase.filter(f => appState.gruposSeleccionadosMultiples.some(g => coincideGrupo(g, { _grupoNorm: f.properties.grupo_clean })));
    }

    const rutasClientes = clientesBase.map(c => c.ruta);
    const rutasGeocercas = geocercasBase.map(f => f.properties.ruta_clean || f.properties.RUTA || f.properties.Ruta);

    const rutasUnicas = [...new Set([...rutasClientes, ...rutasGeocercas])]
        .filter(r => r && r !== 'S/R' && r !== 'nan' && r !== 'Sin Ruta' && r !== 'undefined' && !String(r).includes(','))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    rutasUnicas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        opt.style.color = '#0f172a';
        selectRuta.appendChild(opt);
    });

    appState.rutasSeleccionadasMultiples = appState.rutasSeleccionadasMultiples.filter(r => rutasUnicas.includes(r));
    renderizarChipsRutas();
}

/**
 * Muestra las rutas seleccionadas como etiquetas removibles.
 */
export function renderizarChipsRutas() {
    const container = document.getElementById('chips-rutas');
    container.innerHTML = '';
    appState.rutasSeleccionadasMultiples.forEach(r => {
        const chip = document.createElement('div');
        chip.className = 'chip-item';
        const label = document.createElement('span');
        label.textContent = r;
        chip.appendChild(label);
        const btnRemove = document.createElement('span');
        btnRemove.className = 'btn-remove-chip';
        btnRemove.innerHTML = '&times;';
        btnRemove.onclick = () => removerRutaMultiple(r);
        chip.appendChild(btnRemove);
        container.appendChild(chip);
    });
}

/**
 * Quita una ruta de la selección y vuelve a filtrar la información.
 */
export function removerRutaMultiple(ruta) {
    appState.rutasSeleccionadasMultiples = appState.rutasSeleccionadasMultiples.filter(r => r !== ruta);
    renderizarChipsRutas();
    aplicarFiltros();
}

// ============================================================
//  PROCESAMIENTO GENERAL DE FILTROS EN MAPA Y KPIS
// ============================================================
/**
 * Ejecuta la cadena central de filtrado y actualiza mapa, tablas, leyenda e indicadores.
 */
export function aplicarFiltros() {
    if (appState.rutaOptimaLayerGroup) appState.rutaOptimaLayerGroup.clearLayers();
    appState.ultimaSecuenciaOptimizada = [];
    document.getElementById('btn-descargar-optimizacion').disabled = true;
    document.getElementById('btn-gmaps-redirect').style.display = 'none';
    document.getElementById('route-simulation-container').style.display = 'none';
    detenerSimulacion();

    const pNorms = appState.paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = appState.divisionesSeleccionadasMultiples.map(d => d);
    const rNorms = appState.rutasSeleccionadasMultiples.map(r => r.toLowerCase());
    const diaNorm = normalizarTexto(appState.diaSeleccionado);

    let clientesFiltrados = [];
    if (appState.diaSeleccionado !== 'NINGUNO') {
        clientesFiltrados = appState.rawClientes.filter(c => {
            const matchPais = (pNorms.length === 0) || pNorms.some(p => coincidePais(p, c));
            const matchDiv = (dCleans.length === 0) || dCleans.some(d => coincideDivision(d, c));
            const matchGrupo = (appState.gruposSeleccionadosMultiples.length === 0) || appState.gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c));
            const matchRuta = (rNorms.length === 0) || rNorms.some(r => coincideRuta(r, c));
            const matchDia = coincideDia(diaNorm, c);

            const infoRuta = appState.rawRutasDistribuidoras[c._rutaNorm] || appState.rawRutasDistribuidoras[c.RUTA] || {};
            const canalCliente = (infoRuta.canal || c.CANAL || c.Canal || '').toUpperCase().trim();

            let matchSwitchCanal = true;
            if (appState.swMasivos) {
                matchSwitchCanal = canalCliente.includes('DETALLE') || canalCliente.includes('PREFERENCIAL');
            } else if (appState.swEspecificos) {
                matchSwitchCanal = !canalCliente.includes('DETALLE') && !canalCliente.includes('PREFERENCIAL');
            }

            return matchPais && matchDiv && matchGrupo && matchRuta && matchDia && matchSwitchCanal;
        });
    }

    const rutasClientesVisibles = new Set();
    appState.rawClientes.forEach(c => {
        const mP = (pNorms.length === 0) || pNorms.some(p => coincidePais(p, c));
        const mD = (dCleans.length === 0) || dCleans.some(d => coincideDivision(d, c));
        if (mP && mD) rutasClientesVisibles.add(c._rutaNorm);
    });

    let featuresGeocercasFiltradas = [];
    if (appState.rawGeocercas && appState.rawGeocercas.features) {
        featuresGeocercasFiltradas = appState.rawGeocercas.features.filter(f => {
            const rNorm = f.properties._rutaNorm || '';
            const gNorm = f.properties.grupo_clean || 'Sin Grupo';
            const pGeoNorm = normalizarTexto(f.properties.pais_clean || '');
            const dGeoClean = f.properties.division_clean || f.properties.DIVISION || f.properties.Division || '';

            if (pNorms.length > 0) {
                const matchPaisDirecto = pNorms.some(p => pGeoNorm.includes(p) || p.includes(pGeoNorm));
                const matchPaisPorClientes = rutasClientesVisibles.has(rNorm);
                if (!matchPaisDirecto && !matchPaisPorClientes) return false;
            }

            if (dCleans.length > 0) {
                const matchDivDirecto = dCleans.some(d => coincideDivision(d, { division: dGeoClean, _divClean: normalizarTexto(dGeoClean) }));
                const matchDivPorClientes = rutasClientesVisibles.has(rNorm);
                if (!matchDivDirecto && !matchDivPorClientes) return false;
            }

            if (appState.gruposSeleccionadosMultiples.length > 0 && !appState.gruposSeleccionadosMultiples.some(gSel => coincideGrupo(gSel, { _grupoNorm: gNorm, grupo: gNorm }))) return false;
            if (rNorms.length > 0 && !rNorms.some(rSel => coincideRuta(rSel, { ruta: f.properties.ruta_clean, _rutaNorm: rNorm }))) return false;

            const infoRutaGeo = appState.rawRutasDistribuidoras[rNorm] || appState.rawRutasDistribuidoras[f.properties.ruta_clean] || {};
            const canalGeo = (infoRutaGeo.canal || f.properties.CANAL || f.properties.Canal || '').toUpperCase().trim();

            if (appState.swMasivos) {
                if (!canalGeo.includes('DETALLE') && !canalGeo.includes('PREFERENCIAL')) return false;
            } else if (appState.swEspecificos) {
                if (canalGeo.includes('DETALLE') || canalGeo.includes('PREFERENCIAL')) return false;
            }

            return true;
        });
    }

    appState.ultimoClientesFiltrados = clientesFiltrados;
    renderizarDistribuidoras(appState.rawDistribuidoras);
    const geocercasBounds = renderizarGeocercas(featuresGeocercasFiltradas);
    const { bounds: clientesBounds, fuera } = renderizarMarcadores(clientesFiltrados, featuresGeocercasFiltradas);
    appState.ultimoClientesFuera = fuera;

    actualizarTablaClientes(clientesFiltrados);
    actualizarTablaFuera(fuera);
    document.getElementById('kpi-total').innerText = clientesFiltrados.length;
    actualizarKPIsVisitas();

    const btnRutaOpt = document.getElementById('btn-trazar-ruta');
    if (appState.rutasSeleccionadasMultiples.length === 1 && appState.diaSeleccionado !== 'NINGUNO' && clientesFiltrados.length > 1) {
        btnRutaOpt.disabled = false;
        btnRutaOpt.title = "Trazar itinerario óptimo vial";
    } else {
        btnRutaOpt.disabled = true;
        btnRutaOpt.title = "Requiere seleccionar una Ruta específica y un Día activo";
    }

    let finalBounds = clientesBounds.isValid() ? clientesBounds : (geocercasBounds && geocercasBounds.isValid() ? geocercasBounds : null);

    if (finalBounds && appState.map) {
        appState.map.fitBounds(finalBounds, { padding: [40, 40], maxZoom: 15, animate: true });
    }
}

/**
 * Oculta filas de las tablas que no coinciden con el texto de búsqueda.
 */
export function filtrarTablaPorTexto() {
    clearTimeout(appState.searchDebounceTimeout);
    appState.searchDebounceTimeout = setTimeout(() => {
        const text = document.getElementById('input-search-cliente').value.toLowerCase().trim();
        if (!text) {
            actualizarTablaClientes(appState.ultimoClientesFiltrados);
            return;
        }
        const filtrados = appState.ultimoClientesFiltrados.filter(c => c._searchCache && c._searchCache.includes(text));
        actualizarTablaClientes(filtrados);
    }, 150);
}

/**
 * Reconstruye la tabla principal con los clientes filtrados.
 */
export function actualizarTablaClientes(clientes) {
    const tbody = document.getElementById('tabla-clientes-body');
    const subset = clientes.slice(0, 50);
    const rowsHtml = subset.map(c => {
        const isVisited = appState.clientesVisitadosMap.get(c.codigo) || false;
        const codigo = escapeHTML(c.codigo);
        return `
            <tr id="row-cli-${codigo}" class="clickable-row ${isVisited ? 'visited-row' : ''}" data-action="select-client" data-client-code="${codigo}">
                <td style="font-weight:700;color:#1e3a8a;">${codigo}</td>
                <td>${escapeHTML(c.nombre)}</td>
                <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:4px; font-weight:bold;">${escapeHTML(c.ruta)}</span></td>
                <td>${escapeHTML(c.dia)}</td>
                <td class="col-estado">
                    ${isVisited ? '<span style="color:#15803d; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Visitado</span>' : '<span style="color:#94a3b8;"><i class="fa-regular fa-circle"></i> Pendiente</span>'}
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rowsHtml;
}

/**
 * Reconstruye la tabla de clientes ubicados fuera de las geocercas.
 */
export function actualizarTablaFuera(clientesFuera) {
    const tbody = document.getElementById('tabla-fuera-body');
    tbody.innerHTML = '';
    const subsetFuera = clientesFuera.slice(0, 50);
    subsetFuera.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = `clickable-row outside-row`;
        tr.dataset.action = 'select-client';
        tr.dataset.clientCode = c.codigo;
        tr.innerHTML = `
            <td style="font-weight:700;color:#dc2626;">${escapeHTML(c.codigo)}</td>
            <td>${escapeHTML(c.nombre)}</td>
            <td><span style="background:#fee2e2; color:#b91c1c; padding:2px 5px; border-radius:4px; font-weight:bold;">${escapeHTML(c.ruta)}</span></td>
            <td>${escapeHTML(c.dia)}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Calcula y presenta totales, visitados y porcentaje de avance.
 */
export function actualizarKPIsVisitas() {
    let total = appState.ultimoClientesFiltrados.length;
    let visitados = 0;
    appState.ultimoClientesFiltrados.forEach(c => { if (appState.clientesVisitadosMap.get(c.codigo) === true) visitados++; });
    let pendientes = total - visitados;
    let porcentaje = total > 0 ? Math.round((visitados / total) * 100) : 0;
    document.getElementById('kpi-visitados').innerText = visitados;
    document.getElementById('kpi-pendientes').innerText = pendientes;
    document.getElementById('kpi-porcentaje').innerText = porcentaje + '%';

    const pBar = document.getElementById('progress-bar-fill');
    const pText = document.getElementById('progress-text');
    pBar.style.width = porcentaje + '%';
    pText.innerText = `AVANCE DE CUMPLIMIENTO: ${porcentaje}% (${visitados}/${total})`;
}

/**
 * Centra el mapa en un cliente y abre su marcador informativo.
 */
export function seleccionarClienteEnMapa(codigo) {
    const marker = appState.clienteMarkersMap[codigo];
    const clientObj = appState.rawClientes.find(c => c.codigo === codigo);
    if (marker && clientObj && clientObj.lat !== null && clientObj.lng !== null) {
        if (window.innerWidth <= 768) {
            const drawer = document.getElementById('mobile-drawer');
            if (!drawer.classList.contains('collapsed')) toggleDrawer();
        }
        appState.clusterMarkersGroup.zoomToShowLayer(marker, () => {
            appState.map.setView([clientObj.lat, clientObj.lng], 17, { animate: true });
            marker.openPopup();
        });
    } else {
        mostrarNotificacioniOS("Sin Coordenadas", "⚠️ Este cliente no posee coordenadas geográficas válidas.", "warning");
    }
}

// ============================================================
//  ALGORITMO OPTIMIZADO: BARRIDO SECTORIAL + 2-OPT RIGUROSO
// ============================================================
