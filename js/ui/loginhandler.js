/**
 * ============================================================
 * UI/LOGINHANDLER.JS - GESTIÓN DE LOGIN
 * Maneja el proceso de autenticación y selección de país/división
 * ============================================================
 */

import { ACTIONS } from '../store/types.js';
import { DIVISIONES_POR_PAIS, PAISES_MAPA_NOMBRES } from '../utils/constants.js';

export class LoginHandler {
    constructor(store) {
        this.store = store;
        this.paisSeleccionado = null;
        this.divisionSeleccionada = null;
        this.esAccesoRegional = false;
        
        this.configurarEventos();
    }

    configurarEventos() {
        document.getElementById('btn-login')?.addEventListener('click', this.validarLogin.bind(this));
        document.getElementById('input-password')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.validarLogin();
        });
        document.getElementById('btn-back-from-login')?.addEventListener('click', this.volverDesdeLogin.bind(this));
        document.getElementById('toggle-password-btn')?.addEventListener('click', this.togglePasswordVisibility.bind(this));
    }

    seleccionarPais(codigoPais, nombrePais) {
        this.paisSeleccionado = codigoPais;
        this.esAccesoRegional = false;
        
        document.getElementById('step-pais').style.display = 'none';
        
        const container = document.getElementById('container-divisiones');
        container.innerHTML = '';
        
        const divisiones = DIVISIONES_POR_PAIS[codigoPais] || [{ id: codigoPais + ' Centro', nombre: codigoPais + ' Centro' }];
        divisiones.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'btn-division';
            btn.textContent = d.nombre;
            btn.onclick = () => this.seleccionarDivision(d.id);
            container.appendChild(btn);
        });

        document.getElementById('txt-sub-pais').textContent = `Divisiones para ${nombrePais}:`;
        document.getElementById('step-division').style.display = 'block';
    }

    seleccionarAccesoRegional() {
        this.esAccesoRegional = true;
        this.paisSeleccionado = 'TODOS';
        this.divisionSeleccionada = 'TODOS';

        document.getElementById('step-pais').style.display = 'none';
        document.getElementById('txt-division-activa-label').textContent = 'Acceso Regional';
        document.getElementById('header-division-title').textContent = 'BOCADELI - REGIONAL';

        this.poblarUsuarios('TODOS');
        document.getElementById('step-credentials').style.display = 'block';
    }

    seleccionarDivision(idDivision) {
        this.divisionSeleccionada = idDivision;
        document.getElementById('step-division').style.display = 'none';
        
        document.getElementById('txt-division-activa-label').textContent = `División: ${idDivision}`;
        document.getElementById('header-division-title').textContent = `BOCADELI - ${idDivision.toUpperCase()}`;
        
        this.poblarUsuarios(idDivision);
        document.getElementById('step-credentials').style.display = 'block';
    }

    volverAPasoPais() {
        document.getElementById('step-division').style.display = 'none';
        document.getElementById('step-pais').style.display = 'block';
    }

    volverDesdeLogin() {
        document.getElementById('step-credentials').style.display = 'none';
        if (this.esAccesoRegional) {
            document.getElementById('step-pais').style.display = 'block';
        } else {
            document.getElementById('step-division').style.display = 'block';
        }
    }

    poblarUsuarios(division) {
        const selectLogin = document.getElementById('select-usuario-login');
        selectLogin.innerHTML = '<option value="" disabled selected hidden>Seleccione su nombre</option>';
        
        const usuarios = window.USUARIOS_ROLES || [];
        let filtrados = usuarios;

        if (!this.esAccesoRegional && this.paisSeleccionado) {
            const nombrePais = PAISES_MAPA_NOMBRES[this.paisSeleccionado] || '';
            filtrados = usuarios.filter(u => {
                const matchPais = u.pais === 'TODOS' || 
                                 u.pais.toLowerCase() === nombrePais.toLowerCase() ||
                                 u.pais.toLowerCase() === this.paisSeleccionado.toLowerCase();
                const matchDiv = u.division === 'TODOS' || 
                                 u.division.toLowerCase() === division.toLowerCase() || 
                                 division === 'TODOS';
                return matchPais && matchDiv;
            });
        }

        if (filtrados.length === 0) filtrados = usuarios;

        filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        filtrados.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.nombre;
            opt.textContent = `${u.nombre} (${u.rol} - ${u.division})`;
            selectLogin.appendChild(opt);
        });
    }

    validarLogin() {
        const nombreSel = document.getElementById('select-usuario-login').value;
        const passInput = document.getElementById('input-password').value.trim().toLowerCase();
        const errorDiv = document.getElementById('login-error');
        
        if (!nombreSel) {
            errorDiv.textContent = '⚠️ Por favor seleccione su nombre.';
            errorDiv.style.display = 'block';
            return;
        }

        const usuarios = window.USUARIOS_ROLES || [];
        const userObj = usuarios.find(u => u.nombre === nombreSel);
        
        if (userObj && passInput === userObj.pass.toLowerCase()) {
            document.getElementById('login-modal').style.display = 'none';
            
            this.store.dispatch({
                type: ACTIONS.SET_USER,
                payload: userObj
            });

            const filters = {};
            if (userObj.pais && userObj.pais !== 'TODOS') filters.countries = [userObj.pais];
            if (userObj.division && userObj.division !== 'TODOS') filters.divisions = [userObj.division];
            if (userObj.grupo && userObj.grupo !== 'TODOS') filters.groups = [userObj.grupo];
            
            this.store.dispatch({
                type: ACTIONS.UPDATE_FILTERS,
                payload: filters
            });

            document.getElementById('panel-admin-actualizacion').style.display = 
                userObj.rol === 'Administrador' ? 'flex' : 'none';

            document.getElementById('txt-rol-activo').textContent = userObj.nombre;
            document.getElementById('txt-rol-activo-mobile').textContent = userObj.nombre;

            if (window.APP?.mapView) {
                window.APP.mapView.init();
                setTimeout(() => window.APP.store.aplicarFiltros(), 150);
            }
        } else {
            errorDiv.textContent = '⚠️ Contraseña incorrecta. Verifique e intente de nuevo.';
            errorDiv.style.display = 'block';
        }
    }

    togglePasswordVisibility() {
        const input = document.getElementById('input-password');
        const icon = document.getElementById('toggle-password-btn');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-regular fa-eye-slash toggle-password-icon';
        } else {
            input.type = 'password';
            icon.className = 'fa-regular fa-eye toggle-password-icon';
        }
    }

    cerrarSesion() {
        this.store.dispatch({
            type: ACTIONS.SET_USER,
            payload: null
        });

        document.getElementById('input-password').value = '';
        document.getElementById('login-error').style.display = 'none';
        
        document.getElementById('step-credentials').style.display = 'none';
        document.getElementById('step-division').style.display = 'none';
        document.getElementById('step-pais').style.display = 'block';
        document.getElementById('login-modal').style.display = 'flex';
        document.getElementById('mobile-user-dropdown').classList.remove('active');
        
        if (window.APP?.mapView?.map) {
            window.APP.mapView.map.remove();
            window.APP.mapView.map = null;
        }
    }
}
