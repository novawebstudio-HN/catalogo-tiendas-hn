// Corre los 4 extractores, guarda los datos crudos y genera data/catalog.json.
// Si una tienda falla, se conserva su último archivo crudo para no vaciar el catálogo.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { scrapeJetstereo } from './stores/jetstereo.mjs';
import { scrapeDiunsa } from './stores/diunsa.mjs';
import { scrapeCuracao } from './stores/curacao.mjs';
import { scrapeElektra } from './stores/elektra.mjs';
import { buildCatalog } from './build.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const politeFetch = (url, opts = {}) => fetch(url, {
  ...opts,
  headers: { 'User-Agent': UA, Accept: 'application/json, text/html;q=0.9, */*;q=0.8', 'Accept-Language': 'es-HN,es;q=0.9', ...(opts.headers || {}) },
  signal: AbortSignal.timeout(30000),
});

const SCRAPERS = { jetstereo: scrapeJetstereo, diunsa: scrapeDiunsa, curacao: scrapeCuracao, elektra: scrapeElektra };
const NOTES = {
  curacao: 'Cobertura parcial: primeros productos de cada categoría (su API de listado es solo para su sitio).',
  jetstereo: 'Su servidor rechaza consultas automáticas desde la nube (HTTP 403), por eso no se actualiza a diario.',
};

const readJson = async (p, fallback) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; } };

const only = process.argv.slice(2);
await mkdir('data/raw', { recursive: true });
const status = await readJson('data/status.json', {});
const raw = {};

for (const [id, fn] of Object.entries(SCRAPERS)) {
  const file = `data/raw/${id}.json`;
  if (only.length && !only.includes(id)) { raw[id] = await readJson(file, []); continue; }
  const t0 = Date.now();
  try {
    const items = await fn({ fetch: politeFetch });
    if (!items.length) throw new Error('0 productos');
    raw[id] = items;
    await writeFile(file, JSON.stringify(items));
    status[id] = { ok: true, updated: new Date().toISOString(), count: items.length, note: NOTES[id] || '' };
    console.log(`✓ ${id}: ${items.length} productos en ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } catch (e) {
    raw[id] = await readJson(file, []);
    status[id] = { ...(status[id] || {}), ok: false, error: String(e.message || e), note: NOTES[id] || 'Sin actualizar en la última corrida; se muestran los datos anteriores.' };
    console.log(`✗ ${id}: ${e.message || e} (se conservan ${raw[id].length} productos anteriores)`);
  }
}

await writeFile('data/status.json', JSON.stringify(status, null, 2));
const catalog = buildCatalog(raw, status);
await writeFile('site/catalog.json', JSON.stringify(catalog));
const multi = catalog.products.filter((p) => p.o.length > 1).length;
console.log(`Catálogo: ${catalog.products.length} productos, ${multi} en 2+ tiendas.`);
