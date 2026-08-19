/**
 * Registro de visitas: administra el formulario, captura GPS, confirmaciones y actualización del cliente.
 * Las funciones exportadas son utilizadas por otros módulos; appState concentra los datos compartidos.
 */

import { appState, normalizarTexto } from './01-core.js';
import { generarPopupHTML } from './03-map.js';
import { aplicarFiltros, actualizarKPIsVisitas } from './05-filters.js';
import { mostrarNotificacioniOS } from './07-session-export.js';

const STORAGE_KEY_PROGRESO = 'ruta360-progreso-visitas-v1';

const obtenerEstadoClienteSeleccionado = () =>
    document.querySelector('input[name="radio-estado-cliente"]:checked')?.value || '';

/**
 * Muestra únicamente el formulario relacionado con el estado elegido para el cliente.
 */
export function gestionarCambioEstadoCliente(estado) {
    document.getElementById('section-cliente-activo').style.display = estado === 'ACTIVO' ? 'flex' : 'none';
    document.getElementById('section-cliente-duplicado').style.display = estado === 'DUPLICADO' ? 'flex' : 'none';
    document.getElementById('section-cliente-otra-ruta').style.display = estado === 'OTRA_RUTA' ? 'flex' : 'none';
}

/**
 * Abre o cierra los campos opcionales del resultado comercial de la visita.
 */
export function toggleResultadoVisita() {
    const button = document.querySelector('[data-action="toggle-visit-result"]');
    const content = document.getElementById('visit-result-content');
    const abrir = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(abrir));
    content.classList.toggle('open', abrir);
}

/**
 * Guarda en el navegador únicamente el progreso generado durante las visitas.
 */
export function guardarProgresoLocal() {
    try {
        localStorage.setItem(STORAGE_KEY_PROGRESO, JSON.stringify({
            version: 1,
            guardadoEn: new Date().toISOString(),
            visitados: [...appState.clientesVisitadosMap.entries()],
            detalles: [...appState.registroVisitasDetalleMap.entries()]
        }));
    } catch (error) {
        console.warn('No fue posible guardar el progreso local:', error);
    }
}

/**
 * Recupera visitas y cambios de clientes después de una recarga del navegador.
 */
export function restaurarProgresoLocal() {
    try {
        const progreso = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESO) || 'null');
        if (!progreso || progreso.version !== 1) return 0;
        appState.clientesVisitadosMap = new Map(progreso.visitados || []);
        appState.registroVisitasDetalleMap = new Map(progreso.detalles || []);
        let restaurados = 0;
        appState.registroVisitasDetalleMap.forEach((detalle, codigo) => {
            const cliente = appState.rawClientes.find(c => c.codigo === codigo);
            if (!cliente || !detalle.clienteActualizado) return;
            Object.assign(cliente, detalle.clienteActualizado);
            cliente._diaNorm = normalizarTexto(cliente.dia);
            cliente._searchCache = `${cliente.nombre} ${cliente.codigo}`.toLowerCase();
            restaurados++;
        });
        return restaurados;
    } catch (error) {
        console.warn('No fue posible restaurar el progreso local:', error);
        return 0;
    }
}

/**
 * Carga los datos de un cliente y abre el formulario de registro de visita.
 */
export function abrirModalVisitaCliente(codigo) {
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
    document.querySelectorAll('input[name="radio-estado-cliente"]').forEach(radio => {
        radio.checked = radio.value === (prevData?.estadoCliente || '');
    });
    gestionarCambioEstadoCliente(prevData?.estadoCliente || '');
    document.getElementById('duplicado-codigo').value = prevData?.duplicadoCodigo || '';
    document.getElementById('duplicado-nombre').value = prevData?.duplicadoNombre || '';
    document.getElementById('otra-ruta-codigo').value = prevData?.otraRutaCodigo || '';
    document.getElementById('otra-ruta-nombre').value = prevData?.otraRutaNombre || '';
    document.querySelector('[data-action="toggle-visit-result"]').setAttribute('aria-expanded', 'false');
    document.getElementById('visit-result-content').classList.remove('open');
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

/**
 * Muestra los campos correspondientes al resultado de visita elegido.
 */
export function gestionarCambioTipoVisita(tipo) {
    document.getElementById('box-visita-si').style.display = (tipo === 'SI') ? 'flex' : 'none';
    document.getElementById('box-visita-no').style.display = (tipo === 'NO') ? 'flex' : 'none';
    document.getElementById('box-visita-otros').style.display = (tipo === 'OTROS') ? 'flex' : 'none';
}

/**
 * Normaliza el importe de venta introducido a dos posiciones decimales.
 */
export function formatearDecimalesVenta(input) {
    if (input.value !== "") {
        let val = parseFloat(input.value);
        if (!isNaN(val)) {
            input.value = val.toFixed(2);
        }
    }
}

/**
 * Detecta si el formulario contiene cambios que deban guardarse.
 */
export function evaluarCambioDataCliente() {
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

/**
 * Solicita la ubicación del dispositivo y la guarda temporalmente en el formulario.
 */
export function capturarCoordenadasGPS() {
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

/**
 * Cierra el formulario de visita sin aplicar cambios pendientes.
 */
export function cerrarModalVisita() {
    document.getElementById('modal-registro-visita').style.display = 'none';
}

/**
 * Valida el formulario y abre la confirmación antes de modificar datos.
 */
export function solicitarConfirmacionGuardar() {
    const estado = obtenerEstadoClienteSeleccionado();
    if (!estado) {
        mostrarNotificacioniOS('Estado requerido', 'Seleccione el estado actual del cliente antes de guardar.', 'warning');
        return;
    }
    if (estado === 'DUPLICADO' && (!document.getElementById('duplicado-codigo').value.trim() || !document.getElementById('duplicado-nombre').value.trim())) {
        mostrarNotificacioniOS('Datos incompletos', 'Ingrese el código y el nombre del cliente duplicado.', 'warning');
        return;
    }
    if (estado === 'OTRA_RUTA' && (!document.getElementById('otra-ruta-codigo').value.trim() || !document.getElementById('otra-ruta-nombre').value.trim())) {
        mostrarNotificacioniOS('Datos incompletos', 'Ingrese el código y el nombre de la ruta correcta.', 'warning');
        return;
    }
    document.getElementById('modal-confirmar-guardar').style.display = 'flex';
}

/**
 * Cierra la confirmación y permite seguir editando la visita.
 */
export function cerrarModalConfirmacion() {
    document.getElementById('modal-confirmar-guardar').style.display = 'none';
}

/**
 * Aplica al estado los cambios confirmados y refresca las vistas relacionadas.
 */
export function ejecutarGuardadoDefinitivo() {
    if (!appState.clienteEnEdicion) return;
    const cod = appState.clienteEnEdicion.codigo;
    const estadoCliente = obtenerEstadoClienteSeleccionado();

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
        estadoCliente,
        duplicadoCodigo: estadoCliente === 'DUPLICADO' ? document.getElementById('duplicado-codigo').value.trim() : '',
        duplicadoNombre: estadoCliente === 'DUPLICADO' ? document.getElementById('duplicado-nombre').value.trim() : '',
        otraRutaCodigo: estadoCliente === 'OTRA_RUTA' ? document.getElementById('otra-ruta-codigo').value.trim() : '',
        otraRutaNombre: estadoCliente === 'OTRA_RUTA' ? document.getElementById('otra-ruta-nombre').value.trim() : '',
        tipoVisita: tipoVisita,
        totalVenta: totalVentaVal ? parseFloat(totalVentaVal).toFixed(2) : '0.00',
        motivos: motivosSel,
        observacion: obsVal,
        fechaHora: new Date().toLocaleString(),
        clienteActualizado: estadoCliente === 'ACTIVO' ? {
            nombre: nomNuevo || appState.clienteEnEdicion.nombre,
            dia: diaNuevo,
            telefono: telNuevo || 'Sin teléfono',
            direccion: dirNuevo || appState.clienteEnEdicion.direccion,
            lat: appState.tempGpsLat,
            lng: appState.tempGpsLng
        } : null
    });

    if (estadoCliente === 'ACTIVO') {
        appState.clienteEnEdicion.nombre = nomNuevo || appState.clienteEnEdicion.nombre;
        appState.clienteEnEdicion.dia = diaNuevo;
        appState.clienteEnEdicion.telefono = telNuevo || 'Sin teléfono';
        appState.clienteEnEdicion.direccion = dirNuevo || appState.clienteEnEdicion.direccion;
        appState.clienteEnEdicion.lat = appState.tempGpsLat;
        appState.clienteEnEdicion.lng = appState.tempGpsLng;
    }

    appState.clienteEnEdicion._diaNorm = normalizarTexto(appState.clienteEnEdicion.dia);
    appState.clienteEnEdicion._searchCache = (appState.clienteEnEdicion.nombre + ' ' + appState.clienteEnEdicion.codigo).toLowerCase();

    cambiarEstadoVisitado(cod, true);
    guardarProgresoLocal();
    cerrarModalConfirmacion();
    cerrarModalVisita();
    aplicarFiltros();

    const mensajesEstado = {
        ACTIVO: huboActualizacionCliente ? 'Cliente activo y datos actualizados' : 'Cliente activo confirmado',
        NO_EXISTE: 'Cliente marcado como inexistente',
        DUPLICADO: 'Cliente duplicado registrado',
        OTRA_RUTA: 'Cambio de ruta solicitado'
    };
    const notifText = `${mensajesEstado[estadoCliente]}. El cambio del cliente ${cod} quedó guardado en este navegador.`;

    mostrarNotificacioniOS("Registro Exitoso", notifText, 'success');
}

/**
 * Actualiza el indicador de visita de un cliente y vuelve a aplicar los filtros.
 */
export function cambiarEstadoVisitado(codigo, visitado) {
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
