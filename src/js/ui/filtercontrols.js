import { ACTIONS } from '../store/types.js';
import { DIVISIONES_POR_PAIS, PAISES_MAPA_NOMBRES } from '../utils/constants.js';
import { normalizarTexto, esRolAvanzado } from '../utils/helpers.js';

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
        // Actualizar chips según el estado actual
        this.actualizarChips(state.filters);
    }

    configurarSelectores() {
        // País
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

        // División
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

        // Grupo
        const selectGrupo = document.getElementById('select-grupo');
        selectGrupo.addEventListener('change', () => {
            const value = selectGrupo.value;
            if (value && value !== 'TODOS') {
                const currentFilters = this.store.getState().filters;
                if (!currentFilters.groups.includes(value) || esRolAvanzado()) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { groups: esRolAvanzado() ? [...currentFilters.groups, value] : [value] }
                    });
                }
                selectGrupo.value = 'TODOS';
            }
        });

        // Ruta
        const selectRuta = document.getElementById('select-ruta');
        selectRuta.addEventListener('change', () => {
            const value = selectRuta.value;
            if (value && value !== 'TODOS') {
                const currentFilters = this.store.getState().filters;
                if (!currentFilters.routes.includes(value)) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { routes: [...currentFilters.routes, value] }
                    });
                }
                selectRuta.value = 'TODOS';
            }
        });
    }

    configurarSwitches() {
        const switches = {
            'switch-canales-masivos': 'masivos',
            'switch-canales-especificos': 'especificos',
            'switch-tipo-zona': 'tipoZona'
        };

        Object.entries(switches).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_SWITCH,
                        payload: { [key]: element.checked }
                    });
                });
            }
        });
    }

    configurarDias() {
        document.querySelectorAll('.btn-day').forEach(btn => {
            btn.addEventListener('click', () => {
                const dia = btn.dataset.dia;
                const currentFilters = this.store.getState().filters;
                
                if (currentFilters.day === dia) {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { day: 'NINGUNO' }
                    });
                    document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                } else {
                    this.store.dispatch({
                        type: ACTIONS.UPDATE_FILTERS,
                        payload: { day: dia }
                    });
                    document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        });
    }

    poblarFiltrosIniciales() {
        const state = this.store.getState();
        const user = state.user;
        
        if (user) {
            if (user.pais !== 'TODOS') {
                document.getElementById('select-pais').disabled = true;
                this.store.dispatch({
                    type: ACTIONS.UPDATE_FILTERS,
                    payload: { countries: [user.pais] }
                });
            }
            
            if (user.division !== 'TODOS') {
                document.getElementById('select-division').disabled = true;
                this.store.dispatch({
                    type: ACTIONS.UPDATE_FILTERS,
                    payload: { divisions: [user.division] }
                });
            }
            
            if (user.grupo !== 'TODOS') {
                document.getElementById('select-grupo').disabled = true;
                this.store.dispatch({
                    type: ACTIONS.UPDATE_FILTERS,
                    payload: { groups: [normalizarNombreGrupo(user.grupo)] }
                });
            }
        }

        this.actualizarSelectores();
    }

    actualizarSelectores() {
        const state = this.store.getState();
        const { clients, filters } = state;
        const { countries, divisions, groups, routes } = filters;

        // Actualizar opciones de país
        this.actualizarOpcionesPais(countries);

        // Actualizar opciones de división
        this.actualizarOpcionesDivision(countries, divisions);

        // Actualizar opciones de grupo
        this.actualizarOpcionesGrupo(countries, divisions, groups);

        // Actualizar opciones de ruta
        this.actualizarOpcionesRuta(countries, divisions, groups, routes);

        // Actualizar chips
        this.actualizarChips(filters);
    }

    actualizarOpcionesPais(countries) {
        const select = document.getElementById('select-pais');
        if (select.disabled) return;

        // Mantener solo opciones no seleccionadas
        const currentOptions = Array.from(select.options);
        const availableCountries = ['Guatemala', 'El Salvador', 'Honduras']
            .filter(p => !countries.includes(p));

        // Limpiar y reconstruir
        select.innerHTML = '<option value="TODOS">Seleccionar País</option>';
        availableCountries.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            select.appendChild(opt);
        });
    }

    actualizarOpcionesDivision(countries, divisions) {
        const select = document.getElementById('select-division');
        if (select.disabled) return;

        let availableDivisions = [];
        if (countries.length === 0) {
            Object.values(DIVISIONES_POR_PAIS).forEach(list => {
                list.forEach(d => availableDivisions.push(d.nombre));
            });
        } else {
            countries.forEach(p => {
                const cod = Object.keys(PAISES_MAPA_NOMBRES).find(k => PAISES_MAPA_NOMBRES[k] === p);
                if (cod && DIVISIONES_POR_PAIS[cod]) {
                    DIVISIONES_POR_PAIS[cod].forEach(d => availableDivisions.push(d.nombre));
                }
            });
        }

        availableDivisions = [...new Set(availableDivisions)]
            .filter(d => !divisions.includes(d))
            .sort();

        select.innerHTML = '<option value="TODOS">Seleccionar División</option>';
        availableDivisions.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            select.appendChild(opt);
        });
    }

    actualizarOpcionesGrupo(countries, divisions, groups) {
        const select = document.getElementById('select-grupo');
        if (select.disabled) return;

        const state = this.store.getState();
        let clientesBase = state.clients;

        if (countries.length > 0) {
            clientesBase = clientesBase.filter(c => countries.some(p => coincidePais(p, c)));
        }
        if (divisions.length > 0) {
            clientesBase = clientesBase.filter(c => divisions.some(d => coincideDivision(d, c)));
        }

        const grupos = [...new Set(clientesBase.map(c => c.grupo || c._grupoNorm))]
            .filter(g => g && g !== 'Sin Grupo' && !groups.includes(g))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        select.innerHTML = '<option value="TODOS">Seleccionar Grupo</option>';
        grupos.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            select.appendChild(opt);
        });
    }

    actualizarOpcionesRuta(countries, divisions, groups, routes) {
        const select = document.getElementById('select-ruta');
        const state = this.store.getState();
        let clientesBase = state.clients;

        if (countries.length > 0) {
            clientesBase = clientesBase.filter(c => countries.some(p => coincidePais(p, c)));
        }
        if (divisions.length > 0) {
            clientesBase = clientesBase.filter(c => divisions.some(d => coincideDivision(d, c)));
        }
        if (groups.length > 0) {
            clientesBase = clientesBase.filter(c => groups.some(g => coincideGrupo(g, c)));
        }

        const rutas = [...new Set(clientesBase.map(c => c.ruta))]
            .filter(r => r && r !== 'S/R' && !routes.includes(r))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        select.innerHTML = '<option value="TODOS">Seleccionar Ruta</option>';
        rutas.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            select.appendChild(opt);
        });
    }

    actualizarChips(filters) {
        const { countries, divisions, groups, routes } = filters;
        
        this.actualizarChipsContainer('chips-paises', countries, 'chip-pais', 'removerPais');
        this.actualizarChipsContainer('chips-divisiones', divisions, 'chip-division', 'removerDivision');
        this.actualizarChipsContainer('chips-grupos', groups, '', 'removerGrupo');
        this.actualizarChipsContainer('chips-rutas', routes, '', 'removerRuta');
    }

    actualizarChipsContainer(containerId, items, className, removeFunction) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        items.forEach(item => {
            const chip = document.createElement('div');
            chip.className = `chip-item ${className}`;
            chip.innerHTML = `
                <span>${item}</span>
                <span class="btn-remove-chip" onclick="window.filterControls?.${removeFunction}('${item}')">&times;</span>
            `;
            container.appendChild(chip);
        });
    }

    removerPais(pais) {
        const currentFilters = this.store.getState().filters;
        this.store.dispatch({
            type: ACTIONS.UPDATE_FILTERS,
            payload: { countries: currentFilters.countries.filter(p => p !== pais) }
        });
    }

    removerDivision(division) {
        const currentFilters = this.store.getState().filters;
        this.store.dispatch({
            type: ACTIONS.UPDATE_FILTERS,
            payload: { divisions: currentFilters.divisions.filter(d => d !== division) }
        });
    }

    removerGrupo(grupo) {
        const currentFilters = this.store.getState().filters;
        this.store.dispatch({
            type: ACTIONS.UPDATE_FILTERS,
            payload: { groups: currentFilters.groups.filter(g => g !== grupo) }
        });
    }

    removerRuta(ruta) {
        const currentFilters = this.store.getState().filters;
        this.store.dispatch({
            type: ACTIONS.UPDATE_FILTERS,
            payload: { routes: currentFilters.routes.filter(r => r !== ruta) }
        });
    }

    toggleAccordion(id) {
        const card = document.getElementById(id);
        if (card) card.classList.toggle('open');
    }

    toggleDrawer() {
        const drawer = document.getElementById('mobile-drawer');
        const label = document.getElementById('drawer-btn-label');
        drawer.classList.toggle('collapsed');
        label.innerHTML = drawer.classList.contains('collapsed') 
            ? '<i class="fa-solid fa-chevron-up"></i> Mostrar Panel'
            : '<i class="fa-solid fa-chevron-down"></i> Ocultar';
    }
}

// Exponer funciones para onclick
window.filterControls = {
