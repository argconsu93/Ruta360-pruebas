/**
 * Sesión e intercambio de archivos: login, notificaciones, exportaciones y cargas temporales reversibles.
 * Las funciones exportadas son utilizadas por otros módulos; appState concentra los datos compartidos.
 */

import {
    PAISES_MAPA_NOMBRES, appState, coincideDivision, coincideGrupo, coincidePais,
    crearEtiquetaRutas, escapeHTML, normalizarNombreGrupo, normalizarTexto
} from './01-core.js';
import {
    LIMITES_CARGA, inicializarMapa, parsearFilasClientes, procesarPropiedadesGeocercas,
    sincronizarGruposClientes, validarArchivoCarga, validarClientesImportados,
    validarColeccionGeoJSON
} from './02-data.js';
import { aplicarFiltros, poblarFiltrosPermitidos } from './05-filters.js';

/**
 * Alterna la contraseña entre texto visible y campo protegido.
 */
export function toggleMostrarPassword() {
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
    
/**
 * Comprueba las credenciales cargadas y habilita la aplicación para el usuario válido.
 */
export function validarLogin() {
    const nombreSel = document.getElementById('select-usuario-login').value;
    const passInput = document.getElementById('input-password').value.trim().toLowerCase();
    const errorDiv = document.getElementById('login-error');

    // clientes.csv puede tardar por su tamaño. Evita construir filtros vacíos
    // si el usuario intenta ingresar antes de que finalice la carga principal.
    if (!appState.datosInicialesListos) {
        errorDiv.textContent = "⏳ Los clientes todavía se están cargando. Espere un momento e intente nuevamente.";
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!nombreSel) {
        errorDiv.textContent = "⚠️ Por favor seleccione su nombre.";
        errorDiv.style.display = 'block';
        return;
    }
    const userObj = appState.usuariosRoles.find(u => u.nombre === nombreSel);
    if (userObj && userObj.pass && passInput && passInput === userObj.pass.toLowerCase()) {
        appState.usuarioActual = userObj;
        document.getElementById('login-modal').style.display = 'none';
        
        const userText = appState.usuarioActual.nombre;
        document.getElementById('txt-rol-activo').textContent = userText;
        document.getElementById('txt-rol-activo-mobile').textContent = userText;

        if (appState.usuarioActual.rol === 'Administrador') {
            document.getElementById('panel-admin-actualizacion').style.display = 'flex';
        } else {
            document.getElementById('panel-admin-actualizacion').style.display = 'none';
        }
        
        if (appState.esAccesoRegional || appState.usuarioActual.pais === 'TODOS') {
            appState.paisesSeleccionadosMultiples = [];
            appState.divisionesSeleccionadasMultiples = [];
        } else {
            const nombrePaisModal = PAISES_MAPA_NOMBRES[appState.paisSeleccionado] || "El Salvador";
            appState.paisesSeleccionadosMultiples = [nombrePaisModal];
            appState.divisionesSeleccionadasMultiples = [appState.divisionSeleccionada];
        }

        appState.gruposSeleccionadosMultiples = (appState.usuarioActual.grupo && appState.usuarioActual.grupo !== 'TODOS') ? [normalizarNombreGrupo(appState.usuarioActual.grupo)] : [];
        appState.rutasSeleccionadasMultiples = [];

        inicializarMapa();
        poblarFiltrosPermitidos();
        
        setTimeout(() => {
            if (appState.map) appState.map.invalidateSize();
            aplicarFiltros();
        }, 150);

    } else {
        errorDiv.textContent = "⚠️ Contraseña incorrecta. Verifique e intente de nuevo.";
        errorDiv.style.display = 'block';
    }
}

/**
 * Limpia la sesión actual y devuelve la interfaz al acceso inicial.
 */
export function cerrarSesion() {
    appState.usuarioActual = null;
    appState.paisesSeleccionadosMultiples = [];
    appState.divisionesSeleccionadasMultiples = [];
    appState.gruposSeleccionadosMultiples = [];
    appState.rutasSeleccionadasMultiples = [];
    appState.esAccesoRegional = false;

    document.getElementById('input-password').value = '';
    document.getElementById('login-error').style.display = 'none';
    
    document.getElementById('step-credentials').style.display = 'none';
    document.getElementById('step-division').style.display = 'none';
    document.getElementById('step-pais').style.display = 'block';
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('mobile-user-dropdown').classList.remove('active');
    
    if (appState.map) { appState.map.remove(); appState.map = null; }
}

// ============================================================
//  NOTIFICACIONES Y EXPORTACIONES
// ============================================================
/**
 * Presenta una notificación reutilizable con texto seguro o HTML expresamente permitido.
 */
export function mostrarNotificacioniOS(titulo, contenido, tipoIcono = 'success', permitirHTML = false) {
    appState.ultimaNotificacionesiOS = contenido;
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

/**
 * Oculta la notificación actualmente visible.
 */
export function cerrarNotificacioniOS() {
    document.getElementById('ios-notif-overlay').style.display = 'none';
}

/**
 * Vuelve a mostrar el último mensaje almacenado.
 */
export function reabrirUltimaNotificacion() {
    if (appState.ultimaNotificacionesiOS) {
        document.getElementById('ios-notif-overlay').style.display = 'flex';
    } else {
        mostrarNotificacioniOS("Notificaciones", "No hay notificaciones pendientes.", "info");
    }
}

/**
 * Abre o cierra el menú del usuario en pantallas pequeñas.
 */
export function toggleMobileUserDropdown() {
    document.getElementById('mobile-user-dropdown').classList.toggle('active');
}

/**
 * Calcula diferencias de visita y abre el resumen comparativo.
 */
export function abrirModalComparativo() {
    const tbody = document.getElementById('tabla-comparativo-body');
    tbody.innerHTML = '';
    
    const pNorms = appState.paisesSeleccionadosMultiples.map(p => normalizarTexto(p));
    const dCleans = appState.divisionesSeleccionadasMultiples.map(d => d);

    let clientesAnalizar = appState.rawClientes;
    if (pNorms.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => pNorms.some(p => coincidePais(p, c)));
    }
    if (dCleans.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => dCleans.some(d => coincideDivision(d, c)));
    }
    if (appState.gruposSeleccionadosMultiples.length > 0) {
        clientesAnalizar = clientesAnalizar.filter(c => appState.gruposSeleccionadosMultiples.some(g => coincideGrupo(g, c)));
    }

    const rutasMap = {};
    clientesAnalizar.forEach(c => {
        if (!rutasMap[c.ruta]) rutasMap[c.ruta] = { total: 0, visitados: 0 };
        rutasMap[c.ruta].total++;
        if (appState.clientesVisitadosMap.get(c.codigo) === true) rutasMap[c.ruta].visitados++;
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

/**
 * Cierra el resumen comparativo de resultados.
 */
export function cerrarModalComparativo() {
    document.getElementById('modal-comparativo').style.display = 'none';
}

const camposGestionCliente = (detalle = {}) => ({
    "Estado actual del cliente": detalle.estadoCliente || '',
    "Código cliente duplicado": detalle.duplicadoCodigo || '',
    "Nombre cliente duplicado": detalle.duplicadoNombre || '',
    "Código ruta correcta": detalle.otraRutaCodigo || '',
    "Nombre ruta correcta": detalle.otraRutaNombre || ''
});

/**
 * Exporta a Excel los clientes marcados como visitados.
 */
export function descargarClientesVisitados() {
    const listVisitados = [];
    appState.rawClientes.forEach(c => {
        if (appState.clientesVisitadosMap.get(c.codigo) === true) {
            const det = appState.registroVisitasDetalleMap.get(c.codigo) || {};
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
                ...camposGestionCliente(det),
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
    const ruta = crearEtiquetaRutas(listVisitados.map(item => ({ ruta: item.Ruta })));
    XLSX.writeFile(workbook, `Clientes_Visitados_Bocadeli_Ruta_${ruta}_${fecha}.xlsx`);
}

/**
 * Exporta a Excel el itinerario correspondiente a los filtros actuales.
 */
export function descargarItinerarioFiltrado() {
    if (!appState.ultimoClientesFiltrados || appState.ultimoClientesFiltrados.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ No hay clientes disponibles en la lista con los filtros seleccionados.", "warning");
        return;
    }
    const datosExportar = appState.ultimoClientesFiltrados.map(c => {
        const det = appState.registroVisitasDetalleMap.get(c.codigo) || {};
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
            ...camposGestionCliente(det),
            "Estado Visitado": appState.clientesVisitadosMap.get(c.codigo) ? "SÍ" : "NO",
            "Resultado Visita": det.tipoVisita || '-',
            "Total Venta ($)": det.totalVenta || '0.00',
            "Motivos": (det.motivos || []).join(', '),
            "Observaciones": det.observacion || '',
            "Fuera de Geocerca": appState.ultimoClientesFuera.some(f => f.codigo === c.codigo) ? "SÍ" : "NO"
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Itinerario");
    const ruta = crearEtiquetaRutas(appState.ultimoClientesFiltrados);
    XLSX.writeFile(workbook, `Itinerario_Bocadeli_Ruta_${ruta}.xlsx`);
}

/**
 * Exporta a Excel los clientes detectados fuera de geocercas.
 */
export function descargarClientesFueraGeocerca() {
    if (!appState.ultimoClientesFuera || appState.ultimoClientesFuera.length === 0) {
        mostrarNotificacioniOS("Sin Datos", "⚠️ No hay clientes fuera de geocerca en la selección actual.", "warning");
        return;
    }
    const datosExportar = appState.ultimoClientesFuera.map(c => {
        const det = appState.registroVisitasDetalleMap.get(c.codigo) || {};
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
            ...camposGestionCliente(det),
            "Estado Visitado": appState.clientesVisitadosMap.get(c.codigo) ? "SÍ" : "NO",
            "Resultado Visita": det.tipoVisita || '-',
            "Total Venta ($)": det.totalVenta || '0.00'
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(datosExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fuera_de_Geocerca");
    const fecha = new Date().toISOString().slice(0, 10);
    const ruta = crearEtiquetaRutas(appState.ultimoClientesFuera);
    XLSX.writeFile(workbook, `Clientes_Fuera_Geocerca_Ruta_${ruta}_${fecha}.xlsx`);
    mostrarNotificacioniOS("Descarga Exitosa", `✅ Se descargaron ${appState.ultimoClientesFuera.length} clientes fuera de geocerca.`, "success");
}

/**
 * Valida y aplica temporalmente un archivo CSV de clientes.
 */
export function subirNuevoCSV(file) {
    if (!file) return;
    try {
        validarArchivoCarga(file, { extensiones: ['.csv'], maxBytes: LIMITES_CARGA.csvBytes });
    } catch (error) {
        mostrarNotificacioniOS('Archivo CSV rechazado', `❌ ${error.message}`, 'warning');
        return;
    }
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            try {
                const clientes = validarClientesImportados(parsearFilasClientes(results.data), results.errors);
                guardarRespaldoCargaTemporal();
                appState.rawClientes = clientes;
                procesarPropiedadesGeocercas();
                sincronizarGruposClientes();
                poblarFiltrosPermitidos();
                aplicarFiltros();
                mostrarNotificacioniOS("Carga Exitosa", `✅ ${clientes.length} clientes cargados en memoria.`, "success");
            } catch (error) {
                mostrarNotificacioniOS('CSV inválido', `❌ ${error.message}`, 'warning');
            }
        },
        error: function() {
            mostrarNotificacioniOS('Error de lectura', '❌ No fue posible leer el archivo CSV.', 'warning');
        }
    });
}

/**
 * Valida y aplica temporalmente un archivo de geocercas.
 */
export function subirNuevoGeoJSON(file) {
    if (!file) return;
    try {
        validarArchivoCarga(file, { extensiones: ['.geojson', '.json'], maxBytes: LIMITES_CARGA.geojsonBytes });
    } catch (error) {
        mostrarNotificacioniOS('Archivo GeoJSON rechazado', `❌ ${error.message}`, 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const geocercas = validarColeccionGeoJSON(JSON.parse(e.target.result));
            guardarRespaldoCargaTemporal();
            appState.rawGeocercas = geocercas;
            procesarPropiedadesGeocercas();
            sincronizarGruposClientes();
            poblarFiltrosPermitidos();
            aplicarFiltros();
            mostrarNotificacioniOS("Geocercas Cargadas", "✅ GeoJSON de rutas cargado correctamente.", "success");
        } catch(error) {
            mostrarNotificacioniOS("Error GeoJSON", `❌ ${error.message}`, "warning");
        }
    };
    reader.onerror = function() {
        mostrarNotificacioniOS('Error de lectura', '❌ No fue posible leer el archivo GeoJSON.', 'warning');
    };
    reader.readAsText(file);
}

/**
 * Valida y aplica temporalmente un archivo de distribuidoras.
 */
export function subirNuevoGeoJSONDistribuidoras(file) {
    if (!file) return;
    try {
        validarArchivoCarga(file, { extensiones: ['.geojson', '.json'], maxBytes: LIMITES_CARGA.geojsonBytes });
    } catch (error) {
        mostrarNotificacioniOS('Archivo GeoJSON rechazado', `❌ ${error.message}`, 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const distribuidoras = validarColeccionGeoJSON(JSON.parse(e.target.result));
            guardarRespaldoCargaTemporal();
            appState.rawDistribuidoras = distribuidoras;
            aplicarFiltros();
            mostrarNotificacioniOS("Distribuidoras Cargadas", "✅ GeoJSON de distribuidoras cargado correctamente.", "success");
        } catch(error) {
            mostrarNotificacioniOS("Error GeoJSON", `❌ ${error.message}`, "warning");
        }
    };
    reader.onerror = function() {
        mostrarNotificacioniOS('Error de lectura', '❌ No fue posible leer el archivo GeoJSON.', 'warning');
    };
    reader.readAsText(file);
}

/**
 * Crea una copia independiente para evitar modificaciones involuntarias del respaldo.
 */
function copiarDatos(datos) {
    return JSON.parse(JSON.stringify(datos));
}

/**
 * Conserva una sola copia de los datos originales antes de una carga temporal.
 */
export function guardarRespaldoCargaTemporal() {
    if (!appState.respaldoCargaTemporal) {
        appState.respaldoCargaTemporal = {
            clientes: copiarDatos(appState.rawClientes),
            geocercas: copiarDatos(appState.rawGeocercas),
            distribuidoras: copiarDatos(appState.rawDistribuidoras)
        };
    }
    document.getElementById('btn-restaurar-datos').style.display = 'block';
}

/**
 * Recupera los datos previos y vuelve a construir filtros y mapa.
 */
export function restaurarDatosOriginales() {
    const respaldo = appState.respaldoCargaTemporal;
    if (!respaldo) {
        mostrarNotificacioniOS('Sin respaldo', 'No hay una carga temporal activa.', 'warning');
        return;
    }
    appState.rawClientes = copiarDatos(respaldo.clientes);
    appState.rawGeocercas = copiarDatos(respaldo.geocercas);
    appState.rawDistribuidoras = copiarDatos(respaldo.distribuidoras);
    appState.respaldoCargaTemporal = null;

    procesarPropiedadesGeocercas();
    sincronizarGruposClientes();
    poblarFiltrosPermitidos();
    aplicarFiltros();

    ['file-csv-input', 'file-geojson-input', 'file-distribuidoras-input'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('btn-restaurar-datos').style.display = 'none';
    mostrarNotificacioniOS('Datos restaurados', '✅ Se restauraron los datos cargados al iniciar Ruta360.', 'success');
}

/**
 * Muestra en la cabecera la fecha local del dispositivo.
 */
export function actualizarFechaActual() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let fechaTexto = fecha.toLocaleDateString('es-ES', opciones);
    const textFormatted = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);
    document.getElementById('fecha-actual').textContent = fechaTexto;
    document.getElementById('fecha-actual-mobile').textContent = fechaTexto;
}

/**
 * Abre o cierra el panel lateral en la versión móvil.
 */
export function toggleDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const label = document.getElementById('drawer-btn-label');
    drawer.classList.toggle('collapsed');
    label.innerHTML = drawer.classList.contains('collapsed') 
        ? '<i class="fa-solid fa-chevron-up"></i> Mostrar Panel de Control' 
        : '<i class="fa-solid fa-chevron-down"></i> Ocultar';
    setTimeout(() => { if (appState.map) appState.map.invalidateSize(); }, 360);
}

// ============================================================
//  ARRANQUE DE APLICACIÓN Y ASIGNACIÓN DE EVENTOS
// ============================================================
