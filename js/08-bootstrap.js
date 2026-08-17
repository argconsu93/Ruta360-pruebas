document.addEventListener('DOMContentLoaded', function() {
    const chkMasivos = document.getElementById('switch-canales-masivos');
    const chkEspecificos = document.getElementById('switch-canales-especificos');
    const chkTipoZona = document.getElementById('switch-tipo-zona');

    if (chkMasivos) {
        chkMasivos.addEventListener('change', function() {
            swMasivos = this.checked;
            if (swMasivos) {
                swEspecificos = false;
                swTipoZona = false;
                if (chkEspecificos) chkEspecificos.checked = false;
                if (chkTipoZona) chkTipoZona.checked = false;
            }
            aplicarFiltros();
        });
    }

    if (chkEspecificos) {
        chkEspecificos.addEventListener('change', function() {
            swEspecificos = this.checked;
            if (swEspecificos) {
                swMasivos = false;
                swTipoZona = false;
                if (chkMasivos) chkMasivos.checked = false;
                if (chkTipoZona) chkTipoZona.checked = false;
            }
            aplicarFiltros();
        });
    }

    if (chkTipoZona) {
        chkTipoZona.addEventListener('change', function() {
            swTipoZona = this.checked;
            if (swTipoZona) {
                swMasivos = false;
                swEspecificos = false;
                if (chkMasivos) chkMasivos.checked = false;
                if (chkEspecificos) chkEspecificos.checked = false;
            }
            aplicarFiltros();
        });
    }

    actualizarFechaActual();

    document.getElementById('btn-login').addEventListener('click', validarLogin);
    document.getElementById('input-password').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') validarLogin();
    });
    document.getElementById('btn-logout').addEventListener('click', cerrarSesion);
    document.getElementById('btn-logout-mobile').addEventListener('click', cerrarSesion);
    document.getElementById('btn-toggle-mobile-user').addEventListener('click', toggleMobileUserDropdown);

    document.getElementById('select-pais').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (!paisesSeleccionadosMultiples.includes(val)) paisesSeleccionadosMultiples.push(val);
            renderizarChipsPaises();
            actualizarOpcionesDivision();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.getElementById('select-division').addEventListener('change', function() {
        const val = this.value;
        if (val && val !== 'TODOS') {
            if (!divisionesSeleccionadasMultiples.includes(val)) divisionesSeleccionadasMultiples.push(val);
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
                if (!gruposSeleccionadosMultiples.includes(val)) gruposSeleccionadosMultiples.push(val);
            } else {
                gruposSeleccionadosMultiples = [val];
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
            if (!rutasSeleccionadasMultiples.includes(val)) rutasSeleccionadasMultiples.push(val);
            renderizarChipsRutas();
            aplicarFiltros();
        }
        this.value = "TODOS";
    });

    document.querySelectorAll('.btn-day').forEach(btn => {
        btn.addEventListener('click', function() {
            const dia = this.getAttribute('data-dia');
            if (diaSeleccionado === dia) {
                diaSeleccionado = 'NINGUNO';
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
            } else {
                diaSeleccionado = dia;
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
        console.warn('Error durante la inicialización:', err);
    });
});
