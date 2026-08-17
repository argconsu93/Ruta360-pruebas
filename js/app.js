/**
 * ============================================================
 * APP.JS - PUNTO DE ENTRADA PRINCIPAL
 * Orquesta todos los módulos y expone funciones globales
 * ============================================================
 */

import { Store } from './store/index.js';
import { DataLoader } from './services/dataLoader.js';
import { MapView } from './ui/mapView.js';
import { TableViews } from './ui/tableViews.js';
import { FilterControls } from './ui/filterControls.js';
import { ModalManager } from './ui/modalManager.js';
import { LoginHandler } from './ui/loginHandler.js';
import { RoutingEngine } from './services/routingEngine.js';
import { setupEventListeners } from './utils/eventListeners.js';

export class App {
    constructor() {
        // ============================================================
        // 1. INICIALIZAR MÓDULOS
        // ============================================================
        this.store = new Store();
        this.dataLoader = new DataLoader(this.store);
        this.mapView = new MapView(this.store);
        this.tableViews = new TableViews(this.store);
        this.filterControls = new FilterControls(this.store);
        this.modalManager = new ModalManager(this.store);
        this.routingEngine = new RoutingEngine(this.store);
        this.loginHandler = new LoginHandler(this.store, this);
        
        // ============================================================
        // 2. EXPONER FUNCIONES GLOBALES PARA ONCLICK EN HTML
        // ============================================================
        // Login
        this.seleccionarPais = this.loginHandler.seleccionarPais.bind(this.loginHandler);
        this.seleccionarAccesoRegional = this.loginHandler.seleccionarAccesoRegional.bind(this.loginHandler);
        this.volverAPasoPais = this.loginHandler.volverAPasoPais.bind(this.loginHandler);
        this.volverDesdeLogin = this.loginHandler.volverDesdeLogin.bind(this.loginHandler);
        this.togglePasswordVisibility = this.loginHandler.togglePasswordVisibility.bind(this.loginHandler);
        
        // UI
        this.toggleAccordion = this.filterControls.toggleAccordion.bind(this.filterControls);
        this.cerrarModalVisita = this.modalManager.cerrarModalVisita.bind(this.modalManager);
        this.capturarCoordenadasGPS = this.modalManager.capturarCoordenadasGPS.bind(this.modalManager);
        this.cerrarModalConfirmacion = this.modalManager.cerrarModalConfirmacion.bind(this.modalManager);
        this.ejecutarGuardadoDefinitivo = this.modalManager.ejecutarGuardadoDefinitivo.bind(this.modalManager);
        this.abrirModalVisitaCliente = this.modalManager.abrirModalVisitaCliente.bind(this.modalManager);
        
        // Exponer todo en window.APP
        window.APP = this;
        
        // ============================================================
        // 3. CONFIGURAR EVENTOS Y ARRANCAR
        // ============================================================
        setupEventListeners(this);
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Iniciando Ruta360...');
            
            // Cargar datos iniciales
            await this.dataLoader.cargarDatosIniciales();
            console.log('✅ Datos cargados correctamente');
            
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
