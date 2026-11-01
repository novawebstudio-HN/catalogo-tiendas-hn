// Captura de Jetstereo desde una computadora en Honduras (no desde la nube).
// Se identifica de forma transparente, va a ritmo pausado y guarda data/manual/jetstereo.json,
// que la actualización diaria de GitHub usa cuando la consulta desde la nube es rechazada.
import { writeFile, mkdir } from 'node:fs/promises';
import { scrapeJetstereo } from './stores/jetstereo.mjs';

const UA = 'VitrinaHN/1.0 (comparador de precios; +https://github.com/novawebstudio-HN/catalogo-tiendas-hn)';
const fetchHonest = (url, opts = {}) => fetch(url, {
  ...opts, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts.headers || {}) }, signal: AbortSignal.timeout(30000),
});

const items = await scrapeJetstereo({ fetch: fetchHonest, sleep: (ms) => new Promise((r) => setTimeout(r, ms * 3)) });
if (!items.length) throw new Error('Jetstereo no devolvió productos');
await mkdir('data/manual', { recursive: true });
await writeFile('data/manual/jetstereo.json', JSON.stringify({ captured: new Date().toISOString(), source: 'mac', items }));
console.log(`Jetstereo: ${items.length} productos guardados en data/manual/jetstereo.json`);
