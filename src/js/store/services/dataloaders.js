import { ACTIONS } from '../store/types.js';
import { parsearFilasClientes, procesarPropiedadesGeocercas, sincronizarGruposClientes, MAPEO_RUTAS_GRUPOS } from '../utils/helpers.js';
import Papa from 'papaparse';

export class DataLoader {
    constructor(store) {
        this.store = store;
    }

    getAntiCacheUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + 'v=' + new Date().getTime();
    }

    async cargarDatosIniciales() {
        try {
            const [clientes, geocercas, distribuidoras] = await Promise.all([
                this.cargarClientes(),
                this.cargarGeoJSON('data/geocercas_rutas.geojson'),
                this.cargarGeoJSON('data/geocercas_distribuidoras.geojson')
            ]);

            // Procesar geocercas
            procesarPropiedadesGeocercas(geocercas);
            sincronizarGruposClientes(clientes, geocercas, MAPEO_RUTAS_GRUPOS);

            // Cargar en el store
            this.store.dispatch({ type: ACTIONS.LOAD_CLIENTS, payload: clientes });
            this.store.dispatch({ type: ACTIONS.LOAD_GEOFENCES, payload: geocercas });
            this.store.dispatch({ type: ACTIONS.LOAD_DISTRIBUTORS, payload: distribuidoras });

            // Cargar usuarios (sin bloquear)
            await this.cargarUsuarios();

            return { clientes, geocercas, distribuidoras };
        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    }

    async cargarClientes() {
        const response = await fetch(this.getAntiCacheUrl('clientes.csv'));
        if (!response.ok) throw new Error('No se pudo cargar clientes.csv');
        
        const csvText = await response.text();
        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(parsearFilasClientes(results.data))
            });
        });
    }

    async cargarGeoJSON(url) {
        try {
            const response = await fetch(this.getAntiCacheUrl(url));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`No se pudo cargar ${url}:`, error);
            return { type: 'FeatureCollection', features: [] };
        }
    }

    async cargarUsuarios() {
        try {
            const response = await fetch(this.getAntiCacheUrl('data/usuarios.csv'));
            if (!response.ok) throw new Error('No se pudo cargar usuarios.csv');
            
            const csvText = await response.text();
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        window.USUARIOS_ROLES = results.data.map(u => ({
                            nombre: (u.Nombres || u.nombre || '').trim(),
                            rol: (u.Roles || u.rol || 'Supervisor').trim(),
                            pais: (u.Pais || u.pais || 'TODOS').trim(),
                            division: (u.Division || u.division || 'TODOS').trim(),
                            grupo: (u.Grupo || u.grupo || 'TODOS').trim(),
                            pass: (u.Contraseña || u.pass || 'BOCADELI').trim()
                        }));
                    }
                }
            });
        } catch (error) {
            console.warn('Usando lista fallback de usuarios:', error);
        }
    }
}
