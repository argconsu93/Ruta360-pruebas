function abrirModalVisitaCliente(codigo) {
    const client = appState.rawClientes.find(c => c.codigo === codigo);
    if (!client) return;
    
    appState.clienteEnEdicion = client;
    appState.tempGpsLat = client.lat;
    appState.tempGpsLng = client.lng;

    document.getElementById('visit-modal-client-name').textContent = client.nombre;
    document.getElementById('visit-modal-client-code').textContent = client.codigo;
    document.getElementById('visit-modal-client-route').textContent = client.ruta;

    document.getElementById('edit-nombre-tienda').value = client.nombre;
    document.getElementById('edit-dia-visita').value = client.dia;
    document.getElementById('edit-telefono-cliente').value = client.telefono !== 'Sin teléfono' ? client.telefono : '';
    document.getElementById('edit-direccion-cliente').value = client.direccion;
    
    document.getElementById('txt-coords-actuales-display').textContent = `Lat: ${client.lat ? client.lat.toFixed(5) : '-'}, Lng: ${client.lng ? client.lng.toFixed(5) : '-'}`;

    const prevData = appState.registroVisitasDetalleMap.get(codigo);
    if (prevData) {
        const radios = document.getElementsByName('radio-visita');
        radios.forEach(r => { if (r.value === prevData.tipoVisita) r.checked = true; });
        gestionarCambioTipoVisita(prevData.tipoVisita);

        document.getElementById('input-total-venta').value = prevData.totalVenta || '';
        document.getElementById('txt-observacion-visita').value = prevData.observacion || '';

        const setCheckboxes = (selector, listArr) => {
            document.querySelectorAll(selector).forEach(chk => {
                chk.checked = listArr.includes(chk.value);
            });
        };
        setCheckboxes('.chk-visita-si-motivo', prevData.motivos || []);
        setCheckboxes('.chk-visita-no-motivo', prevData.motivos || []);
        setCheckboxes('.chk-visita-otros-motivo', prevData.motivos || []);
    } else {
        const radios = document.getElementsByName('radio-visita');
        radios.forEach(r => r.checked = false);
        gestionarCambioTipoVisita(null);
        document.getElementById('input-total-venta').value = '';
        document.getElementById('txt-observacion-visita').value = '';
        document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    }

    evaluarCambioDataCliente();
    document.getElementById('modal-registro-visita').style.display = 'flex';
}

function gestionarCambioTipoVisita(tipo) {
    document.getElementById('box-visita-si').style.display = (tipo === 'SI') ? 'flex' : 'none';
    document.getElementById('box-visita-no').style.display = (tipo === 'NO') ? 'flex' : 'none';
    document.getElementById('box-visita-otros').style.display = (tipo === 'OTROS') ? 'flex' : 'none';
}

function formatearDecimalesVenta(input) {
    if (input.value !== "") {
        let val = parseFloat(input.value);
        if (!isNaN(val)) {
            input.value = val.toFixed(2);
        }
    }
}

function evaluarCambioDataCliente() {
    if (!appState.clienteEnEdicion) return;
    
    const nomNuevo = document.getElementById('edit-nombre-tienda').value.trim();
    const diaNuevo = document.getElementById('edit-dia-visita').value;
    const telNuevo = document.getElementById('edit-telefono-cliente').value.trim();
    const dirNuevo = document.getElementById('edit-direccion-cliente').value.trim();

    const cambioNombre = nomNuevo !== appState.clienteEnEdicion.nombre;
    const cambioDia = diaNuevo !== appState.clienteEnEdicion.dia;
    const cambioTel = telNuevo !== (appState.clienteEnEdicion.telefono !== 'Sin teléfono' ? appState.clienteEnEdicion.telefono : '');
    const cambioDir = dirNuevo !== appState.clienteEnEdicion.direccion;
    const cambioGPS = (appState.tempGpsLat !== appState.clienteEnEdicion.lat) || (appState.tempGpsLng !== appState.clienteEnEdicion.lng);

    const btnGuardar = document.getElementById('btn-guardar-visita');
    if (cambioNombre || cambioDia || cambioTel || cambioDir || cambioGPS) {
        btnGuardar.textContent = "Guardar y Actualizar";
    } else {
        btnGuardar.textContent = "Guardar";
    }
}

function capturarCoordenadasGPS() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.tempGpsLat = position.coords.latitude;
                appState.tempGpsLng = position.coords.longitude;
                document.getElementById('txt-coords-actuales-display').textContent = `Nuevas GPS -> Lat: ${appState.tempGpsLat.toFixed(5)}, Lng: ${appState.tempGpsLng.toFixed(5)}`;
                evaluarCambioDataCliente();
                mostrarNotificacioniOS("GPS Capturado", "📍 Coordenadas geográficas obtenidas con éxito.", "success");
            },
            (error) => {
                mostrarNotificacioniOS("Error GPS", "⚠️ Error al obtener localización: " + error.message, "warning");
            },
            { enableHighAccuracy: true }
        );
    } else {
        mostrarNotificacioniOS("GPS No Soportado", "⚠️ Geolocalización no soportada por su navegador.", "warning");
    }
}

function cerrarModalVisita() {
    document.getElementById('modal-registro-visita').style.display = 'none';
}

function solicitarConfirmacionGuardar() {
    document.getElementById('modal-confirmar-guardar').style.display = 'flex';
}

function cerrarModalConfirmacion() {
    document.getElementById('modal-confirmar-guardar').style.display = 'none';
}

function ejecutarGuardadoDefinitivo() {
    if (!appState.clienteEnEdicion) return;
    const cod = appState.clienteEnEdicion.codigo;

    const nomNuevo = document.getElementById('edit-nombre-tienda').value.trim();
    const diaNuevo = document.getElementById('edit-dia-visita').value;
    const telNuevo = document.getElementById('edit-telefono-cliente').value.trim();
    const dirNuevo = document.getElementById('edit-direccion-cliente').value.trim();

    const cambioNombre = nomNuevo !== appState.clienteEnEdicion.nombre;
    const cambioDia = diaNuevo !== appState.clienteEnEdicion.dia;
    const cambioTel = telNuevo !== (appState.clienteEnEdicion.telefono !== 'Sin teléfono' ? appState.clienteEnEdicion.telefono : '');
    const cambioDir = dirNuevo !== appState.clienteEnEdicion.direccion;
    const cambioGPS = (appState.tempGpsLat !== appState.clienteEnEdicion.lat) || (appState.tempGpsLng !== appState.clienteEnEdicion.lng);

    const huboActualizacionCliente = cambioNombre || cambioDia || cambioTel || cambioDir || cambioGPS;

    const radioSel = document.querySelector('input[name="radio-visita"]:checked');
    const tipoVisita = radioSel ? radioSel.value : 'NO_DEFINIDO';
    
    let motivosSel = [];
    if (tipoVisita === 'SI') {
        document.querySelectorAll('.chk-visita-si-motivo:checked').forEach(c => motivosSel.push(c.value));
    } else if (tipoVisita === 'NO') {
        document.querySelectorAll('.chk-visita-no-motivo:checked').forEach(c => motivosSel.push(c.value));
    } else if (tipoVisita === 'OTROS') {
        document.querySelectorAll('.chk-visita-otros-motivo:checked').forEach(c => motivosSel.push(c.value));
    }

    const totalVentaVal = document.getElementById('input-total-venta').value;
    const obsVal = document.getElementById('txt-observacion-visita').value.trim();

    appState.registroVisitasDetalleMap.set(cod, {
        tipoVisita: tipoVisita,
        totalVenta: totalVentaVal ? parseFloat(totalVentaVal).toFixed(2) : '0.00',
        motivos: motivosSel,
        observacion: obsVal,
        fechaHora: new Date().toLocaleString()
    });

    appState.clienteEnEdicion.nombre = nomNuevo || appState.clienteEnEdicion.nombre;
    appState.clienteEnEdicion.dia = diaNuevo;
    appState.clienteEnEdicion.telefono = telNuevo || 'Sin teléfono';
    appState.clienteEnEdicion.direccion = dirNuevo || appState.clienteEnEdicion.direccion;
    appState.clienteEnEdicion.lat = appState.tempGpsLat;
    appState.clienteEnEdicion.lng = appState.tempGpsLng;

    appState.clienteEnEdicion._diaNorm = normalizarTexto(appState.clienteEnEdicion.dia);
    appState.clienteEnEdicion._searchCache = (appState.clienteEnEdicion.nombre + ' ' + appState.clienteEnEdicion.codigo).toLowerCase();

    cambiarEstadoVisitado(cod, true);
    cerrarModalConfirmacion();
    cerrarModalVisita();
    aplicarFiltros();

    let notifText = huboActualizacionCliente 
        ? `Información del cliente ${cod} guardada y actualizada correctamente.`
        : `Información del cliente ${cod} guardada correctamente.`;

    mostrarNotificacioniOS("Registro Exitoso", notifText, 'success');
}

function cambiarEstadoVisitado(codigo, visitado) {
    appState.clientesVisitadosMap.set(codigo, visitado);
    const marker = appState.clienteMarkersMap[codigo];
    if (marker) {
        marker.setStyle({
            fillColor: visitado ? '#15803d' : '#0369a1',
            color: visitado ? '#166534' : '#075985',
            fillOpacity: visitado ? 0.95 : 0.85
        });
        const clientObj = appState.rawClientes.find(c => c.codigo === codigo);
        if (clientObj) marker.setPopupContent(generarPopupHTML(clientObj, visitado));
    }
    const fila = document.getElementById(`row-cli-${codigo}`);
    if (fila) {
        const cellEstado = fila.querySelector('.col-estado');
        if (visitado) {
            fila.classList.add('visited-row');
            if (cellEstado) cellEstado.innerHTML = '<span style="color:#15803d; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Visitado</span>';
        } else {
            fila.classList.remove('visited-row');
            if (cellEstado) cellEstado.innerHTML = '<span style="color:#94a3b8;"><i class="fa-regular fa-circle"></i> Pendiente</span>';
        }
    }
    actualizarKPIsVisitas();
}

// ============================================================
//  FILTROS JERÁRQUICOS MULTISELECCIÓN Y CORRECCIÓN DE GRUPOS/RUTAS
// ============================================================
