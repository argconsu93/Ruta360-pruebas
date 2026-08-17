/**
 * ============================================================
 * SERVICES/DATALOADER.JS - CARGA DE DATOS
 * Maneja la carga de CSV, GeoJSON y usuarios
 * ============================================================
 */

import { ACTIONS } from '../store/types.js';
import { 
    parsearFilasClientes, 
    procesarPropiedadesGeocercas, 
    sincronizarGruposClientes,
    MAPEO_RUTAS_GRUPOS 
} from '../utils/helpers.js';
import Papa from 'papaparse';

export class DataLoader {
    constructor(store) {
        this.store = store;
        this.USUARIOS_ROLES = [];
    }

    getAntiCacheUrl(url) {
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + 'v=' + new Date().getTime();
    }

    async cargarDatosIniciales() {
        try {
            console.log('📂 Cargando datos...');
            
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
            console.error('❌ Error cargando datos:', error);
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
            console.warn(`⚠️ No se pudo cargar ${url}:`, error);
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
                        this.USUARIOS_ROLES = results.data.map(u => ({
                            nombre: (u.Nombres || u.nombre || '').trim(),
                            rol: (u.Roles || u.rol || 'Supervisor').trim(),
                            pais: (u.Pais || u.pais || 'TODOS').trim(),
                            division: (u.Division || u.division || 'TODOS').trim(),
                            grupo: (u.Grupo || u.grupo || 'TODOS').trim(),
                            pass: (u.Contraseña || u.pass || 'BOCADELI').trim()
                        }));
                        
                        // Exponer usuarios globalmente para el login
                        window.USUARIOS_ROLES = this.USUARIOS_ROLES;
                    }
                }
            });
        } catch (error) {
            console.warn('⚠️ Usando lista fallback de usuarios:', error);
            // Fallback con usuarios por defecto
            this.USUARIOS_ROLES = [
                { nombre: "JORGE LUIS PINEDA", rol: "Supervisor", pais: "El Salvador", division: "SV Centro", grupo: "GRUPO 01", pass: "G01" },
                { nombre: "NOE HERNANDEZ", rol: "Jefatura", pais: "El Salvador", division: "SV Centro", grupo: "TODOS", pass: "BOCADELI" },
                { nombre: "ISRAEL CONSUEGRA", rol: "Administrador", pais: "TODOS", division: "TODOS", grupo: "TODOS", pass: "SVCENTRO" }
            ];
            window.USUARIOS_ROLES = this.USUARIOS_ROLES;
        }
    }

    // ============================================================
    // MÉTODOS PARA CARGA MANUAL (ADMIN)
    // ============================================================
    
    subirNuevoCSV(file) {
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const clientes = parsearFilasClientes(results.data);
                this.store.dispatch({ type: ACTIONS.LOAD_CLIENTS, payload: clientes });
                this.store.aplicarFiltros();
                this.mostrarNotificacion('Carga Exitosa', '✅ CSV cargado correctamente.');
            }
        });
    }

    subirNuevoGeoJSON(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const geocercas = JSON.parse(e.target.result);
                procesarPropiedadesGeocercas(geocercas);
                this.store.dispatch({ type: ACTIONS.LOAD_GEOFENCES, payload: geocercas });
                this.store.aplicarFiltros();
                this.mostrarNotificacion('Geocercas Cargadas', '✅ GeoJSON cargado correctamente.');
            } catch(err) { 
                console.error('❌ Error al procesar GeoJSON:', err);
                alert('Error al procesar el archivo GeoJSON');
            }
        };
        reader.readAsText(file);
    }

    subirNuevoGeoJSONDistribuidoras(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const distribuidoras = JSON.parse(e.target.result);
                this.store.dispatch({ type: ACTIONS.LOAD_DISTRIBUTORS, payload: distribuidoras });
                this.store.aplicarFiltros();
                this.mostrarNotificacion('Distribuidoras Cargadas', '✅ GeoJSON de distribuidoras cargado correctamente.');
            } catch(err) { 
                console.error('❌ Error al procesar GeoJSON:', err);
                alert('Error al procesar el archivo GeoJSON');
            }
        };
        reader.readAsText(file);
    }

    mostrarNotificacion(titulo, mensaje) {
        document.getElementById('ios-notif-title').textContent = titulo;
        document.getElementById('ios-notif-body').innerHTML = mensaje;
        document.getElementById('ios-notif-overlay').style.display = 'flex';
        document.getElementById('notif-dot').style.display = 'block';
    }
}
