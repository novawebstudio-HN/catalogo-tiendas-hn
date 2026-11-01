// Corre los extractores, guarda los datos crudos y genera site/catalog.json, el historial de
// precios (data/history.json) y los detalles por categoría (site/details/*.json).
// Si una tienda falla, se conserva su último archivo crudo para no vaciar el catálogo.
// Uso: node src/scrape.mjs [tienda ...]   (sin argumentos corre todas; "none" no consulta ninguna)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { scrapeJetstereo } from './stores/jetstereo.mjs';
import { scrapeDiunsa } from './stores/diunsa.mjs';
import { scrapeCuracao } from './stores/curacao.mjs';
import { scrapeElektra } from './stores/elektra.mjs';
import { scrapeLadyLee } from './stores/ladylee.mjs';
import { scrapeWalmart } from './stores/walmart.mjs';
import { scrapeGallo } from './stores/gallo.mjs';
import { scrapeRadioShack } from './stores/radioshack.mjs';
import { scrapeTropigas } from './stores/tropigas.mjs';
import { scrapeAcosa } from './stores/acosa.mjs';
import { scrapeGameStation } from './stores/gamestation.mjs';
import { scrapeSycom } from './stores/sycom.mjs';
import { buildCatalog } from './build.mjs';
import { loadHistory, updateHistory, applyStats, writeDetails, saveHistory } from './history.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const politeFetch = (url, opts = {}) => fetch(url, {
  ...opts,
  headers: { 'User-Agent': UA, Accept: 'application/json, text/html;q=0.9, */*;q=0.8', 'Accept-Language': 'es-HN,es;q=0.9', ...(opts.headers || {}) },
  signal: AbortSignal.timeout(30000),
});

const SCRAPERS = {
  jetstereo: scrapeJetstereo, diunsa: scrapeDiunsa, curacao: scrapeCuracao, elektra: scrapeElektra,
  ladylee: scrapeLadyLee, walmart: scrapeWalmart, gallo: scrapeGallo, radioshack: scrapeRadioShack,
  tropigas: scrapeTropigas, acosa: scrapeAcosa, gamestation: scrapeGameStation, sycom: scrapeSycom,
};
const NOTES = {
  curacao: 'Cobertura parcial: primeros productos de cada categoría.',
  radioshack: 'Cobertura parcial: primeros productos de cada categoría.',
  tropigas: 'Cobertura parcial: primeros productos de cada categoría.',
  jetstereo: 'Precios de una captura manual desde Honduras.',
  acosa: 'Precios de una captura manual desde Honduras.',
};

const readJson = async (p, fallback) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; } };
// Jetstereo: usar la foto en tamaño completo en vez de la versión reducida de 350 px.
const fullImg = (u) => String(u || '').replace(/\/images\/cache\/(.+?)-\d+x\d+(\.\w+)$/, '/images/$1$2');
// Acepta el archivo aunque el navegador lo haya renombrado ("jetstereo (1).json"): se usa la captura más reciente.
const loadManual = async (id) => {
  let files = [];
  try { files = (await readdir('data/manual')).filter((f) => f.toLowerCase().startsWith(id) && f.toLowerCase().endsWith('.json')); } catch {}
  let manual = null;
  for (const f of files) {
    const m = await readJson(`data/manual/${f}`, null);
    if (m?.items?.length && (!manual || String(m.captured) > String(manual.captured))) manual = m;
  }
  if (!manual) return null;
  return { captured: manual.captured, items: manual.items.map((p) => ({ ...p, store: id, img: fullImg(p.img) })) };
};

const only = process.argv.slice(2);
await mkdir('data/raw', { recursive: true });
const status = await readJson('data/status.json', {});
const raw = {};

for (const [id, fn] of Object.entries(SCRAPERS)) {
  const file = `data/raw/${id}.json`;
  if (only.length && !only.includes(id)) {
    raw[id] = await readJson(file, []);
    if (!raw[id].length) { const m = await loadManual(id); if (m) raw[id] = m.items; }
    continue;
  }
  const t0 = Date.now();
  try {
    const items = await fn({ fetch: politeFetch, prev: await readJson(file, []) });
    if (!items.length) throw new Error('0 productos');
    raw[id] = items;
    await writeFile(file, JSON.stringify(items));
    status[id] = { ok: true, updated: new Date().toISOString(), count: items.length, note: NOTES[id] || '' };
    console.log(`✓ ${id}: ${items.length} productos en ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } catch (e) {
    // Detalle de errores de red (certificados, conexión cortada, etc.) para diagnosticar.
    if (e.cause) e.message = `${e.message} (${e.cause.code || ''} ${e.cause.message || ''})`.trim();
    // Captura manual (data/manual/<tienda>.json): se usa cuando la tienda bloquea la consulta automática.
    const m = await loadManual(id);
    if (m) {
      raw[id] = m.items;
      status[id] = { ok: true, manual: true, updated: m.captured, count: m.items.length, note: NOTES[id] || '' };
      console.log(`↺ ${id}: ${e.message || e}; se usa la captura manual del ${m.captured} (${m.items.length} productos)`);
    } else {
      raw[id] = await readJson(file, []);
      status[id] = { ...(status[id] || {}), ok: false, error: String(e.message || e), note: NOTES[id] || '' };
      console.log(`✗ ${id}: ${e.message || e} (se conservan ${raw[id].length} productos anteriores)`);
    }
  }
}

await writeFile('data/status.json', JSON.stringify(status, null, 2));
const catalog = buildCatalog(raw, status);

const hist = await loadHistory();
updateHistory(hist, catalog);
applyStats(hist, catalog);
await writeDetails(catalog, hist);
await saveHistory(hist);

await writeFile('site/catalog.json', JSON.stringify(catalog));
const multi = catalog.products.filter((p) => p.o.length > 1).length;
const byStore = Object.entries(catalog.stores).map(([id, s]) => `${id} ${s.count}`).join(', ');
console.log(`Catálogo: ${catalog.products.length} productos, ${multi} en 2+ tiendas. (${byStore})`);
