/**
 * ============================================================
 * UTILS/EVENTLISTENERS.JS - CONFIGURACIÓN DE EVENTOS
 * Maneja eventos de UI como logout, uploads, etc.
 * ============================================================
 */

import { ACTIONS } from '../store/types.js';

export function setupEventListeners(app) {
    // ============================================================
    // LOGOUT
    // ============================================================
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        app.loginHandler?.cerrarSesion();
    });
    document.getElementById('btn-logout-mobile')?.addEventListener('click', () => {
        app.loginHandler?.cerrarSesion();
    });

    // ============================================================
    // MOBILE USER DROPDOWN
    // ============================================================
    document.getElementById('btn-toggle-mobile-user')?.addEventListener('click', () => {
        document.getElementById('mobile-user-dropdown').classList.toggle('active');
    });

    // ============================================================
    // DRAWER TOGGLE
    // ============================================================
    document.getElementById('drawer-handle')?.addEventListener('click', () => {
        app.filterControls?.toggleDrawer();
    });

    // ============================================================
    // FILE UPLOADS (ADMIN)
    // ============================================================
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

    // ============================================================
    // BOTÓN DE OPTIMIZACIÓN
    // ============================================================
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

    // ============================================================
    // DESCARGAR OPTIMIZACIÓN
    // ============================================================
    document.getElementById('btn-descargar-optimizacion')?.addEventListener('click', () => {
        const state = app.store.getState();
        const route = state.optimizedRoute;
        if (!route || !route.clientes || route.clientes.length === 0) {
            alert('Primero debe optimizar la ruta');
            return;
        }

        const data = route.clientes.map((c, idx) => ({
            'Orden': idx + 1,
            'Día': route.resultadosPorDia?.find(d => d.clientes.includes(c))?.dia || '',
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
    });

    // ============================================================
    // GOOGLE MAPS REDIRECT
    // ============================================================
    document.getElementById('btn-gmaps-redirect')?.addEventListener('click', () => {
        const state = app.store.getState();
        const route = state.optimizedRoute;
        if (!route || !route.clientes || route.clientes.length === 0) return;

        const first = route.clientes[0];
        const last = route.clientes[route.clientes.length - 1];
        
        let origin = `${first.lat},${first.lng}`;
        let destination = `${last.lat},${last.lng}`;
        let waypoints = [];
        
        if (route.clientes.length > 2) {
            for (let i = 1; i < route.clientes.length - 1; i++) {
                const c = route.clientes[i];
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
    });

    // ============================================================
    // SIMULACIÓN DE RUTA
    // ============================================================
    let simInterval = null;
    let simStep = 0;
    let simPlaying = false;

    document.getElementById('btn-sim-play-pause')?.addEventListener('click', () => {
        // Implementación pendiente para simulación
        console.log('Simulación - pendiente de implementación');
    });
}
