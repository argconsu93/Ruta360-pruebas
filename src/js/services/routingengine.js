import { GeocodingService } from './geocoding.js';
import { normalizarTexto, formatearMinutosAHora12, formatearMinutosAHorasMinutos } from '../utils/helpers.js';

export class RoutingEngine {
    constructor(store) {
        this.store = store;
        this.geocoding = new GeocodingService();
        this.routeData = null;
    }

    async optimizarRuta(clientes, parametros) {
        const { rutaSeleccionada, diaSeleccionado, minutosPorParada, horaSalida } = parametros;
        const geofences = this.store.state.filteredGeofences;
        this.geocoding.setGeofences(geofences);

        // Obtener punto de origen (distribuidora)
        const distribuidoras = this.store.state.distributors;
        const nombreDistribuidora = this.obtenerDistribuidoraPorRuta(rutaSeleccionada);
        let puntoReferencia = this.geocoding.obtenerCentroideDistribuidora(nombreDistribuidora, distribuidoras);
        
        if (!puntoReferencia && distribuidoras.features.length > 0) {
            const feature = distribuidoras.features[0];
            const coords = feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : feature.geometry.coordinates[0][0];
            let sumLat = 0, sumLng = 0;
            coords.forEach(pt => { sumLng += pt[0]; sumLat += pt[1]; });
            puntoReferencia = { lat: sumLat / coords.length, lng: sumLng / coords.length };
        }

        if (!puntoReferencia) {
            throw new Error('No se pudo determinar el punto de origen');
        }

        // Filtrar clientes por día y con coordenadas
        const diasAProcesar = diaSeleccionado === 'TODOS' 
            ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] 
            : [diaSeleccionado];

        let todosLosClientes = [];
        let clientesFuera = [];
        let resultados = [];

        for (let dia of diasAProcesar) {
            const clientesDia = clientes.filter(c => {
                if (c.lat === null || c.lng === null || isNaN(c.lat) || isNaN(c.lng)) return false;
                return coincideDia(normalizarTexto(dia), c);
            });

            const clientesValidos = [];
            clientesDia.forEach(c => {
                if (this.geocoding.isInsideGeofence(c.lat, c.lng)) {
                    clientesValidos.push(c);
                } else {
                    clientesFuera.push(c);
                }
            });

            if (clientesValidos.length < 1) continue;

            // Optimizar secuencia para este día
            const secuencia = this.optimizarSecuenciaSweep2OPT(clientesValidos, puntoReferencia);
            todosLosClientes.push(...secuencia);
            resultados.push({
                dia: dia,
                clientes: secuencia,
                cantidad: secuencia.length
            });
        }

        // Calcular métricas de ruta
        const metrics = this.calcularMetricasRuta(todosLosClientes, puntoReferencia, parametros);
        
        return {
            clientes: todosLosClientes,
            clientesFuera: clientesFuera,
            resultadosPorDia: resultados,
            metrics: metrics,
            puntoOrigen: puntoReferencia
        };
    }

    optimizarSecuenciaSweep2OPT(secuenciaOriginal, puntoOrigen) {
        if (secuenciaOriginal.length <= 2) return secuenciaOriginal;

        // Barrido sectorial (Sweep)
        const conAngulos = secuenciaOriginal.map(c => {
            const angulo = Math.atan2(c.lat - puntoOrigen.lat, c.lng - puntoOrigen.lng);
            return { cliente: c, angulo };
        });

        conAngulos.sort((a, b) => a.angulo - b.angulo);
        let puntosOrdenados = conAngulos.map(item => item.cliente);

        // 2-OPT para refinar
        let puntos = [puntoOrigen, ...puntosOrdenados];
        const n = puntos.length;
        
        const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    matrix[i][j] = this.geocoding.calcularDistancia(
                        puntos[i].lat, puntos[i].lng, 
                        puntos[j].lat, puntos[j].lng
                    );
                }
            }
        }

        let rutaIndices = Array.from({ length: n }, (_, i) => i);
        let mejorado = true;
        let iteraciones = 0;

        while (mejorado && iteraciones < 200) {
            mejorado = false;
            iteraciones++;
            for (let i = 1; i < n - 1; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (j - i === 1) continue;
                    
                    const distActual = matrix[rutaIndices[i-1]][rutaIndices[i]] + 
                                     (j < n - 1 ? matrix[rutaIndices[j]][rutaIndices[j+1]] : 0);
                    const distNueva = matrix[rutaIndices[i-1]][rutaIndices[j]] + 
                                    (j < n - 1 ? matrix[rutaIndices[i]][rutaIndices[j+1]] : 0);

                    if (distNueva < distActual - 0.0001) {
                        const tramoInvertido = rutaIndices.slice(i, j + 1).reverse();
                        rutaIndices.splice(i, tramoInvertido.length, ...tramoInvertido);
                        mejorado = true;
                        break;
                    }
                }
                if (mejorado) break;
            }
        }

        return rutaIndices.slice(1).map(idx => puntos[idx]);
    }

    calcularMetricasRuta(clientes, puntoOrigen, parametros) {
        const { minutosPorParada, horaSalida, velocidadBase = 40 } = parametros;
        const [hora, minuto] = horaSalida.split(':').map(Number);
        let minutosAcumulados = (hora || 8) * 60 + (minuto || 0);

        let distanciaTotal = 0;
        let tiempoVisitas = 0;
        let tiempoGeocerca = 0;
        let tiempoTransito = 0;

        if (clientes.length === 0) return null;

        // Distancia desde origen al primer cliente
        const distInicial = this.geocoding.calcularDistancia(
            puntoOrigen.lat, puntoOrigen.lng,
            clientes[0].lat, clientes[0].lng
        );
        distanciaTotal += distInicial;
        tiempoTransito += (distInicial / velocidadBase) * 60;

        for (let i = 0; i < clientes.length; i++) {
            // Tiempo de visita
            tiempoVisitas += minutosPorParada;
            minutosAcumulados += minutosPorParada;

            // Almuerzo
            let horaActual = (minutosAcumulados / 60) % 24;
            if (horaActual >= 12 && horaActual < 13) {
                minutosAcumulados += 60;
                tiempoVisitas += 60;
            }

            // Distancia al siguiente cliente
            if (i < clientes.length - 1) {
                const dist = this.geocoding.calcularDistancia(
                    clientes[i].lat, clientes[i].lng,
                    clientes[i+1].lat, clientes[i+1].lng
                );
                distanciaTotal += dist;
                const tiempo = (dist / velocidadBase) * 60;
                tiempoTransito += tiempo;
                tiempoGeocerca += tiempo;
            }
        }

        // Distancia de regreso
        const distRetorno = this.geocoding.calcularDistancia(
            clientes[clientes.length - 1].lat, clientes[clientes.length - 1].lng,
            puntoOrigen.lat, puntoOrigen.lng
        );
        distanciaTotal += distRetorno;
        tiempoTransito += (distRetorno / velocidadBase) * 60;

        const tiempoTotal = tiempoTransito + tiempoVisitas;
        const horaFinal = minutosAcumulados + (distRetorno / velocidadBase) * 60;

        return {
            distanciaTotal: distanciaTotal,
            tiempoTotal: tiempoTotal,
            tiempoVisitas: tiempoVisitas,
            tiempoGeocerca: tiempoGeocerca,
            tiempoTransito: tiempoTransito,
            horaFinal: horaFinal,
            cantidadClientes: clientes.length
        };
    }

    obtenerDistribuidoraPorRuta(ruta) {
        const mapping = window.MAPEO_RUTAS_DISTRIBUIDORAS || {};
        return mapping[ruta] || '';
    }
}
