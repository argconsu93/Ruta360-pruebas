import { ACTIONS } from '../store/types.js';

export function setupEventListeners(app) {
    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        app.loginHandler?.cerrarSesion();
    });
    document.getElementById('btn-logout-mobile')?.addEventListener('click', () => {
        app.loginHandler?.cerrarSesion();
    });

    // Mobile user dropdown
    document.getElementById('btn-toggle-mobile-user')?.addEventListener('click', () => {
        document.getElementById('mobile-user-dropdown').classList.toggle('active');
    });

    // Drawer toggle
    document.getElementById('drawer-handle')?.addEventListener('click', () => {
        app.filterControls?.toggleDrawer();
    });

    // File uploads (Admin)
    document.getElementById('file-csv-input')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            app.dataLoader?.subirNuevoCSV(e.target.files[0]);
        }
    });
    document.getElementById('file-geojson-input')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            app.dataLoader?.subirNuevoGeoJSON(e.target.files[0]);
        }
    });
    document.getElementById('file-distribuidoras-input')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            app.dataLoader?.subirNuevoGeoJSONDistribuidoras(e.target.files[0]);
        }
    });

    // Botón de optimización
    document.getElementById('btn-trazar-ruta')?.addEventListener('click', async () => {
        const state = app.store.getState();
        const { filters } = state;
        const rutaSeleccionada = filters.routes[0] || '';
        const diaSeleccionado = filters.day || 'TODOS';
        const minutosPorParada = parseInt(document.getElementById('input-tiempo-parada').value) || 10;
        const horaSalida = document.getElementById('input-hora-salida').value || '08:00';

        if (!rutaSeleccionada) {
            alert('Seleccione una ruta específica');
            return;
        }

        const resultado = await app.routingEngine?.optimizarRuta(state.filteredClients, {
            rutaSeleccionada,
            diaSeleccionado,
            minutosPorParada,
            horaSalida,
            velocidadBase: 40
        });

        if (resultado) {
            app.store.dispatch({
                type: ACTIONS.SET_OPTIMIZED_ROUTE,
                payload: resultado
            });
        }
    });

    // Descargar optimización
    document.getElementById('btn-descargar-optimizacion')?.addEventListener('click', () => {
        const state = app.store.getState();
        const route = state.optimizedRoute;
        if (!route) {
            alert('Primero debe optimizar la ruta');
            return;
        }
        // Implementar descarga de Excel con los datos de la ruta
        descargarRutaOptimizada(route);
    });

    // Google Maps redirect
    document.getElementById('btn-gmaps-redirect')?.addEventListener('click', () => {
        const state = app.store.getState();
        const route = state.optimizedRoute;
        if (!route) return;
        abrirRutaEnGoogleMaps(route);
    });
}

function descargarRutaOptimizada(routeData) {
    if (!routeData || !routeData.clientes || routeData.clientes.length === 0) {
        alert('No hay datos de ruta para descargar');
        return;
    }

    const data = routeData.clientes.map((c, idx) => ({
        'Orden': idx + 1,
        'Día': routeData.resultadosPorDia.find(d => d.clientes.includes(c))?.dia || '',
        'Ruta': c.ruta,
        'Grupo': c.grupo,
        'Código': c.codigo,
        'Cliente': c.nombre,
        'Teléfono': c.telefono,
        'Dirección': c.direccion,
        'Latitud': c.lat,
        'Longitud': c.lng
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ruta Optimizada');
    XLSX.writeFile(wb, `Ruta_Optimizada_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function abrirRutaEnGoogleMaps(routeData) {
    if (!routeData || !routeData.clientes || routeData.clientes.length === 0) return;

    const first = routeData.clientes[0];
    const last = routeData.clientes[routeData.clientes.length - 1];
    
    let origin = `${first.lat},${first.lng}`;
    let destination = `${last.lat},${last.lng}`;
    let waypoints = [];
    
    if (routeData.clientes.length > 2) {
        for (let i = 1; i < routeData.clientes.length - 1; i++) {
            const c = routeData.clientes[i];
            if (c.lat && c.lng) {
                waypoints.push(`${c.lat},${c.lng}`);
            }
        }
    }

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints.length > 0) {
        url += `&waypoints=${waypoints.join('|')}`;
    }
    url += `&travelmode=driving`;

    window.open(url, '_blank');
}
