function esRolAvanzado() {
    return usuarioActual && ['Jefatura', 'Analista', 'Administrador'].includes(usuarioActual.rol);
}

function poblarFiltrosPermitidos() {
    poblarFiltroPais();
}

function poblarFiltroPais() {
    const selectPais = document.getElementById('select-pais');
    selectPais.innerHTML = '';

    if (usuarioActual && usuarioActual.pais !== 'TODOS') {
        paisesSeleccionadosMultiples = [usuarioActual.pais];
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

function renderizarChipsPaises() {
    const container = document.getElementById('chips-paises');
    container.innerHTML = '';
    paisesSeleccionadosMultiples.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'chip-item chip-pais';
        chip.innerHTML = `<span>${p}</span>`;
        if (usuarioActual && usuarioActual.pais === 'TODOS') {
            const btnRemove = document.createElement('span');
            btnRemove.className = 'btn-remove-chip';
            btnRemove.innerHTML = '&times;';
            btnRemove.onclick = () => removerPaisMultiple(p);
            chip.appendChild(btnRemove);
        }
        container.appendChild(chip);
    });
}

function removerPaisMultiple(pais) {
    paisesSeleccionadosMultiples = paisesSeleccionadosMultiples.filter(p => p !== pais);
    renderizarChipsPaises();
    actualizarOpcionesDivision();
    aplicarFiltros();
}

function actualizarOpcionesDivision() {
    const selectDiv = document.getElementById('select-division');
    selectDiv.innerHTML = '';

    if (usuarioActual && usuarioActual.division !== 'TODOS') {
        divisionesSeleccionadasMultiples = [usuarioActual.division];
        selectDiv.disabled = true;
    } else {
        selectDiv.disabled = false;
        const optTodos = document.createElement('option');
        optTodos.value = "TODOS";
        optTodos.textContent = "Seleccionar División";
        selectDiv.appendChild(optTodos);

        let divisionesDisponibles = [];
        if (paisesSeleccionadosMultiples.length === 0) {
            Object.values(DIVISIONES_POR_PAIS).forEach(list => {
                list.forEach(d => divisionesDisponibles.push(d.nombre));
            });
        } else {
            paisesSeleccionadosMultiples.forEach(p => {
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

        divisionesSeleccionadasMultiples = divisionesSeleccionadasMultiples.filter(d => divisionesDisponibles.includes(d));
    }

    renderizarChipsDivisiones();
    actualizarOpcionesGrupo();
}

function renderizarChipsDivisiones() {
    const container = document.getElementById('chips-divisiones');
    container.innerHTML = '';
    divisionesSeleccionadasMultiples.forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'chip-item chip-division';
        chip.innerHTML = `<span>${d}</span>`;
        if (usuarioActual && usuarioActual.division === 'TODOS') {
            const btnRemove = document.createElement('span');
            btnRemove.className = 'btn-remove-chip';
            btnRemove.innerHTML = '&times;';
            btnRemove.onclick = () => removerDivisionMultiple(d);
            chip.appendChild(btnRemove);
        }
        container.appendChild(chip);
    });
}

function removerDivisionMultiple(division) {
    divisionesSeleccionadasMultiples = divisionesSeleccionadasMultiples.filter(d => d !== division);
    renderizarChipsDivisiones();
    actualizarOpcionesGrupo();
    aplicarFiltros();
}

function actualizarOpcionesGrupo() {
    const selectGrupo = document.getElementById('select-grupo');
    selectGrupo.innerHTML = '<option value="TODOS">Seleccionar Grupo</option>';

    if (usuarioActual && usuarioActual.grupo && usuarioActual.grupo !== 'TODOS') {
        gruposSeleccionadosMultiples = [normalizarNombreGrupo(usuarioActual.grupo)];
        selectGrupo.disabled = true;
    } else {
        selectGrupo.disabled = false;

        const pNorms = paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
        const dCleans = divisionesSeleccionadasMultiples.map(d => d);

        let clientesBase = rawClientes;
        if (pNorms.length > 0) {
            clientesBase = clientesBase.filter(c => pNorms.some(p => coincidePais(p, c)));
        }
        if (dCleans.length > 0) {
            clientesBase = clientesBase.filter(c => dCleans.some(d => coincideDivision(d, c)));
        }

        const gruposClientes = clientesBase.map(c => c.grupo || c._grupoNorm);
        
        let geocercasBase = (rawGeocercas && rawGeocercas.features) ? rawGeocercas.features : [];
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

        gruposSeleccionadosMultiples = gruposSeleccionadosMultiples.filter(g => gruposUnicos.includes(g));
    }

    renderizarChipsGrupos();
    actualizarOpcionesRuta();
}

function renderizarChipsGrupos() {
    const container = document.getElementById('chips-grupos');
    container.innerHTML = '';
    gruposSeleccionadosMultiples.forEach(g => {
        const chip = document.createElement('div');
        chip.className = 'chip-item';
        chip.innerHTML = `<span>${g}</span>`;
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

function removerGrupoMultiple(grupo) {
    gruposSeleccionadosMultiples = gruposSeleccionadosMultiples.filter(g => g !== grupo);
    renderizarChipsGrupos();
    actualizarOpcionesRuta();
    aplicarFiltros();
}

function actualizarOpcionesRuta() {
    const selectRuta = document.getElementById('select-ruta');
    selectRuta.innerHTML = '<option value="TODOS">Seleccionar Ruta</option>';

    const pNorms = paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = divisionesSeleccionadasMultiples.map(d => d);

    let clientesBase = rawClientes;
    if (pNorms.length > 0) {
        clientesBase = clientesBase.filter(c => pNorms.some(p => coincidePais(p, c)));
    }
    if (dCleans.length > 0) {
        clientesBase = clientesBase.filter(c => dCleans.some(d => coincideDivision(d, c)));
    }
    if (gruposSeleccionadosMultiples.length > 0) {
        clientesBase = clientesBase.filter(c => gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c)));
    }

    let geocercasBase = (rawGeocercas && rawGeocercas.features) ? rawGeocercas.features : [];
    if (dCleans.length > 0) {
        geocercasBase = geocercasBase.filter(f => {
            const divGeo = f.properties.division_clean || f.properties.DIVISION || f.properties.Division || '';
            return dCleans.some(d => coincideDivision(d, { division: divGeo, _divClean: normalizarTexto(divGeo) }));
        });
    }
    if (gruposSeleccionadosMultiples.length > 0) {
        geocercasBase = geocercasBase.filter(f => gruposSeleccionadosMultiples.some(g => coincideGrupo(g, { _grupoNorm: f.properties.grupo_clean })));
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

    rutasSeleccionadasMultiples = rutasSeleccionadasMultiples.filter(r => rutasUnicas.includes(r));
    renderizarChipsRutas();
}

function renderizarChipsRutas() {
    const container = document.getElementById('chips-rutas');
    container.innerHTML = '';
    rutasSeleccionadasMultiples.forEach(r => {
        const chip = document.createElement('div');
        chip.className = 'chip-item';
        chip.innerHTML = `<span>${r}</span>`;
        const btnRemove = document.createElement('span');
        btnRemove.className = 'btn-remove-chip';
        btnRemove.innerHTML = '&times;';
        btnRemove.onclick = () => removerRutaMultiple(r);
        chip.appendChild(btnRemove);
        container.appendChild(chip);
    });
}

function removerRutaMultiple(ruta) {
    rutasSeleccionadasMultiples = rutasSeleccionadasMultiples.filter(r => r !== ruta);
    renderizarChipsRutas();
    aplicarFiltros();
}

// ============================================================
//  PROCESAMIENTO GENERAL DE FILTROS EN MAPA Y KPIS
// ============================================================
function aplicarFiltros() {
    if (rutaOptimaLayerGroup) rutaOptimaLayerGroup.clearLayers();
    ultimaSecuenciaOptimizada = [];
    document.getElementById('btn-descargar-optimizacion').disabled = true;
    document.getElementById('btn-gmaps-redirect').style.display = 'none';
    document.getElementById('route-simulation-container').style.display = 'none';
    detenerSimulacion();

    const pNorms = paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = divisionesSeleccionadasMultiples.map(d => d);
    const rNorms = rutasSeleccionadasMultiples.map(r => r.toLowerCase());
    const diaNorm = normalizarTexto(diaSeleccionado);

    let clientesFiltrados = [];
    if (diaSeleccionado !== 'NINGUNO') {
        clientesFiltrados = rawClientes.filter(c => {
            const matchPais = (pNorms.length === 0) || pNorms.some(p => coincidePais(p, c));
            const matchDiv = (dCleans.length === 0) || dCleans.some(d => coincideDivision(d, c));
            const matchGrupo = (gruposSeleccionadosMultiples.length === 0) || gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c));
            const matchRuta = (rNorms.length === 0) || rNorms.some(r => coincideRuta(r, c));
            const matchDia = coincideDia(diaNorm, c);

            const infoRuta = rawRutasDistribuidoras[c._rutaNorm] || rawRutasDistribuidoras[c.RUTA] || {};
            const canalCliente = (infoRuta.canal || c.CANAL || c.Canal || '').toUpperCase().trim();

            let matchSwitchCanal = true;
            if (swMasivos) {
                matchSwitchCanal = canalCliente.includes('DETALLE') || canalCliente.includes('PREFERENCIAL');
            } else if (swEspecificos) {
                matchSwitchCanal = !canalCliente.includes('DETALLE') && !canalCliente.includes('PREFERENCIAL');
            }

            return matchPais && matchDiv && matchGrupo && matchRuta && matchDia && matchSwitchCanal;
        });
    }

    const rutasClientesVisibles = new Set();
    rawClientes.forEach(c => {
        const mP = (pNorms.length === 0) || pNorms.some(p => coincidePais(p, c));
        const mD = (dCleans.length === 0) || dCleans.some(d => coincideDivision(d, c));
        if (mP && mD) rutasClientesVisibles.add(c._rutaNorm);
    });

    let featuresGeocercasFiltradas = [];
    if (rawGeocercas && rawGeocercas.features) {
        featuresGeocercasFiltradas = rawGeocercas.features.filter(f => {
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

            if (gruposSeleccionadosMultiples.length > 0 && !gruposSeleccionadosMultiples.some(gSel => coincideGrupo(gSel, { _grupoNorm: gNorm, grupo: gNorm }))) return false;
            if (rNorms.length > 0 && !rNorms.some(rSel => coincideRuta(rSel, { ruta: f.properties.ruta_clean, _rutaNorm: rNorm }))) return false;

            const infoRutaGeo = rawRutasDistribuidoras[rNorm] || rawRutasDistribuidoras[f.properties.ruta_clean] || {};
            const canalGeo = (infoRutaGeo.canal || f.properties.CANAL || f.properties.Canal || '').toUpperCase().trim();

            if (swMasivos) {
                if (!canalGeo.includes('DETALLE') && !canalGeo.includes('PREFERENCIAL')) return false;
            } else if (swEspecificos) {
                if (canalGeo.includes('DETALLE') || canalGeo.includes('PREFERENCIAL')) return false;
            }

            return true;
        });
    }

    ultimoClientesFiltrados = clientesFiltrados;
    renderizarDistribuidoras(rawDistribuidoras);
    const geocercasBounds = renderizarGeocercas(featuresGeocercasFiltradas);
    const { bounds: clientesBounds, fuera } = renderizarMarcadores(clientesFiltrados, featuresGeocercasFiltradas);
    ultimoClientesFuera = fuera;

    actualizarTablaClientes(clientesFiltrados);
    actualizarTablaFuera(fuera);
    document.getElementById('kpi-total').innerText = clientesFiltrados.length;
    actualizarKPIsVisitas();

    const btnRutaOpt = document.getElementById('btn-trazar-ruta');
    if (rutasSeleccionadasMultiples.length === 1 && diaSeleccionado !== 'NINGUNO' && clientesFiltrados.length > 1) {
        btnRutaOpt.disabled = false;
        btnRutaOpt.title = "Trazar itinerario óptimo vial";
    } else {
        btnRutaOpt.disabled = true;
        btnRutaOpt.title = "Requiere seleccionar una Ruta específica y un Día activo";
    }

    let finalBounds = clientesBounds.isValid() ? clientesBounds : (geocercasBounds && geocercasBounds.isValid() ? geocercasBounds : null);

    if (finalBounds && map) {
        map.fitBounds(finalBounds, { padding: [40, 40], maxZoom: 15, animate: true });
    }
}

function filtrarTablaPorTexto() {
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        const text = document.getElementById('input-search-cliente').value.toLowerCase().trim();
        if (!text) {
            actualizarTablaClientes(ultimoClientesFiltrados);
            return;
        }
        const filtrados = ultimoClientesFiltrados.filter(c => c._searchCache && c._searchCache.includes(text));
        actualizarTablaClientes(filtrados);
    }, 150);
}

function actualizarTablaClientes(clientes) {
    const tbody = document.getElementById('tabla-clientes-body');
    const subset = clientes.slice(0, 50);
    const rowsHtml = subset.map(c => {
        const isVisited = clientesVisitadosMap.get(c.codigo) || false;
        return `
            <tr id="row-cli-${c.codigo}" class="clickable-row ${isVisited ? 'visited-row' : ''}" onclick="seleccionarClienteEnMapa('${c.codigo}')">
                <td style="font-weight:700;color:#1e3a8a;">${c.codigo}</td>
                <td>${c.nombre}</td>
                <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:4px; font-weight:bold;">${c.ruta}</span></td>
                <td>${c.dia}</td>
                <td class="col-estado">
                    ${isVisited ? '<span style="color:#15803d; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Visitado</span>' : '<span style="color:#94a3b8;"><i class="fa-regular fa-circle"></i> Pendiente</span>'}
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rowsHtml;
}

function actualizarTablaFuera(clientesFuera) {
    const tbody = document.getElementById('tabla-fuera-body');
    tbody.innerHTML = '';
    const subsetFuera = clientesFuera.slice(0, 50);
    subsetFuera.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = `clickable-row outside-row`;
        tr.onclick = () => seleccionarClienteEnMapa(c.codigo);
        tr.innerHTML = `
            <td style="font-weight:700;color:#dc2626;">${c.codigo}</td>
            <td>${c.nombre}</td>
            <td><span style="background:#fee2e2; color:#b91c1c; padding:2px 5px; border-radius:4px; font-weight:bold;">${c.ruta}</span></td>
            <td>${c.dia}</td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarKPIsVisitas() {
    let total = ultimoClientesFiltrados.length;
    let visitados = 0;
    ultimoClientesFiltrados.forEach(c => { if (clientesVisitadosMap.get(c.codigo) === true) visitados++; });
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

function seleccionarClienteEnMapa(codigo) {
    const marker = clienteMarkersMap[codigo];
    const clientObj = rawClientes.find(c => c.codigo === codigo);
    if (marker && clientObj && clientObj.lat !== null && clientObj.lng !== null) {
        if (window.innerWidth <= 768) {
            const drawer = document.getElementById('mobile-drawer');
            if (!drawer.classList.contains('collapsed')) toggleDrawer();
        }
        clusterMarkersGroup.zoomToShowLayer(marker, () => {
            map.setView([clientObj.lat, clientObj.lng], 17, { animate: true });
            marker.openPopup();
        });
    } else {
        mostrarNotificacioniOS("Sin Coordenadas", "⚠️ Este cliente no posee coordenadas geográficas válidas.", "warning");
    }
}

// ============================================================
//  ALGORITMO OPTIMIZADO: BARRIDO SECTORIAL + 2-OPT RIGUROSO
// ============================================================
