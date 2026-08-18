document.addEventListener('DOMContentLoaded', function() {
    const chkMasivos = document.getElementById('switch-canales-masivos');
    const chkEspecificos = document.getElementById('switch-canales-especificos');
    const chkTipoZona = document.getElementById('switch-tipo-zona');

    if (chkMasivos) {
        chkMasivos.addEventListener('change', function() {
            appState.swMasivos = this.checked;
            if (appState.swMasivos) {
                appState.swEspecificos = false;
                appState.swTipoZona = false;
                if (chkEspecificos) chkEspecificos.checked = false;
                if (chkTipoZona) chkTipoZona.checked = false;
            }
            aplicarFiltros();
        });
    }

    if (chkEspecificos) {
        chkEspecificos.addEventListener('change', function() {
            appState.swEspecificos = this.checked;
            if (appState.swEspecificos) {
                appState.swMasivos = false;
                appState.swTipoZona = false;
                if (chkMasivos) chkMasivos.checked = false;
                if (chkTipoZona) chkTipoZona.checked = false;
            }
            aplicarFiltros();
        });
    }

    if (chkTipoZona) {
        chkTipoZona.addEventListener('change', function() {
            appState.swTipoZona = this.checked;
            if (appState.swTipoZona) {
                appState.swMasivos = false;
                appState.swEspecificos = false;
                if (chkMasivos) chkMasivos.checked = false;
                if (chkEspecificos) chkEspecificos.checked = false;
            }
            aplicarFiltros();
        });
    }

    actualizarFechaActual();

    document.addEventListener('click', function(event) {
        const countryCard = event.target.closest('[data-country-code]');
        if (countryCard) {
            seleccionarPais(countryCard.dataset.countryCode, countryCard.dataset.countryName);
            return;
        }

        const accordion = event.target.closest('[data-accordion-target]');
        if (accordion) {
            toggleAccordion(accordion.dataset.accordionTarget);
            return;
        }

        const actionElement = event.target.closest('[data-action]');
        if (!actionElement) return;

        const actions = {
            'regional-access': seleccionarAccesoRegional,
            'back-country': volverAPasoPais,
            'back-login': volverDesdeLogin,
            'close-visit': cerrarModalVisita,
            'capture-gps': capturarCoordenadasGPS,
            'request-save-visit': solicitarConfirmacionGuardar,
            'close-confirmation': cerrarModalConfirmacion,
            'confirm-save-visit': ejecutarGuardadoDefinitivo,
        };

        if (actionElement.dataset.action === 'select-client') {
            seleccionarClienteEnMapa(actionElement.dataset.clientCode);
        } else if (actionElement.dataset.action === 'open-visit') {
            abrirModalVisitaCliente(actionElement.dataset.clientCode);
        } else if (actions[actionElement.dataset.action]) {
            actions[actionElement.dataset.action]();
        }
    });

    document.getElementById('btn-login').addEventListener('click', validarLogin);
    document.getElementById('toggle-password-btn').addEventListener('click', toggleMostrarPassword);
    document.getElementById('input-password').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') validarLogin();
    });
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
    document.getElementById('btn-logout-mobile').addEventListener('click', cerrarSesion);
    document.getElementById('btn-toggle-mobile-user').addEventListener('click', toggleMobileUserDropdown);
    document.getElementById('btn-sim-play-pause').addEventListener('click', toggleSimulacionRecorrido);
    document.getElementById('btn-gmaps-redirect').addEventListener('click', abrirRutaEnGoogleMaps);
    document.getElementById('sim-range-progress').addEventListener('input', function() {
        cambiarPasoSimulacion(this.value);
    });
    document.getElementById('input-total-venta').addEventListener('blur', function() {
        formatearDecimalesVenta(this);
    });
    document.querySelectorAll('input[name="radio-visita"]').forEach(input => {
        input.addEventListener('change', function() {
            gestionarCambioTipoVisita(this.value);
        });
    });
    ['edit-dia-visita', 'edit-nombre-tienda', 'edit-telefono-cliente', 'edit-direccion-cliente'].forEach(id => {
        const element = document.getElementById(id);
        const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
        element.addEventListener(eventName, evaluarCambioDataCliente);
    });

    document.getElementById('select-pais').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (!appState.paisesSeleccionadosMultiples.includes(val)) appState.paisesSeleccionadosMultiples.push(val);
            renderizarChipsPaises();
            actualizarOpcionesDivision();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.getElementById('select-division').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (!appState.divisionesSeleccionadasMultiples.includes(val)) appState.divisionesSeleccionadasMultiples.push(val);
            renderizarChipsDivisiones();
            actualizarOpcionesGrupo();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.getElementById('select-grupo').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (esRolAvanzado()) {
                if (!appState.gruposSeleccionadosMultiples.includes(val)) appState.gruposSeleccionadosMultiples.push(val);
            } else {
                appState.gruposSeleccionadosMultiples = [val];
            }
            renderizarChipsGrupos();
            actualizarOpcionesRuta();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.getElementById('select-ruta').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (!appState.rutasSeleccionadasMultiples.includes(val)) appState.rutasSeleccionadasMultiples.push(val);
            renderizarChipsRutas();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.querySelectorAll('.btn-day').forEach(btn => {
        btn.addEventListener('click', function() {
            const dia = this.getAttribute('data-dia');
            if (appState.diaSeleccionado === dia) {
                appState.diaSeleccionado = 'NINGUNO';
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
            } else {
                appState.diaSeleccionado = dia;
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
            aplicarFiltros();
        });
    });

    document.getElementById('input-search-cliente').addEventListener('input', filtrarTablaPorTexto);
    document.getElementById('btn-trazar-ruta').addEventListener('click', trazarRutaOptima);
    document.getElementById('btn-descargar-optimizacion').addEventListener('click', descargarOptimizacionRuta);
    document.getElementById('btn-abrir-comparativo').addEventListener('click', abrirModalComparativo);
    document.getElementById('btn-cerrar-comparativo').addEventListener('click', cerrarModalComparativo);

    document.getElementById('btn-close-ios-notif').addEventListener('click', cerrarNotificacioniOS);
    document.getElementById('btn-open-notifications').addEventListener('click', reabrirUltimaNotificacion);

    document.getElementById('drawer-handle').addEventListener('click', toggleDrawer);

    document.getElementById('btn-download-visited').addEventListener('click', descargarClientesVisitados);
    document.getElementById('btn-download-itinerary').addEventListener('click', descargarItinerarioFiltrado);
    document.getElementById('btn-download-fuera').addEventListener('click', descargarClientesFueraGeocerca);

    document.getElementById('file-csv-input').addEventListener('change', function(e) {
        if (this.files[0]) subirNuevoCSV(this.files[0]);
    });
    document.getElementById('file-geojson-input').addEventListener('change', function(e) {
        if (this.files[0]) subirNuevoGeoJSON(this.files[0]);
    });
    document.getElementById('file-distribuidoras-input').addEventListener('change', function(e) {
        if (this.files[0]) subirNuevoGeoJSONDistribuidoras(this.files[0]);
    });

    cargarDatosIniciales().then(() => {
        console.log('Datos de sistema e itinerarios cargados correctamente.');
    }).catch(err => {
        console.error('Error durante la inicialización:', err);
        mostrarNotificacioniOS(
            'Datos no disponibles',
            'No fue posible cargar los clientes. Revise la conexión y recargue la página.',
            'warning'
        );
    });
});
