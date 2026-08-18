# Ruta360 — versión modular de pruebas

Esta rama conserva el comportamiento del archivo estable, pero separa presentación, estilos y lógica por responsabilidades.

## Estructura

- `index.html`: estructura de la interfaz.
- `css/styles.css`: estilos.
- `js/01-core.js`: configuración, estado compartido y utilidades básicas.
- `js/02-data.js`: carga y normalización de datos.
- `js/03-map.js`: mapa, capas, marcadores y geocercas.
- `js/04-visits.js`: registro y edición de visitas.
- `js/05-filters.js`: filtros, tablas y KPI.
- `js/06-routing.js`: optimización, simulación y Google Maps.
- `js/07-session-export.js`: sesión, notificaciones y exportaciones.
- js/08-bootstrap.js: único punto de entrada, eventos e inicialización.
- `tests/structure.test.mjs`: comprobaciones de sintaxis, orden y estructura.

## Validación

Requiere Node.js 20 o posterior:

```bash
npm install
npm test
```

Para probar la aplicación, debe servirse por HTTP; abrir `index.html` con `file://` impedirá cargar CSV y GeoJSON por las restricciones del navegador.

```bash
python3 -m http.server 8000
```

Después, abrir `http://localhost:8000`.

Con el servidor activo, la prueba de integración en navegador se ejecuta con:

```bash
npm run test:browser
```

Cada `push` y pull request ejecuta estas comprobaciones automáticamente mediante GitHub Actions.

## Estado de la aplicación

El estado mutable compartido vive en appState, creado por crearEstadoInicial(). Los archivos JavaScript son módulos ES con importaciones y exportaciones explícitas; el navegador carga únicamente js/08-bootstrap.js, que resuelve el resto del grafo de dependencias.
