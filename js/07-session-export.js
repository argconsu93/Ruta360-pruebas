function toggleMostrarPassword() {
    const inputPass = document.getElementById('input-password');
    const iconPass = document.getElementById('toggle-password-btn');
    
    if (inputPass.type === 'password') {
        inputPass.type = 'text';
        iconPass.classList.remove('fa-eye');
        iconPass.classList.add('fa-eye-slash');
    } else {
        inputPass.type = 'password';
        iconPass.classList.remove('fa-eye-slash');
        iconPass.classList.add('fa-eye');
    }
}    
    
function validarLogin() {
    const nombreSel = document.getElementById('select-usuario-login').value;
    const passInput = document.getElementById('input-password').value.trim().toLowerCase();
    const errorDiv = document.getElementById('login-error');
    
    if (!nombreSel) {
        errorDiv.textContent = "⚠️ Por favor seleccione su nombre.";
        errorDiv.style.display = 'block';
        return;
    }
    const userObj = USUARIOS_ROLES.find(u => u.nombre === nombreSel);
    if (userObj && userObj.pass && passInput && passInput === userObj.pass.toLowerCase()) {
        usuarioActual = userObj;
        document.getElementById('login-modal').style.display = 'none';
        
        const userText = usuarioActual.nombre;
        document.getElementById('txt-rol-activo').textContent = userText;
        document.getElementById('txt-rol-activo-mobile').textContent = userText;

        if (usuarioActual.rol === 'Administrador') {
            document.getElementById('panel-admin-actualizacion').style.display = 'flex';
        } else {
            document.getElementById('panel-admin-actualizacion').style.display = 'none';
        }
        
        if (esAccesoRegionalGlobal || usuarioActual.pais === 'TODOS') {
            paisesSeleccionadosMultiples = [];
            divisionesSeleccionadasMultiples = [];
        } else {
            const nombrePaisModal = PAISES_MAPA_NOMBRES[paisSeleccionado] || "El Salvador";
            paisesSeleccionadosMultiples = [nombrePaisModal];
            divisionesSeleccionadasMultiples = [divisionSeleccionada];
        }

        gruposSeleccionadosMultiples = (usuarioActual.grupo && usuarioActual.grupo !== 'TODOS') ? [normalizarNombreGrupo(usuarioActual.grupo)] : [];
        rutasSeleccionadasMultiples = [];

        inicializarMapa();
        poblarFiltrosPermitidos();
        
        setTimeout(() => {
            if (map) map.invalidateSize();
            aplicarFiltros();
        }, 150);

    } else {
        errorDiv.textContent = "⚠️ Contraseña incorrecta. Verifique e intente de nuevo.";
        errorDiv.style.display = 'block';
    }
}

function cerrarSesion() {
    usuarioActual = null;
    paisesSeleccionadosMultiples = [];
    divisionesSeleccionadasMultiples = [];
    gruposSeleccionadosMultiples = [];
    rutasSeleccionadasMultiples = [];
    esAccesoRegionalGlobal = false;

    document.getElementById('input-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    
    document.getElementById('step-credentials').style.display = 'none';
    document.getElementById('step-division').style.display = 'none';
    document.getElementById('step-pais').style.display = 'block';
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('mobile-user-dropdown').classList.remove('active');
    
    if (map) { map.remove(); map = null; }
}

// ============================================================
//  NOTIFICACIONES Y EXPORTACIONES
// ============================================================
function mostrarNotificacioniOS(titulo, contenido, tipoIcono = 'success', permitirHTML = false) {
    ultimaNotificacionesiOS = contenido;
    document.getElementById('ios-notif-title').textContent = titulo;
    const body = document.getElementById('ios-notif-body');
    if (permitirHTML) body.innerHTML = contenido;
    else body.textContent = contenido;
    
    const iconContainer = document.querySelector('.ios-notification-icon');
    if (tipoIcono === 'success') {
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#15803d;"></i>';
    } else if (tipoIcono === 'warning' || tipoIcono === 'alert') {
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:#eab308;"></i>';
    } else {
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-info" style="color:#0369a1;"></i>';
    }

    document.getElementById('ios-notif-overlay').style.display = 'flex';
    document.getElementById('notif-dot').style.display = 'block';
}

function cerrarNotificacioniOS() {
    document.getElementById('ios-notif-overlay').style.display = 'none';
}

function reabrirUltimaNotificacion() {
    if (ultimaNotificacionesiOS) {
        document.getElementById('ios-notif-overlay').style.display = 'flex';
    } else {
        mostrarNotificacioniOS("Notificaciones", "No hay notificaciones pendientes.", "info");
    }
}

function toggleMobileUserDropdown() {
    document.getElementById('mobile-user-dropdown').classList.toggle('active');
}

function abrirModalComparativo() {
    const tbody = document.getElementById('tabla-comparativo-body');
    tbody.innerHTML = '';
    
    const pNorms = paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = divisionesSeleccionadasMultiples.map(d => d);

    let clientesAnalizar = rawClientes;
    if (pNorms.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => pNorms.some(p => coincidePais(p, c)));
    }
    if (dCleans.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => dCleans.some(d => coincideDivision(d, c)));
    }
    if (gruposSeleccionadosMultiples.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c)));
    }

    const rutasMap = {};
    clientesAnalizar.forEach(c => {
        if (!rutasMap[c.ruta]) rutasMap[c.ruta] = { total: 0, visitados: 0 };
        rutasMap[c.ruta].total++;
        if (clientesVisitadosMap.get(c.codigo) === true) rutasMap[c.ruta].visitados++;
    });

    Object.keys(rutasMap).sort().forEach(r => {
        const data = rutasMap[r];
        const pct = data.total > 0 ? Math.round((data.visitados / data.total) * 100) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;">${escapeHTML(r)}</td>
            <td>${data.total}</td>
            <td style="color:#15803d; font-weight:bold;">${data.visitados}</td>
            <td>
                <span style="background:${pct >= 80 ? '#dcfce7' : '#fef3c7'}; color:${pct >= 80 ? '#15803d' : '#b45309'}; padding:2px 6px; border-radius:4px; font-weight:bold;">${pct}%</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('modal-comparativo').style.display = 'flex';
}

function cerrarModalComparativo() {
    document.getElementById('modal-comparativo').style.display = 'none';
}

function descargarClientesVisitados() {
    const listVisitados = [];
    rawClientes.forEach(c => {
        if (clientesVisitadosMap.get(c.codigo) === true) {
            const det = registroVisitasDetalleMap.get(c.codigo) || {};
            listVisitados.push({
                "País": c.pais,
                "División": c.division,
                "Grupo": c.grupo,
                "Ruta": c.ruta,
                "Codigo": c.codigo,
                "Cliente": c.nombre,
                "Teléfono": c.telefono,
                "Dirección": c.direccion,
                "Día de visita": c.dia,
                "Visita Efectiva": det.tipoVisita || 'SI',
                "Total Venta ($)": det.totalVenta || '0.00',
                "Motivos Detalle": (det.motivos || []).join(', '),
                "Observaciones": det.observacion || '',
                "Fecha/Hora Registro": det.fechaHora || ''
            });
        }
    });
    if (listVisitados.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ No hay ningún cliente marcado como 'Visitado' aún.", "warning");
        return;
    }
    const worksheet = XLSX.utils.json_to_sheet(listVisitados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes Visitados");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Clientes_Visitados_Bocadeli_${fecha}.xlsx`);
}

function descargarItinerarioFiltrado() {
    if (!ultimoClientesFiltrados || ultimoClientesFiltrados.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ No hay clientes disponibles en la lista con los filtros seleccionados.", "warning");
        return;
    }
    const datosExportar = ultimoClientesFiltrados.map(c => {
        const det = registroVisitasDetalleMap.get(c.codigo) || {};
        return {
            "País": c.pais,
            "División": c.division,
            "Grupo": c.grupo,
            "Ruta": c.ruta,
            "Codigo": c.codigo,
            "Cliente": c.nombre,
            "Teléfono": c.telefono,
            "Direccion": c.direccion,
            "Dia de visita": c.dia,
            "Estado Visitado": clientesVisitadosMap.get(c.codigo) ? "SÍ" : "NO",
            "Resultado Visita": det.tipoVisita || '-',
            "Total Venta ($)": det.totalVenta || '0.00',
            "Motivos": (det.motivos || []).join(', '),
            "Observaciones": det.observacion || '',
            "Fuera de Geocerca": ultimoClientesFuera.some(f => f.codigo === c.codigo) ? "SÍ" : "NO"
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Itinerario");
    XLSX.writeFile(workbook, `Itinerario_Bocadeli.xlsx`);
}

function descargarClientesFueraGeocerca() {
    if (!ultimoClientesFuera || ultimoClientesFuera.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ No hay clientes fuera de geocerca en la selección actual.", "warning");
        return;
    }
    const datosExportar = ultimoClientesFuera.map(c => {
        const det = registroVisitasDetalleMap.get(c.codigo) || {};
        return {
            "País": c.pais || '',
            "División": c.division || '',
            "Grupo": c.grupo || '',
            "Ruta": c.ruta || '',
            "Código": c.codigo || '',
            "Cliente": c.nombre || '',
            "Día de Visita": c.dia || '',
            "Dirección": c.direccion || '',
            "Teléfono": c.telefono || '',
            "Latitud": c.lat || '',
            "Longitud": c.lng || '',
            "Estado Visitado": clientesVisitadosMap.get(c.codigo) ? "SÍ" : "NO",
            "Resultado Visita": det.tipoVisita || '-',
            "Total Venta ($)": det.totalVenta || '0.00'
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fuera_de_Geocerca");
    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Clientes_Fuera_Geocerca_${fecha}.xlsx`);
    mostrarNotificacioniOS("Descarga Exitosa", `✅ Se descargaron ${ultimoClientesFuera.length} clientes fuera de geocerca.`, "success");
}

function subirNuevoCSV(file) {
    if (!file) return;
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawClientes = parsearFilasClientes(results.data);
            procesarPropiedadesGeocercas();
            sincronizarGruposClientes();
            poblarFiltrosPermitidos();
            aplicarFiltros();
            mostrarNotificacioniOS("Carga Exitosa", "✅ CSV cargado en memoria correctamente.", "success");
        }
    });
}

function subirNuevoGeoJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            rawGeocercas = JSON.parse(e.target.result);
            procesarPropiedadesGeocercas();
            sincronizarGruposClientes();
            poblarFiltrosPermitidos();
            aplicarFiltros();
            mostrarNotificacioniOS("Geocercas Cargadas", "✅ GeoJSON de rutas cargado correctamente.", "success");
        } catch(err) { 
            mostrarNotificacioniOS("Error GeoJSON", "❌ Error al procesar GeoJSON: " + err, "warning"); 
        }
    };
    reader.readAsText(file);
}

function subirNuevoGeoJSONDistribuidoras(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            rawDistribuidoras = JSON.parse(e.target.result);
            aplicarFiltros();
            mostrarNotificacioniOS("Distribuidoras Cargadas", "✅ GeoJSON de distribuidoras cargado correctamente.", "success");
        } catch(err) { 
            mostrarNotificacioniOS("Error GeoJSON", "❌ Error al procesar GeoJSON: " + err, "warning"); 
        }
    };
    reader.readAsText(file);
}

function actualizarFechaActual() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let fechaTexto = fecha.toLocaleDateString('es-ES', opciones);
    const textFormatted = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
    document.getElementById('fecha-actual').textContent = fechaTexto;
    document.getElementById('fecha-actual-mobile').textContent = fechaTexto;
}

function toggleDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const label = document.getElementById('drawer-btn-label');
    drawer.classList.toggle('collapsed');
    label.innerHTML = drawer.classList.contains('collapsed') 
        ? '<i class="fa-solid fa-chevron-up"></i> Mostrar Panel de Control' 
        : '<i class="fa-solid fa-chevron-down"></i> Ocultar';
    setTimeout(() => { if (map) map.invalidateSize(); }, 360);
}

// ============================================================
//  ARRANQUE DE APLICACIÓN Y ASIGNACIÓN DE EVENTOS
// ============================================================
