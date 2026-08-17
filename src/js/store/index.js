import { ACTIONS } from './types.js';
import { applyFilters, getFilteredClients, getFilteredGeofences } from './actions.js';

export class Store {
    constructor() {
        this.state = {
            clients: [],
            geofences: { type: 'FeatureCollection', features: [] },
            distributors: { type: 'FeatureCollection', features: [] },
            visitStatus: new Map(), // { codigo: { visited, details } }
            filters: {
                countries: [],
                divisions: [],
                groups: [],
                routes: [],
                day: 'TODOS',
                searchText: ''
            },
            ui: {
                isSatellite: false,
                activeSwitches: {
                    masivos: false,
                    especificos: false,
                    tipoZona: false
                }
            },
            user: null,
            optimizedRoute: null,
            filteredClients: [],
            filteredGeofences: [],
            outsideClients: []
        };
        
        this.listeners = [];
    }

    // Suscribir componente a cambios
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notificar cambios a todos los suscriptores
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Obtener estado (copia inmutable)
    getState() {
        return { ...this.state };
    }

    // Disparar acción
    dispatch(action) {
        switch (action.type) {
            case ACTIONS.LOAD_CLIENTS:
                this.state.clients = action.payload;
                this.state.filteredClients = applyFilters(this.state);
                this.notify();
                break;
                
            case ACTIONS.LOAD_GEOFENCES:
                this.state.geofences = action.payload;
                this.state.filteredGeofences = getFilteredGeofences(this.state);
                this.notify();
                break;
                
            case ACTIONS.LOAD_DISTRIBUTORS:
                this.state.distributors = action.payload;
                this.notify();
                break;
                
            case ACTIONS.UPDATE_FILTERS:
                this.state.filters = { ...this.state.filters, ...action.payload };
                this.state.filteredClients = applyFilters(this.state);
                this.state.filteredGeofences = getFilteredGeofences(this.state);
                this.state.outsideClients = this.state.filteredClients.filter(c => 
                    !this.isInsideGeofence(c.lat, c.lng)
                );
                this.notify();
                break;
                
            case ACTIONS.UPDATE_SWITCH:
                this.state.ui.activeSwitches = { ...this.state.ui.activeSwitches, ...action.payload };
                this.state.filteredClients = applyFilters(this.state);
                this.state.filteredGeofences = getFilteredGeofences(this.state);
                this.notify();
                break;
                
            case ACTIONS.SET_USER:
                this.state.user = action.payload;
                this.notify();
                break;
                
            case ACTIONS.SET_VISIT_STATUS:
                this.state.visitStatus.set(action.payload.codigo, action.payload.data);
                this.state.filteredClients = applyFilters(this.state);
                this.notify();
                break;
                
            case ACTIONS.SET_OPTIMIZED_ROUTE:
                this.state.optimizedRoute = action.payload;
                this.notify();
                break;
                
            case ACTIONS.CLEAR_OPTIMIZED_ROUTE:
                this.state.optimizedRoute = null;
                this.notify();
                break;
                
            default:
                console.warn('Acción desconocida:', action.type);
        }
    }

    // Método auxiliar para verificar geocerca (será implementado por geocoding service)
    isInsideGeofence(lat, lng) {
        // Placeholder - se implementa en servicio externo
        return true;
    }

    // Método para aplicar filtros desde cualquier lugar
    aplicarFiltros() {
        this.state.filteredClients = applyFilters(this.state);
        this.state.filteredGeofences = getFilteredGeofences(this.state);
        this.state.outsideClients = this.state.filteredClients.filter(c => 
            !this.isInsideGeofence(c.lat, c.lng)
        );
        this.notify();
    }
}
