export class TableViews {
    constructor(store) {
        this.store = store;
        this.searchTimeout = null;
        
        this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
    }

    init() {
        // Configurar evento de búsqueda
        const searchInput = document.getElementById('input-search-cliente');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearch.bind(this));
        }

        // Botones de descarga
        document.getElementById('btn-download-visited')?.addEventListener('click', this.descargarVisitados.bind(this));
        document.getElementById('btn-download-itinerary')?.addEventListener('click', this.descargarItinerario.bind(this));
        document.getElementById('btn-download-fuera')?.addEventListener('click', this.descargarFueraGeocerca.bind(this));
        document.getElementById('btn-abrir-comparativo')?.addEventListener('click', this.abrirComparativo.bind(this));
    }

    onStateChange(state) {
        const { filteredClients, outsideClients, visitStatus } = state;
        
        this.actualizarKPIs(filteredClients, visitStatus);
        this.actualizarTablaClientes(filteredClients, visitStatus);
        this.actualizarTablaFuera(outsideClients);
        this.actualizarProgressBar(filteredClients, visitStatus);
    }

    handleSearch(event) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            const searchText = event.target.value.toLowerCase().trim();
            this.store.dispatch({
                type: 'UPDATE_FILTERS',
                payload: { searchText }
            });
        }, 300);
    }

    actualizarKPIs(clientes, visitStatus) {
        const total = clientes.length;
        const conCoords = clientes.filter(c => c.lat !== null && c.lng !== null).length;
        const visitados = clientes.filter(c => visitStatus.get(c.codigo)?.visited).length;
        const pendientes = total - visitados;
        const porcentaje = total > 0 ? Math.round((visitados / total) * 100) : 0;

        document.getElementById('kpi-total').textContent = total;
        document.getElementById('kpi-coords').textContent = conCoords;
        document.getElementById('kpi-visitados').textContent = visitados;
        document.getElementById('kpi-pendientes').textContent = pendientes;
        document.getElementById('kpi-porcentaje').textContent = porcentaje + '%';
    }

    actualizarProgressBar(clientes, visitStatus) {
        const total = clientes.length;
        const visitados = clientes.filter(c => visitStatus.get(c.codigo)?.visited).length;
        const porcentaje = total > 0 ? Math.round((visitados / total) * 100) : 0;

        const bar = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        bar.style.width = porcentaje + '%';
        text.textContent = `AVANCE DE CUMPLIMIENTO: ${porcentaje}% (${visitados}/${total})`;
    }

    actualizarTablaClientes(clientes, visitStatus) {
        const tbody = document.getElementById('tabla-clientes-body');
        const subset = clientes.slice(0, 50);

        tbody.innerHTML = subset.map(c => {
            const isVisited = visitStatus.get(c.codigo)?.visited || false;
            return `
                <tr id="row-cli-${c.codigo}" class="clickable-row ${isVisited ? 'visited-row' : ''}" onclick="window.app?.mapView?.zoomToClient('${c.codigo}')">
                    <td style="font-weight:700;color:#1e3a8a;">${c.codigo}</td>
                    <td>${c.nombre}</td>
                    <td><span style="background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:4px; font-weight:bold;">${c.ruta}</span></td>
                    <td>${c.dia}</td>
                    <td class="col-estado">
                        ${isVisited ? 
                            '<span style="color:#15803d; font-weight:bold;"><i class="fa-solid fa-circle-check"></i> Visitado</span>' : 
                            '<span style="color:#94a3b8;"><i class="fa-regular fa-circle"></i> Pendiente</span>'
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    actualizarTablaFuera(clientes) {
        const tbody = document.getElementById('tabla-fuera-body');
        const subset = clientes.slice(0, 50);

        tbody.innerHTML = subset.map(c => `
            <tr class="clickable-row outside-row" onclick="window.app?.mapView?.zoomToClient('${c.codigo}')">
                <td style="font-weight:700;color:#dc2626;">${c.codigo}</td>
                <td>${c.nombre}</td>
                <td><span style="background:#fee2e2; color:#b91c1c; padding:2px 5px; border-radius:4px; font-weight:bold;">${c.ruta}</span></td>
                <td>${c.dia}</td>
            </tr>
        `).join('');
    }

    descargarVisitados() {
        const state = this.store.getState();
        const { clients, visitStatus } = state;
        const visitados = clients.filter(c => visitStatus.get(c.codigo)?.visited);

        if (visitados.length === 0) {
            alert('No hay clientes visitados');
            return;
        }

        const data = visitados.map(c => ({
            'País': c.pais,
            'División': c.division,
            'Grupo': c.grupo,
            'Ruta': c.ruta,
            'Código': c.codigo,
            'Cliente': c.nombre,
            'Teléfono': c.telefono,
            'Dirección': c.direccion,
            'Día de visita': c.dia,
            'Visitado': 'SÍ'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Visitados');
        XLSX.writeFile(wb, `Visitados_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    descargarItinerario() {
        const state = this.store.getState();
        const { filteredClients, outsideClients, visitStatus } = state;

        if (filteredClients.length === 0) {
            alert('No hay clientes para exportar');
            return;
        }

        const data = filteredClients.map(c => {
            const isVisited = visitStatus.get(c.codigo)?.visited || false;
            const isOutside = outsideClients.some(f => f.codigo === c.codigo);
            return {
                'País': c.pais,
                'División': c.division,
                'Grupo': c.grupo,
                'Ruta': c.ruta,
                'Código': c.codigo,
                'Cliente': c.nombre,
                'Teléfono': c.telefono,
                'Dirección': c.direccion,
                'Día de visita': c.dia,
                'Estado': isVisited ? 'Visitado' : 'Pendiente',
                'Fuera de Geocerca': isOutside ? 'SÍ' : 'NO'
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Itinerario');
        XLSX.writeFile(wb, `Itinerario_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    descargarFueraGeocerca() {
        const state = this.store.getState();
        const { outsideClients } = state;

        if (outsideClients.length === 0) {
            alert('No hay clientes fuera de geocerca');
            return;
        }

        const data = outsideClients.map(c => ({
            'País': c.pais,
            'División': c.division,
            'Grupo': c.grupo,
            'Ruta': c.ruta,
            'Código': c.codigo,
            'Cliente': c.nombre,
            'Día de visita': c.dia,
            'Latitud': c.lat,
            'Longitud': c.lng
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Fuera_Geocerca');
        XLSX.writeFile(wb, `Fuera_Geocerca_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    abrirComparativo() {
        const state = this.store.getState();
        const { filteredClients, visitStatus } = state;

        const rutasMap = {};
        filteredClients.forEach(c => {
            if (!rutasMap[c.ruta]) rutasMap[c.ruta] = { total: 0, visitados: 0 };
            rutasMap[c.ruta].total++;
            if (visitStatus.get(c.codigo)?.visited) rutasMap[c.ruta].visitados++;
        });

        const tbody = document.getElementById('tabla-comparativo-body');
        tbody.innerHTML = '';

        Object.keys(rutasMap).sort().forEach(r => {
            const data = rutasMap[r];
            const pct = data.total > 0 ? Math.round((data.visitados / data.total) * 100) : 0;
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:700;">${r}</td>
                    <td>${data.total}</td>
                    <td style="color:#15803d; font-weight:bold;">${data.visitados}</td>
                    <td>
                        <span style="background:${pct >= 80 ? '#dcfce7' : '#fef3c7'}; color:${pct >= 80 ? '#15803d' : '#b45309'}; padding:2px 6px; border-radius:4px; font-weight:bold;">
                            ${pct}%
                        </span>
                    </td>
                </tr>
            `;
        });

        document.getElementById('modal-comparativo').style.display = 'flex';
    }
}
