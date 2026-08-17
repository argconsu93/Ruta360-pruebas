/**
 * ============================================================
 * STORE/ACTIONS.JS - LÓGICA DE FILTRADO
 * Funciones puras para filtrar clientes y geocercas
 * ============================================================
 */

import { 
    normalizarTexto, 
    coincidePais, 
    coincideDivision, 
    coincideGrupo, 
    coincideRuta, 
    coincideDia 
} from '../utils/helpers.js';

export function applyFilters(state) {
    const { clients, filters, visitStatus, ui } = state;
    const { countries, divisions, groups, routes, day, searchText } = filters;
    const { masivos, especificos } = ui.activeSwitches;

    return clients.filter(client => {
        // Filtro de búsqueda por texto
        if (searchText && !client._searchCache.includes(searchText.toLowerCase())) return false;

        // Filtros geográficos
        if (countries.length > 0 && !countries.some(p => coincidePais(p, client))) return false;
        if (divisions.length > 0 && !divisions.some(d => coincideDivision(d, client))) return false;
        if (groups.length > 0 && !groups.some(g => coincideGrupo(g, client))) return false;
        if (routes.length > 0 && !routes.some(r => coincideRuta(r, client))) return false;
        
        // Filtro de día
        if (day !== 'TODOS' && !coincideDia(normalizarTexto(day), client)) return false;

        // Filtros de switches (canales)
        const canalCliente = client.canal || '';
        if (masivos && !canalCliente.includes('DETALLE') && !canalCliente.includes('PREFERENCIAL')) return false;
        if (especificos && (canalCliente.includes('DETALLE') || canalCliente.includes('PREFERENCIAL'))) return false;

        return true;
    });
}

export function getFilteredGeofences(state) {
    const { geofences, filters, ui } = state;
    const { countries, divisions, groups, routes } = filters;
    const { masivos, especificos } = ui.activeSwitches;

    if (!geofences || !geofences.features) return [];

    return geofences.features.filter(f => {
        const props = f.properties || {};
        const rutaNorm = props._rutaNorm || '';
        const paisGeo = normalizarTexto(props.pais_clean || '');
        const divGeo = props.division_clean || '';
        const grupoGeo = props.grupo_clean || '';

        if (countries.length > 0 && !countries.some(p => paisGeo.includes(normalizarTexto(p)))) return false;
        if (divisions.length > 0 && !divisions.some(d => coincideDivision(d, { division: divGeo, _divClean: normalizarTexto(divGeo) }))) return false;
        if (groups.length > 0 && !groups.some(g => coincideGrupo(g, { _grupoNorm: grupoGeo, grupo: grupoGeo }))) return false;
        if (routes.length > 0 && !routes.some(r => coincideRuta(r, { ruta: props.ruta_clean, _rutaNorm: rutaNorm }))) return false;

        const canalGeo = (props.CANAL || props.Canal || '').toUpperCase();
        if (masivos && !canalGeo.includes('DETALLE') && !canalGeo.includes('PREFERENCIAL')) return false;
        if (especificos && (canalGeo.includes('DETALLE') || canalGeo.includes('PREFERENCIAL'))) return false;

        return true;
    });
}
