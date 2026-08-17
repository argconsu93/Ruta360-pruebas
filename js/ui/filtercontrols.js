/**
 * ============================================================
 * UI/FILTERCONTROLS.JS - CONTROLES DE FILTRO
 * Maneja selectores, chips, días y switches
 * ============================================================
 */

import { ACTIONS } from '../store/types.js';
import { DIVISIONES_POR_PAIS, PAISES_MAPA_NOMBRES } from '../utils/constants.js';
import { normalizarTexto, esRolAvanzado, normalizarNombreGrupo } from '../utils/helpers.js';

export class FilterControls {
    constructor(store) {
        this.store = store;
        this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
    }

    init() {
        this.configurarSelectores();
        this.configurarSwitches();
        this.configurarDias();
        this.poblarFiltrosIniciales();
    }

    onStateChange(state) {
        this.actualizarChips(state.filters);
        this.actualizarSelectores(state);
    }

    configurarSelectores() {
        const selectPais = document.getElementById('select-pais');
        selectPais.addEventListener('change', () => {
            const value = selectPais.value;
            if (value && value !== 'TODOS') {
                const currentFilters = this.store.getState().filters;
                if (!currentFilters.countries.includes(value)) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { countries: [...currentFilters.countries, value] }
                    });
                }
                selectPais.value = 'TODOS';
            }
        });

        const selectDivision = document.getElementById('select-division');
        selectDivision.addEventListener('change', () => {
            const value = selectDivision.value;
            if (value && value !== 'TODOS') {
                const currentFilters = this.store.getState().filters;
                if (!currentFilters.divisions.includes(value)) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { divisions: [...currentFilters.divisions, value] }
                    });
                }
                selectDivision.value = 'TODOS';
            }
        });

        const selectGrupo = document.getElementById('select-grupo');
        selectGrupo.addEventListener('change', () => {
            const value = selectGrupo.value;
            if (value && value !== 'TODOS') {
                const currentFilters = this.store.getState().filters;
                const user = this.store.getState().user;
                if (!currentFilters.groups.includes(value) || esRolAvanzado(user)) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { groups: esRolAvanzado(user) ? [...currentFilters.groups, value] : [value] }
                    });
                }
                selectGrupo.value = 'TODOS';
            }
        });

        const selectRuta = document.getElementById('select-ruta');
        selectRuta.addEventListener('change', () => {
