# Informe QA inicial — Ruta360

## Alcance

Revisión estática del archivo estable de 3,658 líneas y segmentación conservadora, manteniendo el orden de ejecución y los nombres públicos usados por los manejadores HTML.

## Hallazgos prioritarios

### Críticos

1. **Autenticación solo del lado cliente.** Los usuarios y contraseñas se descargan desde `data/usuarios.csv` y la validación ocurre en el navegador. Cualquier visitante puede obtener el archivo y eludir el acceso. La solución real requiere autenticación en servidor, contraseñas con hash y autorización por cada recurso.
2. **Datos empresariales expuestos como archivos estáticos.** `clientes.csv`, GeoJSON y archivos Excel están disponibles para quien conozca sus rutas. Deben almacenarse tras una API autenticada o en almacenamiento privado con enlaces temporales.

### Altos

3. **Riesgo de inyección HTML.** Campos procedentes de CSV/GeoJSON se interpolan en `innerHTML` y plantillas de popups/tablas. Un valor manipulado puede ejecutar marcado o JavaScript. Sustituir por `textContent`, creación explícita de nodos o una función de escape centralizada.
4. **Dependencias CDN sin integridad.** Leaflet, MarkerCluster, XLSX, PapaParse y Font Awesome se cargan desde terceros sin `integrity`. Conviene fijarlas localmente o usar SRI y una política CSP.
5. **Servicio público OSRM sin garantías.** La optimización depende de `router.project-osrm.org`; puede aplicar límites, fallar o cambiar. Añadir timeout, reintentos limitados, validación de respuesta y un servicio controlado para producción.
6. **Archivo de clientes cercano a 50 MB.** Se descarga y procesa completamente en el hilo principal, con riesgo de congelar móviles. Migrar a consultas paginadas/filtradas en servidor o procesar con Web Worker.

### Medios

7. **Estado global mutable y acoplamiento al DOM.** Más de treinta variables globales dificultan aislar pruebas y provocan efectos secundarios. La presente segmentación reduce tamaño físico, pero la siguiente fase debe encapsular estado y servicios mediante módulos ES.
8. **Manejadores inline.** `onclick`, `onchange` y `onerror` obligan a exponer funciones globales e impiden una CSP estricta. Tras estabilizar esta versión, mover todos los eventos a `addEventListener`.
9. **Sin persistencia confiable de visitas.** Los mapas de visitas viven en memoria; al recargar se pierden. Persistir en una API transaccional y definir manejo de conflictos/offline.
10. **Uso de caché deshabilitada y parámetro temporal en cada petición.** Aumenta transferencia y tiempos de carga. Versionar archivos estáticos y permitir caché; reservar `no-store` para información sensible.
11. **Errores parcialmente silenciados.** Varias cargas convierten fallos en colecciones vacías, haciendo que la interfaz parezca válida sin datos. Mostrar estado de carga, error recuperable y detalle técnico en consola.
12. **Algoritmo de ruta aproximado.** El barrido y 2-opt usan distancia geodésica antes de consultar OSRM; no garantizan óptimo vial. Documentar la aproximación y validar límites de puntos/URL.

## Correcciones incluidas en esta fase

- Separación del monolito en HTML, CSS y ocho archivos JavaScript por responsabilidad.
- Conservación del orden original de declaraciones y arranque para minimizar regresiones.
- Cambio de las teselas Google de HTTP a HTTPS para evitar contenido mixto.
- Prueba automática de sintaxis JavaScript, orden de carga, IDs duplicados y ausencia de CSS embebido.
- Pruebas unitarias para normalización, filtros, coordenadas, distancias, horarios y optimización.
- Integración continua para ejecutar pruebas estructurales, unitarias y de navegador en cada PR.
- Escape de valores externos en popups, tablas y comparativos para reducir inyección HTML.
- Sustitución de atributos de eventos inline por eventos registrados desde JavaScript.
- Eliminación de las cuentas y contraseñas de respaldo embebidas; la carga de usuarios ahora falla de forma cerrada.
- Centralización del estado mutable en `appState`, con una fábrica que crea colecciones aisladas para las pruebas.
- Documentación de ejecución local y mapa de módulos.

## Siguiente fase recomendada

1. Ejecutar pruebas manuales con los datos reales: acceso por país/división, filtros, geocercas, visita, GPS, optimización, simulación y exportaciones.
2. Incorporar pruebas de navegador con Playwright y datos reducidos de prueba.
3. Eliminar interpolaciones no confiables en `innerHTML`.
4. Convertir gradualmente a módulos ES con un almacén de estado explícito.
5. Diseñar backend para autenticación, autorización, datos de clientes y visitas.
