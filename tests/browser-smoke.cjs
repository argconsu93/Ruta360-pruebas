const { chromium } = require('playwright');

let browser;

(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['geolocation'],
    geolocation: { latitude: 13.705, longitude: -89.205 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.route('**/clientes.csv*', (route) => route.fulfill({
    contentType: 'text/csv; charset=utf-8',
    body: [
      'CodigoCliente,NombreCliente,Grupo,Ruta,Dia,Latitud,Longitud,Direccion,Telefono,Pais,Division',
      'QA-001,Cliente de prueba,GRUPO 01,R-001,Lunes,13.7000,-89.2000,Dirección QA,2222-2222,El Salvador,SV Centro',
      'QA-002,Segundo cliente,GRUPO 01,R-001,Lunes,13.7100,-89.2100,Dirección QA 2,2222-2223,El Salvador,SV Centro',
    ].join('\n'),
  }));

  await page.route('**/data/usuarios.csv*', (route) => route.fulfill({
    contentType: 'text/csv; charset=utf-8',
    body: 'Nombres,Roles,Pais,Division,Grupo,Contraseña\nUsuario QA,Administrador,TODOS,TODOS,TODOS,prueba',
  }));

  await page.route('**/data/geocercas_rutas.geojson*', (route) => route.fulfill({
    contentType: 'application/geo+json',
    body: JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { Ruta: 'R-001', Grupo: 'GRUPO 01', Pais: 'El Salvador', Division: 'SV Centro' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-89.23, 13.68], [-89.18, 13.68], [-89.18, 13.73],
            [-89.23, 13.73], [-89.23, 13.68],
          ]],
        },
      }],
    }),
  }));

  await page.route('**/data/geocercas_distribuidoras.geojson*', (route) => route.fulfill({
    contentType: 'application/geo+json',
    body: JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { Nombre: 'Centro QA' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-89.207, 13.703], [-89.203, 13.703], [-89.203, 13.707],
            [-89.207, 13.707], [-89.207, 13.703],
          ]],
        },
      }],
    }),
  }));

  await page.route('https://router.project-osrm.org/route/v1/driving/**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      code: 'Ok',
      routes: [{
        geometry: {
          type: 'LineString',
          coordinates: [[-89.205, 13.705], [-89.20, 13.70], [-89.21, 13.71], [-89.205, 13.705]],
        },
      }],
    }),
  }));

  await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);

  const checks = {
    title: await page.title(),
    loginVisible: await page.locator('#login-modal').isVisible(),
    hasMapContainer: (await page.locator('#map').count()) === 1,
    modulesLoaded: await page.evaluate(async () => {
      const [core, filters] = await Promise.all([
        import('/js/01-core.js'),
        import('/js/05-filters.js'),
      ]);
      return typeof core.seleccionarPais === 'function' && typeof filters.aplicarFiltros === 'function';
    }),
  };

  if (checks.title !== 'Ruta360 - Regional - Bocadeli') throw new Error(`Título inesperado: ${checks.title}`);
  if (!checks.loginVisible || !checks.hasMapContainer || !checks.modulesLoaded) {
    throw new Error(`Fallo de integración: ${JSON.stringify(checks)}`);
  }

  await page.locator('[data-action="regional-access"]').click();
  await page.locator('#select-usuario-login').selectOption({ value: 'Usuario QA' });
  await page.locator('#input-password').fill('prueba');
  await page.locator('#btn-login').click();
  await page.locator('#login-modal').waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);

  const authenticatedChecks = {
    mapInitialized: await page.locator('#map.leaflet-container').isVisible(),
    countryFilterEnabled: await page.locator('#select-pais').isEnabled(),
    groupFilterEnabled: await page.locator('#select-grupo').isEnabled(),
    routeFilterEnabled: await page.locator('#select-ruta').isEnabled(),
    groupOptions: await page.locator('#select-grupo option').count(),
    routeOptions: await page.locator('#select-ruta option').count(),
  };

  if (!authenticatedChecks.mapInitialized || !authenticatedChecks.countryFilterEnabled ||
      !authenticatedChecks.groupFilterEnabled || !authenticatedChecks.routeFilterEnabled ||
      authenticatedChecks.groupOptions < 2 || authenticatedChecks.routeOptions < 2) {
    throw new Error(`Fallo después del login: ${JSON.stringify(authenticatedChecks)}`);
  }

  if (await page.locator('.btn-day.active').count() !== 0) {
    throw new Error('El acceso no debe iniciar con TODOS ni otro día seleccionado');
  }
  if ((await page.locator('#tabla-clientes-body tr').count()) !== 0) {
    throw new Error('No deben renderizarse clientes hasta seleccionar un día');
  }

  await page.locator('.btn-day[data-dia="Lunes"]').click();
  await page.waitForFunction(() => document.querySelectorAll('#tabla-clientes-body tr').length === 2);

  await page.locator('#file-geojson-input').setInputFiles({
    name: 'geocercas-invalidas.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from('{}'),
  });
  await page.waitForFunction(() =>
    document.querySelector('#ios-notif-title').textContent.includes('Error GeoJSON')
  );
  if (await page.locator('#tabla-clientes-body tr').count() !== 2) {
    throw new Error('Una carga inválida alteró los clientes activos');
  }
  await page.locator('#btn-close-ios-notif').click();

  await page.locator('#file-csv-input').setInputFiles({
    name: 'clientes-temporales.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'CodigoCliente,NombreCliente,Grupo,Ruta,Dia,Latitud,Longitud,Direccion,Telefono,Pais,Division',
      'TMP-001,Cliente temporal,GRUPO 09,TMP-01,Lunes,13.7200,-89.2200,Dirección temporal,2222-9999,El Salvador,SV Centro',
    ].join('\n')),
  });
  await page.waitForFunction(() =>
    document.querySelector('#ios-notif-title').textContent.includes('Carga Exitosa')
  );
  await page.waitForFunction(() => document.querySelectorAll('#tabla-clientes-body tr').length === 1);
  if (!await page.locator('#btn-restaurar-datos').isVisible()) {
    throw new Error('No se habilitó la restauración después de la carga temporal');
  }
  await page.locator('#btn-close-ios-notif').click();
  await page.locator('#btn-restaurar-datos').click();
  await page.waitForFunction(() =>
    document.querySelector('#ios-notif-title').textContent.includes('Datos restaurados')
  );
  await page.waitForFunction(() => document.querySelectorAll('#tabla-clientes-body tr').length === 2);
  await page.locator('#btn-close-ios-notif').click();

  await page.locator('#input-search-cliente').fill('QA-002');
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('#tabla-clientes-body tr')];
    return rows.length === 1 && rows[0].textContent.includes('QA-002');
  });
  await page.locator('#input-search-cliente').fill('');
  await page.waitForTimeout(250);

  await page.evaluate(async () => {
    const { abrirModalVisitaCliente } = await import('/js/04-visits.js');
    abrirModalVisitaCliente('QA-001');
  });
  if (await page.locator('#visit-result-content').isVisible()) {
    throw new Error('El resultado de visita debe iniciar cerrado');
  }
  await page.locator('input[name="radio-estado-cliente"][value="DUPLICADO"]').check();
  if (!await page.locator('#section-cliente-duplicado').isVisible()) throw new Error('No se mostró el formulario de duplicado');
  await page.locator('input[name="radio-estado-cliente"][value="OTRA_RUTA"]').check();
  if (!await page.locator('#section-cliente-otra-ruta').isVisible()) throw new Error('No se mostró el formulario de otra ruta');
  await page.locator('input[name="radio-estado-cliente"][value="NO_EXISTE"]').check();
  if (await page.locator('#section-cliente-activo').isVisible()) throw new Error('Cliente inexistente mostró campos adicionales');
  await page.locator('input[name="radio-estado-cliente"][value="ACTIVO"]').check();
  await page.locator('[data-action="capture-gps"]').click();
  await page.waitForFunction(() => document.querySelector('#txt-coords-actuales-display').textContent.includes('Nuevas GPS'));
  await page.locator('#btn-close-ios-notif').click();
  await page.locator('[data-action="toggle-visit-result"]').click();
  await page.locator('input[name="radio-visita"][value="SI"]').check();
  await page.locator('#input-total-venta').fill('125.5');
  await page.locator('[data-action="request-save-visit"]').click();
  await page.locator('[data-action="confirm-save-visit"]').click();
  await page.waitForFunction(() => document.querySelector('#kpi-visitados').textContent.trim() === '1');
  await page.waitForFunction(() => document.querySelector('#ios-notif-title').textContent.includes('Registro Exitoso'));
  if (!await page.locator('#ios-notif-overlay').isVisible()) {
    throw new Error('La confirmación de guardado no quedó visible');
  }
  if (!await page.locator('#ios-notif-body').textContent().then(text => text.includes('quedó guardado'))) {
    throw new Error('La confirmación no informó que el cambio quedó guardado');
  }
  if (!await page.evaluate(() => Boolean(localStorage.getItem('ruta360-progreso-visitas-v1')))) {
    throw new Error('El progreso de visita no quedó guardado en el navegador');
  }
  await page.locator('#btn-close-ios-notif').click();

  await page.evaluate(() => {
    window.__qaDownloads = [];
    window.XLSX.writeFile = (_workbook, filename) => window.__qaDownloads.push(filename);
  });
  await page.evaluate(() => document.querySelector('#btn-download-visited').click());
  await page.waitForFunction(() =>
    window.__qaDownloads.some((filename) => /visitados.*\.xlsx$/i.test(filename))
  );
  if (!await page.evaluate(() => window.__qaDownloads.some((filename) => filename.includes('R-001')))) {
    throw new Error('La descarga de visitados no incluyó la ruta en el nombre');
  }

  await page.locator('#select-ruta').selectOption('R-001');
  await page.waitForFunction(() => !document.querySelector('#btn-trazar-ruta').disabled);
  await page.evaluate(() => document.querySelector('#btn-trazar-ruta').click());
  await page.waitForFunction(() => !document.querySelector('#btn-descargar-optimizacion').disabled);
  if (!await page.locator('#route-simulation-container').isVisible()) {
    throw new Error('La simulación no quedó disponible después de optimizar');
  }
  await page.locator('#btn-close-ios-notif').click();

  await page.evaluate(() => document.querySelector('#btn-download-itinerary').click());
  await page.waitForFunction(() =>
    window.__qaDownloads.some((filename) => /itinerario.*\.xlsx$/i.test(filename))
  );

  await page.locator('#btn-logout').click();
  await page.locator('#login-modal').waitFor({ state: 'visible' });

  const relevantErrors = errors.filter((message) =>
    !message.includes('404 (File not found)') &&
    !message.includes('Failed to load resource') &&
    !message.includes('ERR_CERT_AUTHORITY_INVALID'),
  );

  if (relevantErrors.length) throw new Error(relevantErrors.join('\n'));
  console.log(`Prueba de navegador superada: ${JSON.stringify(checks)}`);
  await context.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
});
