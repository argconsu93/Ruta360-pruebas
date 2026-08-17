import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const context = vm.createContext({ console, Map, Set, Math, String, Number, Array, Object, Date });
const sources = ['js/01-core.js', 'js/06-routing.js']
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

new vm.Script(sources, { filename: 'ruta360-domain.js' }).runInContext(context);

const evaluate = (expression) => vm.runInContext(expression, context);

assert.ok(!/pass\s*:\s*['"][^'"]+['"]/.test(sources), 'No debe haber contraseñas embebidas');
assert.equal(evaluate('appState.rawClientes.length'), 0);
assert.equal(evaluate('appState.usuarioActual'), null);
assert.equal(evaluate("appState.diaSeleccionado"), 'TODOS');
evaluate("appState.rawClientes.push({ codigo: 'QA-STATE' })");
assert.equal(evaluate('appState.rawClientes[0].codigo'), 'QA-STATE');
assert.equal(evaluate('crearEstadoInicial().rawClientes.length'), 0, 'El estado inicial no debe compartir arreglos mutados');

assert.equal(evaluate("normalizarTexto('  División ÁÉÍÓÚ Ñ  ')"), 'division aeiou n');
assert.equal(evaluate("normalizarNombreGrupo('GRUPO_07')"), 'GRUPO 07');
assert.equal(evaluate("normalizarNombreGrupo('sin grupo')"), 'Sin Grupo');
assert.equal(evaluate("parsearFloatSeguro('13,7012')"), 13.7012);
assert.equal(evaluate("parsearFloatSeguro('no-numero')"), null);
assert.equal(
  evaluate("escapeHTML('<img src=x onerror=alert(1)> & \\\"texto\\\"')"),
  '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;texto&quot;',
);

assert.equal(evaluate("coincidePais('el salvador', { _paisNorm: 'sv' })"), true);
assert.equal(evaluate("coincideDivision('SV Centro', { division: 'Centro' })"), true);
assert.equal(evaluate("coincideGrupo('GRUPO 04', { grupo: 'GRUPO_04' })"), true);
assert.equal(evaluate("coincideRuta('r-101', { ruta: 'R-101' })"), true);
assert.equal(evaluate("coincideDia('miercoles', { _diaNorm: '3' })"), true);

const zeroDistance = evaluate('calcularDistancia(13.7, -89.2, 13.7, -89.2)');
assert.equal(zeroDistance, 0);
const knownDistance = evaluate('calcularDistancia(13.6929, -89.2182, 14.6349, -90.5069)');
assert.ok(knownDistance > 170 && knownDistance < 190, `Distancia inesperada: ${knownDistance}`);

assert.equal(evaluate('formatearMinutosAHorasMinutos(135)'), '2h 15m');
assert.equal(evaluate('formatearMinutosAHora12(0)'), '12:00 AM');
assert.equal(evaluate('formatearMinutosAHora12(13 * 60 + 5)'), '01:05 PM');

const optimizedCodes = evaluate(`
  optimizarSecuenciaSweep2OPT(
    [
      { codigo: 'A', lat: 13.70, lng: -89.20 },
      { codigo: 'B', lat: 13.71, lng: -89.21 },
      { codigo: 'C', lat: 13.69, lng: -89.19 }
    ],
    { lat: 13.695, lng: -89.195 }
  ).map((cliente) => cliente.codigo).sort().join(',')
`);
assert.equal(optimizedCodes, 'A,B,C');

console.log('Pruebas unitarias superadas');
