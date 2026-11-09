// Preparación para Vercel · Black Days Akira Travel
// --------------------------------------------------
// Vercel ejecuta este archivo en cada publicación (npm run build).
// Toma src/Main.dc.html (copia exacta del lienzo de Claude) y genera dist/:
//   - dist/index.html  → la landing lista para el navegador
//   - dist/assets/     → solo las imágenes que la landing usa
//   - dist/runtime/    → el motor que interpreta el formato del lienzo
// No cambia diseño ni contenido. Si falta una imagen o el archivo no tiene el
// formato esperado, la publicación se detiene con un mensaje claro (así nunca
// se publica una landing rota).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const fail = (msg) => { console.error('\n✖ ' + msg + '\n'); process.exit(1); };

// Datos para buscadores y redes (no aparecen en el diseño)
const SITE = {
  title: 'Black Days 2026 · Akira Travel',
  description: 'Promociones Black Days de Akira Travel para agencias de viajes: Europa, Tailandia y Turquía. Del 9 al 27 de noviembre de 2026.',
};

let html = fs.readFileSync(path.join(SRC, 'Main.dc.html'), 'utf8');

// 1. Imágenes: el lienzo las nombra /_blob/<id>; aquí viven en src/assets/<id>.<ext>
const files = fs.readdirSync(path.join(SRC, 'assets'));
const byId = Object.fromEntries(files.map((f) => [f.split('.')[0], f]));
const used = [...new Set([...html.matchAll(/\/_blob\/([0-9a-f]{32})/g)].map((m) => m[1]))];
const missing = used.filter((id) => !byId[id]);
if (missing.length) fail('Faltan imágenes en src/assets/: ' + missing.join(', ') + '\nDescárgalas del Artifact antes de publicar.');
html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (_, id) => 'assets/' + byId[id]);

// 2. Motor + metadatos (reemplaza la línea de soporte del lienzo)
const SUPPORT = '<script src="./support.js"></script>';
if (html.split(SUPPORT).length !== 2) fail('No se encontró la línea de soporte del lienzo en Main.dc.html.');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
html = html.replace(SUPPORT, [
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  `<meta name="description" content="${esc(SITE.description)}">`,
  `<meta property="og:title" content="${esc(SITE.title)}">`,
  `<meta property="og:description" content="${esc(SITE.description)}">`,
  '<meta property="og:type" content="website">',
  '<meta name="theme-color" content="#0A0F2C">',
  '<script src="runtime/preact.min.js" defer></script>',
  '<script src="runtime/support.js" defer></script>',
].join('\n'));

// 3. La plantilla del lienzo va dentro de <template> para que el navegador no la muestre cruda
if (html.split('<x-dc>').length !== 2 || html.split('</x-dc>').length !== 2) fail('Main.dc.html debe tener exactamente un bloque <x-dc>.');
html = html.replace('<x-dc>', '<template id="dc-source"><x-dc>').replace('</x-dc>', '</x-dc></template>');

// 4. Escribir dist/
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'runtime'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
for (const id of used) fs.copyFileSync(path.join(SRC, 'assets', byId[id]), path.join(DIST, 'assets', byId[id]));
for (const f of ['support.js', 'preact.min.js']) fs.copyFileSync(path.join(ROOT, 'runtime', f), path.join(DIST, 'runtime', f));

// 5. Resumen en el registro de Vercel
const data = html.match(/data\(\) \{ return (\[.*\]); \}/);
let resumen = '';
if (data) {
  const programas = JSON.parse(data[1]);
  const porDestino = {};
  programas.forEach((p) => { porDestino[p.destino] = (porDestino[p.destino] || 0) + 1; });
  resumen = `${programas.length} programas (` + Object.entries(porDestino).map(([d, n]) => `${d}: ${n}`).join(', ') + ')';
}
const unused = files.filter((f) => !used.includes(f.split('.')[0]));
console.log(`✔ Landing preparada en dist/ · ${resumen} · ${used.length} imágenes` + (unused.length ? ` · ${unused.length} sin usar (no se publican)` : ''));
