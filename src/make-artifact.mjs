// Genera dist/vitrina.html: la página con el catálogo incrustado (un solo archivo, sin servidor).
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const html = await readFile('site/index.html', 'utf8');
const catalog = await readFile('site/catalog.json', 'utf8');
const inline = `<script>window.__CATALOG__=${catalog.replace(/</g, '\\u003c')};</script>`;
await mkdir('dist', { recursive: true });
await writeFile('dist/vitrina.html', html.replace('<script>\n(async function(){', `${inline}\n<script>\n(async function(){`));
console.log('dist/vitrina.html listo');
