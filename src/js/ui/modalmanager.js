import { ACTIONS } from '../store/types.js';

export class ModalManager {
    constructor(store) {
        this.store = store;
        this.currentClient = null;
        this.tempGps = { lat: null, lng: null };
        this.modalData = {};
    }

    init() {
        // Configurar evento de guardar
        document.getElementById('btn-guardar-visita')?.addEventListener('click', this.solicitarConfirmacionGuardar.bind(this));
        
        // Configurar radio buttons
        document.querySelectorAll('input[name="radio-visita"]').forEach(radio => {
            radio.addEventListener('change', () => this.gestionarCambioTipoVisita(radio.value));
        });

        // Configurar botón de cerrar comparativo
        document.getElementById('btn-cerrar-comparativo')?.addEventListener('click', () => {
            document.getElementById('modal-comparativo').style.display = 'none';
        });

        // Configurar notificaciones
        document.getElementById('btn-close-ios-notif')?.addEventListener('click', this.cerrarNotificacion.bind(this));
        document.getElementById('btn-open-notifications')?.addEventListener('click', this.reabrirUltimaNotificacion.bind(this));

        // Exponer método para abrir modal de visita
        window.ui.abrirModalVisitaCliente = this.abrirModalVisitaCliente.bind(this);
    }

    abrirModalVisitaCliente(codigo) {
        const state = this.store.getState();
        const client = state.clients.find(c => c.codigo === codigo);
        if (!client) return;

        this.currentClient = client;
        this.tempGps = { lat: client.lat, lng: client.lng };
        this.modalData = {};

        // Cargar datos del cliente
        document.getElementById('visit-modal-client-name').textContent = client.nombre;
        document.getElementById('visit-modal-client-code').textContent = client.codigo;
        document.getElementById('visit-modal-client-route').textContent = client.ruta;

        document.getElementById('edit-nombre-tienda').value = client.nombre;
        document.getElementById('edit-dia-visita').value = client.dia;
        document.getElementById('edit-telefono-cliente').value = client.telefono !== 'Sin teléfono' ? client.telefono : '';
        document.getElementById('edit-direccion-cliente').value = client.direccion;
        document.getElementById('txt-coords-actuales-display').textContent = 
            `Lat: ${client.lat ? client.lat.toFixed(5) : '-'}, Lng: ${client.lng ? client.lng.toFixed(5) : '-'}`;

        // Cargar datos previos si existen
        const visitData = state.visitStatus.get(codigo);
        if (visitData) {
            const radios = document.querySelectorAll('input[name="radio-visita"]');
            radios.forEach(r => { if (r.value === visitData.tipoVisita) r.checked = true; });
            this.gestionarCambioTipoVisita(visitData.tipoVisita);

            document.getElementById('input-total-venta').value = visitData.totalVenta || '';
            document.getElementById('txt-observacion-visita').value = visitData.observacion || '';

            const setCheckboxes = (selector, list) => {
                document.querySelectorAll(selector).forEach(chk => {
                    chk.checked = list.includes(chk.value);
                });
            };
            setCheckboxes('.chk-visita-si-motivo', visitData.motivos || []);
            setCheckboxes('.chk-visita-no-motivo', visitData.motivos || []);
            setCheckboxes('.chk-visita-otros-motivo', visitData.motivos || []);
        }

        document.getElementById('modal-registro-visita').style.display = 'flex';
    }

    gestionarCambioTipoVisita(tipo) {
        document.getElementById('box-visita-si').style.display = tipo === 'SI' ? 'flex' : 'none';
        document.getElementById('box-visita-no').style.display = tipo === 'NO' ? 'flex' : 'none';
        document.getElementById('box-visita-otros').style.display = tipo === 'OTROS' ? 'flex' : 'none';
    }

    capturarCoordenadasGPS() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.tempGps = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    document.getElementById('txt-coords-actuales-display').textContent = 
                        `Nuevas GPS -> Lat: ${this.tempGps.lat.toFixed(5)}, Lng: ${this.tempGps.lng.toFixed(5)}`;
                    this.mostrarNotificacion('GPS Capturado', '📍 Coordenadas geográficas obtenidas con éxito.');
                },
                (error) => {
                    this.mostrarNotificacion('Error GPS', `⚠️ Error: ${error.message}`);
                },
                { enableHighAccuracy: true }
            );
        } else {
            this.mostrarNotificacion('GPS No Soportado', '⚠️ Geolocalización no soportada.');
        }
    }

    solicitarConfirmacionGuardar() {
        document.getElementById('modal-confirmar-guardar').style.display = 'flex';
    }

    cerrarModalConfirmacion() {
        document.getElementById('modal-confirmar-guardar').style.display = 'none';
    }

    cerrarModalVisita() {
        document.getElementById('modal-registro-visita').style.display = 'none';
        this.currentClient = null;
    }

    ejecutarGuardadoDefinitivo() {
        if (!this.currentClient) return;

        const cod = this.currentClient.codigo;
        const nomNuevo = document.getElementById('edit-nombre-tienda').value.trim();
        const diaNuevo = document.getElementById('edit-dia-visita').value;
        const telNuevo = document.getElementById('edit-telefono-cliente').value.trim();
        const dirNuevo = document.getElementById('edit-direccion-cliente').value.trim();

        const radioSel = document.querySelector('input[name="radio-visita"]:checked');
        const tipoVisita = radioSel ? radioSel.value : 'NO_DEFINIDO';
        
        let motivos = [];
        if (tipoVisita === 'SI') {
            document.querySelectorAll('.chk-visita-si-motivo:checked').forEach(c => motivos.push(c.value));
        } else if (tipoVisita === 'NO') {
            document.querySelectorAll('.chk-visita-no-motivo:checked').forEach(c => motivos.push(c.value));
        } else if (tipoVisita === 'OTROS') {
            document.querySelectorAll('.chk-visita-otros-motivo:checked').forEach(c => motivos.push(c.value));
        }

        const totalVenta = document.getElementById('input-total-venta').value;
        const observacion = document.getElementById('txt-observacion-visita').value.trim();

        // Actualizar en store
        this.store.dispatch({
            type: ACTIONS.SET_VISIT_STATUS,
            payload: {
                codigo: cod,
                data: {
                    visited: true,
                    tipoVisita: tipoVisita,
                    totalVenta: totalVenta || '0.00',
                    motivos: motivos,
                    observacion: observacion,
                    fechaHora: new Date().toLocaleString()
                }
            }
        });

        // Actualizar datos del cliente en el store
        const state = this.store.getState();
        const clientIndex = state.clients.findIndex(c => c.codigo === cod);
        if (clientIndex !== -1) {
            const updatedClient = { ...state.clients[clientIndex] };
            updatedClient.nombre = nomNuevo || updatedClient.nombre;
            updatedClient.dia = diaNuevo;
            updatedClient.telefono = telNuevo || 'Sin teléfono';
            updatedClient.direccion = dirNuevo || updatedClient.direccion;
            updatedClient.lat = this.tempGps.lat || updatedClient.lat;
            updatedClient.lng = this.tempGps.lng || updatedClient.lng;
            updatedClient._diaNorm = normalizarTexto(updatedClient.dia);
            updatedClient._searchCache = (updatedClient.nombre + ' ' + updatedClient.codigo).toLowerCase();

            // Actualizar en el store (esto requiere una acción específica)
            state.clients[clientIndex] = updatedClient;
            // Forzar re-renderizado
            this.store.aplicarFiltros();
        }

        this.cerrarModalConfirmacion();
        this.cerrarModalVisita();
        this.mostrarNotificacion('Registro Exitoso', `✅ Información del cliente ${cod} guardada correctamente.`);
    }

    mostrarNotificacion(titulo, mensaje) {
        document.getElementById('ios-notif-title').textContent = titulo;
        document.getElementById('ios-notif-body').innerHTML = mensaje;
        document.getElementById('ios-notif-overlay').style.display = 'flex';
        document.getElementById('notif-dot').style.display = 'block';
    }

    cerrarNotificacion() {
        document.getElementById('ios-notif-overlay').style.display = 'none';
    }

    reabrirUltimaNotificacion() {
        document.getElementById('ios-notif-overlay').style.display = 'flex';
    }
}
