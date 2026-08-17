import { Store } from './store/index.js';
import { DataLoader } from './services/dataLoader.js';
import { MapView } from './ui/mapView.js';
import { TableViews } from './ui/tableViews.js';
import { FilterControls } from './ui/filterControls.js';
import { ModalManager } from './ui/modalManager.js';
import { LoginHandler } from './ui/loginHandler.js';
import { RoutingEngine } from './services/routingEngine.js';
import { COLORS, DIVISIONS } from './utils/constants.js';
import { setupEventListeners } from './utils/eventListeners.js';

class App {
    constructor() {
        this.store = new Store();
        this.dataLoader = new DataLoader(this.store);
        this.mapView = new MapView(this.store);
        this.tableViews = new TableViews(this.store);
        this.filterControls = new FilterControls(this.store);
        this.modalManager = new ModalManager(this.store);
        this.routingEngine = new RoutingEngine(this.store);
        this.loginHandler = new LoginHandler(this.store);
        
        // Exponer funciones globales para onclick en HTML
        window.ui = {
            toggleAccordion: this.filterControls.toggleAccordion.bind(this.filterControls),
            cerrarModalVisita: this.modalManager.cerrarModalVisita.bind(this.modalManager),
            capturarCoordenadasGPS: this.modalManager.capturarCoordenadasGPS.bind(this.modalManager),
            cerrarModalConfirmacion: this.modalManager.cerrarModalConfirmacion.bind(this.modalManager),
            ejecutarGuardadoDefinitivo: this.modalManager.ejecutarGuardadoDefinitivo.bind(this.modalManager)
        };
        
        window.loginHandler = this.loginHandler;
        
        setupEventListeners(this);
        this.init();
    }

    async init() {
        try {
            // Cargar datos iniciales
            await this.dataLoader.cargarDatosIniciales();
            
            // Inicializar UI
            this.filterControls.init();
            this.mapView.init();
            this.tableViews.init();
            this.modalManager.init();
            
            // Aplicar filtros iniciales
            this.store.aplicarFiltros();
            
            console.log('✅ Ruta360 inicializado correctamente');
        } catch (error) {
            console.error('❌ Error en inicialización:', error);
            alert('Error al cargar los datos. Por favor, recargue la página.');
        }
    }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
