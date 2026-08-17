/**
 * ============================================================
 * SERVICES/GEOCODING.JS - CÁLCULOS GEOGRÁFICOS
 * Maneja geocercas, distancias y centroides
 * ============================================================
 */

import { normalizarTexto } from '../utils/helpers.js';

export class GeocodingService {
    constructor() {
        this.geofences = [];
        this.bboxCache = [];
    }

    setGeofences(geofences) {
        this.geofences = geofences;
        this.buildBBoxCache();
    }

    buildBBoxCache() {
        this.bboxCache = [];
        if (!this.geofences || this.geofences.length === 0) return;

        this.geofences.forEach(feature => {
            const geom = feature.geometry;
            if (!geom) return;
            
            let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
            const extractRings = (rings) => {
                rings.forEach(ring => {
                    ring.forEach(pt => {
                        if (pt[0] < minLng) minLng = pt[0];
                        if (pt[0] > maxLng) maxLng = pt[0];
                        if (pt[1] < minLat) minLat = pt[1];
                        if (pt[1] > maxLat) maxLat = pt[1];
                    });
                });
            };

            if (geom.type === 'Polygon') extractRings(geom.coordinates);
            else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(poly => extractRings(poly));

            this.bboxCache.push({
                feature: feature,
                bbox: [minLng, minLat, maxLng, maxLat]
            });
        });
    }

    puntoEnPoligono(point, vs) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    isInsideGeofence(lat, lng) {
        if (this.bboxCache.length === 0) return true;
        
        const pt = [lng, lat];
        for (let item of this.bboxCache) {
            const bbox = item.bbox;
            if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;

            const geom = item.feature.geometry;
            if (!geom) continue;

            if (geom.type === 'Polygon') {
                for (let ring of geom.coordinates) {
                    if (this.puntoEnPoligono(pt, ring)) return true;
                }
            } else if (geom.type === 'MultiPolygon') {
                for (let polyCoords of geom.coordinates) {
                    for (let ring of polyCoords) {
                        if (this.puntoEnPoligono(pt, ring)) return true;
                    }
                }
            }
        }
        return false;
    }

    calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    obtenerCentroideDistribuidora(nombreDistribuidora, distributors) {
        if (!distributors || !distributors.features) return null;
        const targetNorm = normalizarTexto(nombreDistribuidora);
        
        const feature = distributors.features.find(f => {
            const props = f.properties || {};
            let n = props.Ruta || props.ruta || props.DISTRIBUIDORA || props.distribuidora || props.NOMBRE || props.nombre || '';
            const nNorm = normalizarTexto(n);
            return nNorm.includes(targetNorm) || targetNorm.includes(nNorm);
        });
        
        if (!feature || !feature.geometry) return null;

        let coords = [];
        if (feature.geometry.type === 'Polygon') coords = feature.geometry.coordinates[0];
        else if (feature.geometry.type === 'MultiPolygon') coords = feature.geometry.coordinates[0][0];

        if (coords.length === 0) return null;
        let sumLat = 0, sumLng = 0;
        coords.forEach(pt => { sumLng += pt[0]; sumLat += pt[1]; });
        return { lat: sumLat / coords.length, lng: sumLng / coords.length };
    }
}
