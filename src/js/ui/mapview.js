import { GeocodingService } from '../services/geocoding.js';
import { COLORS, COLORES_DIAS } from '../utils/constants.js';
import { obtenerColorPorPais, obtenerColorPorCanal, obtenerColorPorTipoZona } from '../utils/helpers.js';
import L from 'leaflet';
import 'leaflet.markercluster';

export class MapView {
    constructor(store) {
        this.store = store;
        this.geocoding = new GeocodingService();
        this.map = null;
        this.clusterMarkers = null;
        this.geocercasLayer = null;
        this.distribuidorasLayer = null;
        this.rutaOptimaLayer = null;
        this.clientMarkers = new Map();
        this.isSatellite = false;
        
        // Suscribirse a cambios en el store
        this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
    }

    init() {
        this.inicializarMapa();
        this.setupLayerControls();
    }

    inicializarMapa() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        const googleRoad = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        });

        this.map = L.map('map', {
            center: [13.6929, -89.2182],
            zoom: 11,
            layers: [googleRoad],
            preferCanvas: true
        });

        const baseMaps = {
            "Google Maps": googleRoad,
            "Google Satélite": googleSat,
            "OpenStreetMap": osmLayer
        };

        L.control.layers(baseMaps).addTo(this.map);

        this.map.on('baselayerchange', (e) => {
            this.isSatellite = e.name.toLowerCase().includes('satélite') || e.name.toLowerCase().includes('satellite');
            this.renderizarMapa();
        });

        this.clusterMarkers = L.markerClusterGroup({
            maxClusterRadius: 0,
            disableClusteringAtZoom: 1,
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: false,
            chunkedLoading: true,
            chunkInterval: 50,
            chunkDelay: 10
        }).addTo(this.map);

        this.geocercasLayer = L.layerGroup().addTo(this.map);
        this.distribuidorasLayer = L.layerGroup().addTo(this.map);
        this.rutaOptimaLayer = L.layerGroup().addTo(this.map);

        // Actualizar geocoding con las geocercas actuales
        const state = this.store.getState();
        this.geocoding.setGeofences(state.filteredGeofences);
    }

    setupLayerControls() {
        // Se configurarán desde filterControls
    }

    onStateChange(state) {
        this.geocoding.setGeofences(state.filteredGeofences);
        this.renderizarMapa();
        this.renderizarRutaOptima(state.optimizedRoute);
    }

    renderizarMapa() {
        const state = this.store.getState();
        const { filteredClients, filteredGeofences, distributors, visitStatus, ui } = state;
        
        this.renderizarGeocercas(filteredGeofences);
        this.renderizarDistribuidoras(distributors);
        this.renderizarMarcadores(filteredClients, visitStatus, ui.activeSwitches);
        
        this.actualizarLeyenda(ui.activeSwitches);
    }

    renderizarGeocercas(features) {
        this.geocercasLayer.clearLayers();
        
        if (!features || features.length === 0) return;

        const geoJsonLayer = L.geoJSON(
            { type: 'FeatureCollection', features: features },
            {
                style: this.getGeofenceStyle.bind(this),
                onEachFeature: (feature, layer) => {
                    const props = feature.properties || {};
                    layer.bindPopup(`
                        <div style="font-family:'Inter',sans-serif; padding:6px; min-width:170px;">
                            <b style="color:#1e3a8a; font-size:0.95rem; display:block; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px;">
                                <i class="fa-solid fa-draw-polygon"></i> Cobertura Geocerca
                            </b>
                            <div style="font-size:0.85rem; line-height:1.4;">
                                <b>País:</b> ${props.pais_clean || 'N/D'}<br>
                                <b>División:</b> ${props.division_clean || 'N/D'}<br>
                                <b>Grupo:</b> ${props.grupo_clean || 'Sin Grupo'}<br>
                                <b>Ruta:</b> ${props.ruta_clean || 'N/A'}<br>
                                <b>Canal:</b> ${props.CANAL || props.Canal || 'N/D'}<br>
                                <b>Tipo Zona:</b> ${props.TIPO_ZONA || props.Tipo_Zona || 'N/D'}
                            </div>
                        </div>
                    `);
                }
            }
        ).addTo(this.geocercasLayer);
    }

    getGeofenceStyle(feature) {
        const props = feature.properties || {};
        const state = this.store.getState();
        const { activeSwitches } = state.ui;
        
        let color = '#0369a1';
        
        if (activeSwitches.masivos || activeSwitches.especificos) {
            const canal = (props.CANAL || props.Canal || '').toUpperCase();
            color = obtenerColorPorCanal(canal);
        } else if (activeSwitches.tipoZona) {
            const tipoZona = (props.TIPO_ZONA || props.Tipo_Zona || '').toUpperCase();
            color = obtenerColorPorTipoZona(tipoZona);
        } else {
            color = obtenerColorPorPais(props.pais_clean || '');
        }

        if (this.isSatellite) {
            return { color: '#38bdf8', weight: 2.5, fillColor: '#38bdf8', fillOpacity: 0.2 };
        }

        return { color, weight: 2, fillColor: color, fillOpacity: 0.22 };
    }

    renderizarDistribuidoras(distributors) {
        this.distribuidorasLayer.clearLayers();
        
        if (!distributors || !distributors.features || distributors.features.length === 0) return;

        L.geoJSON(distributors, {
            style: { 
                color: this.isSatellite ? '#f43f5e' : '#b91c1c', 
                weight: 2.5, 
                fillColor: '#b91c1c', 
                fillOpacity: 0.2 
            },
            onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const nombre = props.Ruta || props.ruta || props.DISTRIBUIDORA || props.distribuidora || 'Distribuidora Bocadeli';
                layer.bindPopup(`
                    <div style="font-family:'Inter',sans-serif; padding:4px;">
                        <b style="color:#0b1e42; font-size:0.9rem;"><i class="fa-solid fa-building"></i> ${nombre}</b>
                    </div>
                `);
            }
        }).addTo(this.distribuidorasLayer);
    }

    renderizarMarcadores(clientes, visitStatus, switches) {
        this.clusterMarkers.clearLayers();
        this.clientMarkers.clear();

        const { masivos, especificos } = switches;
        const markers = [];
        const spatialGrid = {};

        clientes.forEach(c => {
            if (c.lat === null || c.lng === null || isNaN(c.lat) || isNaN(c.lng)) return;

            const isVisited = visitStatus.get(c.codigo)?.visited || false;
            
            // Offset para evitar superposición
            const gridLat = Math.round(c.lat / 0.000072);
            const gridLng = Math.round(c.lng / 0.000072);
            const gridKey = `${gridLat}_${gridLng}`;
            spatialGrid[gridKey] = (spatialGrid[gridKey] || 0) + 1;
            const count = spatialGrid[gridKey];

            let renderLat = c.lat;
            let renderLng = c.lng;
            if (count > 1) {
                const angle = (count - 1) * (2 * Math.PI / 5);
                const offsetDist = 0.000085;
                renderLat += Math.sin(angle) * offsetDist;
                renderLng += Math.cos(angle) * offsetDist;
            }

            let colorFill = isVisited ? '#15803d' : '#0369a1';
            if (this.isSatellite) {
                colorFill = isVisited ? '#22c55e' : '#38bdf8';
            }

            const marker = L.circleMarker([renderLat, renderLng], {
                radius: this.isSatellite ? 7 : 6,
                fillColor: colorFill,
                color: this.isSatellite ? '#ffffff' : (isVisited ? '#166534' : '#075985'),
                weight: this.isSatellite ? 2.5 : 1.5,
                fillOpacity: 0.95
            });

            marker.bindPopup(this.generarPopupHTML(c, isVisited));
            markers.push(marker);
            this.clientMarkers.set(c.codigo, marker);
        });

        if (markers.length > 0) {
            this.clusterMarkers.addLayers(markers);
        }
    }

    generarPopupHTML(cliente, isVisited) {
        const coords = (cliente.lat !== null && cliente.lng !== null) ? 
            `<div style="display: flex; gap: 6px; margin: 8px 0;">
                <a href="https://www.google.com/maps/search/?api=1&query=${cliente.lat},${cliente.lng}" target="_blank" style="background:#0369a1; color:white; padding:4px 8px; border-radius:6px; font-size:0.72rem; text-decoration:none;">
                    <i class="fa-solid fa-location-dot"></i> Maps
                </a>
                <a href="https://waze.com/ul?ll=${cliente.lat},${cliente.lng}&navigate=yes" target="_blank" style="background:#0284c7; color:white; padding:4px 8px; border-radius:6px; font-size:0.72rem; text-decoration:none;">
                    <i class="fa-solid fa-location-arrow"></i> Waze
                </a>
            </div>` :
            `<div style="font-size: 0.75rem; color: #ef4444; margin: 6px 0; font-weight: 600;">⚠️ Sin coordenadas</div>`;

        return `
            <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 210px;">
                <b style="font-size: 0.95rem; color: #0f172a; display:block;">${cliente.nombre}</b>
                <hr style="margin: 6px 0; border: 0; border-top: 1px solid #cbd5e1;">
                <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
                    <b>Código:</b> ${cliente.codigo}<br>
                    <b>Grupo:</b> ${cliente.grupo}<br>
                    <b>Ruta:</b> ${cliente.ruta}<br>
                    <b>Día:</b> ${cliente.dia}<br>
                    <b>Teléfono:</b> ${cliente.telefono || 'N/A'}<br>
                    <b>Dirección:</b> ${cliente.direccion}
                </div>
                ${coords}
                <div style="margin-top: 8px;">
                    <button onclick="window.ui.abrirModalVisitaCliente('${cliente.codigo}')" style="width:100%; background:${isVisited ? '#15803d' : '#1e3a8a'}; color:white; border:none; padding:7px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-pen-to-square"></i> ${isVisited ? 'Editar Visita' : 'Registrar Visita'}
                    </button>
                </div>
            </div>
        `;
    }

    renderizarRutaOptima(routeData) {
        this.rutaOptimaLayer.clearLayers();
        
        if (!routeData || !routeData.geometry) return;

        const geoJsonLayer = L.geoJSON(routeData.geometry, {
            style: { color: routeData.color || '#4f46e5', weight: 4, opacity: 0.85 }
        }).addTo(this.rutaOptimaLayer);

        if (this.map) {
            this.map.fitBounds(geoJsonLayer.getBounds(), { padding: [40, 40], maxZoom: 15 });
        }
    }

    actualizarLeyenda(switches) {
        const legendBox = document.getElementById('map-legend-box');
        const titleEl = document.querySelector('.map-legend-title');
        const listEl = document.getElementById('legend-items-list');
        
        if (!switches.masivos && !switches.especificos && !switches.tipoZona) {
            legendBox.style.display = 'none';
            return;
        }

        legendBox.style.display = 'flex';
        listEl.innerHTML = '';

        const items = [];
        if (switches.masivos) {
            titleEl.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Canales Masivos';
            items.push({ label: 'Detalle', color: '#15803d' });
            items.push({ label: 'Preferencial', color: '#0369a1' });
        } else if (switches.especificos) {
            titleEl.innerHTML = '<i class="fa-solid fa-boxes-packing"></i> Canales Específicos';
            items.push({ label: 'Mayoreo', color: '#b45309' });
            items.push({ label: 'Supermercados', color: '#7c2d12' });
            items.push({ label: 'Dedicada', color: '#5b21b6' });
            items.push({ label: 'Eventos', color: '#be185d' });
            items.push({ label: 'Distribuidor', color: '#0d9488' });
        } else if (switches.tipoZona) {
            titleEl.innerHTML = '<i class="fa-solid fa-map-pin"></i> Tipos de Zona';
            items.push({ label: 'Urbana', color: '#0369a1' });
            items.push({ label: 'Rural', color: '#15803d' });
            items.push({ label: 'Foránea', color: '#b45309' });
            items.push({ label: 'Contorno', color: '#5b21b6' });
        }

        items.forEach(item => {
            listEl.innerHTML += `
                <div class="legend-item-row">
                    <div class="legend-color-dot" style="background:${item.color};"></div>
                    <span>${item.label}</span>
                </div>
            `;
        });
    }

    zoomToClient(codigo) {
        const marker = this.clientMarkers.get(codigo);
        if (marker) {
            this.clusterMarkers.zoomToShowLayer(marker, () => {
                this.map.setView(marker.getLatLng(), 17, { animate: true });
                marker.openPopup();
            });
        }
    }
}
