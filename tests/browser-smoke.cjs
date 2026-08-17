const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
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
    ].join('\n'),
  }));

  await page.route('**/data/usuarios.csv*', (route) => route.fulfill({
    contentType: 'text/csv; charset=utf-8',
    body: 'Nombres,Roles,Pais,Division,Grupo,Contraseña\nUsuario QA,Administrador,TODOS,TODOS,TODOS,prueba',
  }));

  await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);

  const checks = {
    title: await page.title(),
    loginVisible: await page.locator('#login-modal').isVisible(),
    hasMapContainer: (await page.locator('#map').count()) === 1,
    modulesLoaded: await page.evaluate(() => typeof seleccionarPais === 'function' && typeof aplicarFiltros === 'function'),
  };

  if (checks.title !== 'Ruta360 - Regional - Bocadeli') throw new Error(`Título inesperado: ${checks.title}`);
  if (!checks.loginVisible || !checks.hasMapContainer || !checks.modulesLoaded) {
    throw new Error(`Fallo de integración: ${JSON.stringify(checks)}`);
  }

  await page.locator('[data-action="regional-access"]').click();
  await page.locator('#select-usuario-login').selectOption({ label: 'Usuario QA (Administrador - TODOS)' });
  await page.locator('#input-password').fill('prueba');
  await page.locator('#btn-login').click();
  await page.locator('#login-modal').waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);

  const authenticatedChecks = {
    mapInitialized: await page.locator('#map.leaflet-container').isVisible(),
    countryFilterEnabled: await page.locator('#select-pais').isEnabled(),
    clientRows: await page.locator('#tabla-clientes-body tr').count(),
  };

  if (!authenticatedChecks.mapInitialized || !authenticatedChecks.countryFilterEnabled || authenticatedChecks.clientRows < 1) {
    throw new Error(`Fallo después del login: ${JSON.stringify(authenticatedChecks)}`);
  }

  const relevantErrors = errors.filter((message) =>
    !message.includes('404 (File not found)') &&
    !message.includes('Failed to load resource') &&
    !message.includes('ERR_CERT_AUTHORITY_INVALID'),
  );

  if (relevantErrors.length) throw new Error(relevantErrors.join('\n'));
  console.log(`Prueba de navegador superada: ${JSON.stringify(checks)}`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
