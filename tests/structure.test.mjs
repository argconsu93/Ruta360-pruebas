import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const expectedScripts = Array.from({ length: 8 }, (_, index) =>
  `js/${String(index + 1).padStart(2, '0')}-${[
    'core', 'data', 'map', 'visits', 'filters', 'routing', 'session-export', 'bootstrap',
  ][index]}.js`,
);

const loadedScripts = [...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map((match) => match[1]);
assert.deepEqual(loadedScripts, expectedScripts, 'Los módulos deben cargarse en el orden original');

for (const relativePath of expectedScripts) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  new vm.Script(source, { filename: relativePath });
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'No debe haber IDs HTML duplicados');
assert.ok(html.includes('css/styles.css'), 'El HTML debe cargar el CSS separado');
assert.ok(!html.includes('<style>'), 'El HTML no debe contener CSS embebido');
assert.ok(!html.includes('http://{s}.google.com'), 'Las teselas no deben cargarse por HTTP');
assert.ok(!/\son[a-z]+=/i.test(html), 'El HTML no debe contener manejadores de eventos inline');

const applicationSource = expectedScripts
  .map((relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8'))
  .join('\n');
assert.ok(!/<button[^>]+onclick=/i.test(applicationSource), 'Los templates no deben generar onclick inline');
assert.ok(applicationSource.includes('const appState = crearEstadoInicial()'), 'Debe existir un estado centralizado');
assert.ok(!/\blet\s+(rawClientes|usuarioActual|diaSeleccionado|simIntervalId)\b/.test(applicationSource), 'No deben reaparecer estados globales independientes');
assert.ok(!/getElementById\(['"][^'"]*appState\./.test(applicationSource), 'La refactorización no debe modificar IDs literales');
assert.ok(!/L\.map\(['"]appState\./.test(applicationSource), 'La refactorización no debe modificar el ID del mapa');
assert.ok(!/fa-appState\./.test(applicationSource), 'La refactorización no debe modificar clases de iconos');

console.log('Pruebas estructurales superadas');
