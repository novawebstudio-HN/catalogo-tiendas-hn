// El Gallo más Gallo Honduras (Grupo Monge) — Magento 2. Su robots.txt no permite URLs con
// parámetros (?p=2), así que se leen: (1) las páginas de categoría y subcategoría del sitemap,
// que traen 12 productos cada una como datos estructurados (JSON-LD), y (2) la página de
// cada producto del sitemap que no apareció en ellas.
import { brandFromName } from './unicomer.mjs';
import { htmlToText } from './acosa.mjs';

const SITE = 'https://www.elgallomasgallo.com.hn';
const SITEMAP = `${SITE}/media/sitemap_tienda_el_gallo_hn-urls.xml`;

// Clasificación por el texto del producto (slug o nombre). Primera coincidencia gana.
const RULES = [
  [/consola/, 'consolas'],
  [/celular|smartphone/, 'celulares'],
  [/tablet|ipad/, 'tablets'],
  [/laptop|notebook|computadora-portatil/, 'laptops'],
  [/monitor/, 'monitores'],
  [/impresora|multifuncional/, 'impresoras'],
  [/reloj-inteligente|smartwatch|smart-watch|smartband/, 'smartwatches'],
  [/audifono|auricular/, 'audifonos'],
  [/televisor|pantalla|smart-tv/, 'televisores'],
  [/minicomponente|parlante|bocina|barra-de-sonido|soundbar|teatro-en-casa|equipo-de-sonido|sistema-de-audio/, 'audio'],
  [/refrigerad|congelador|freezer/, 'refrigeradoras'],
  [/lavadora|secadora-de-ropa|secadora-\d|centro-de-lavado|^secadora/, 'lavadoras'],
  [/microondas/, 'microondas'],
  [/estufa|cocina-de-gas|cocina-electrica/, 'estufas'],
  [/aire-acondicionado|aire-inverter|minisplit|mini-split/, 'aires'],
  [/freidora/, 'freidoras'],
  [/licuadora|cafetera|batidora|percolador|procesador-de-alimento/, 'licuadoras'],
  [/motocicleta|cuatrimoto|^moto-/, 'motos'],
  [/^(set-)?cama|colchon|set-de-cama|box-spring/, 'camas'],
];
const classify = (slug) => RULES.find(([re]) => re.test(slug))?.[1] || '';
const RELEVANT_CAT_PATH = /celulares|tablets|computadoras|smartwatch|audio|tv-y-entretenimiento|zona-gamer|refrigeradoras|lavadoras|estufas|hornos|aires|camas-y-colchones|freidoras|licuadoras|cafeteras|motos/;

const lds = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);

function toItem(p, extra = {}) {
  const url = String(p.offers?.url || p['@id'] || '').replace(/#.*$/, '');
  const slug = url.replace(/^.*\//, '');
  const cat = classify(slug) || classify(String(p.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-'));
  const price = Number(p.offers?.price || 0);
  if (!cat || !price || !url) return null;
  const img = String(Array.isArray(p.image) ? p.image[0] : p.image || '').split('?')[0];
  return {
    store: 'gallo', cat, brand: (typeof p.brand === 'object' ? p.brand?.name : p.brand) || brandFromName(p.name || ''), name: String(p.name || '').trim(),
    price, regular: Math.max(price, Number(extra.old || 0)),
    available: !/OutOfStock|SoldOut|Discontinued/i.test(String(p.offers?.availability || '')),
    url, img, sku: String(p.sku || slug.match(/(\d{5,7})$/)?.[1] || ''), model: String(p.model || ''),
    desc: htmlToText(p.description || '').slice(0, 900),
    specs: p.color ? [['Color', String(p.color)]] : [],
  };
}

export async function scrapeGallo({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`Gallo sitemap HTTP ${res.status}`);
  const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const catPages = locs.filter((u) => /\/productos\//.test(u) && RELEVANT_CAT_PATH.test(u));
  const productUrls = locs.filter((u) => /-\d{5,7}$/.test(u) && classify(u.replace(/^.*\//, '')));

  const byUrl = new Map();
  for (const u of catPages) {
    const r = await fetch(u, { headers: { Accept: 'text/html' } });
    if (r.ok) {
      for (const ld of lds(await r.text())) {
        if (ld['@type'] !== 'OfferCatalog') continue;
        for (const p of ld.itemListElement || []) { const it = toItem(p); if (it && !byUrl.has(it.url)) byUrl.set(it.url, it); }
      }
    }
    await sleep(900);
  }
  // Productos que no salieron en las primeras 12 posiciones de su categoría.
  let fetched = 0;
  for (const u of productUrls) {
    if (byUrl.has(u)) continue;
    const r = await fetch(u, { headers: { Accept: 'text/html' } });
    if (!r.ok) { await sleep(900); continue; }
    const html = await r.text();
    const p = lds(html).find((x) => x['@type'] === 'Product');
    const old = html.match(/data-price-type="oldPrice"[^>]*data-price-amount="([\d.]+)"/)?.[1]
      || html.match(/data-price-amount="([\d.]+)"[^>]*data-price-type="oldPrice"/)?.[1];
    const it = p && toItem(p, { old });
    if (it) byUrl.set(it.url, it);
    fetched++;
    await sleep(900);
  }
  console.log(`  Gallo: ${catPages.length} páginas de categoría, ${fetched} páginas de producto`);
  return [...byUrl.values()];
}
