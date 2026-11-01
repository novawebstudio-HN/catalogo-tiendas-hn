// Genera dist/vitrina.html: la página con el catálogo incrustado, en un solo archivo.
// Pensado para publicarse como artifact de Claude: sin <html>/<head>/<body> propios y
// sin imágenes externas (ese entorno solo permite imágenes incrustadas).
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const html = await readFile('site/index.html', 'utf8');
const catalog = await readFile('site/catalog.json', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const inline = `<script>window.__NOIMG__=true;window.__CATALOG__=${catalog.replace(/</g, '\\u003c')};</script>`;
await mkdir('dist', { recursive: true });
await writeFile('dist/vitrina.html', `${head.trim()}\n${inline}\n${body.trim()}\n`);
console.log('dist/vitrina.html listo');
