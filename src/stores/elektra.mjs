// Elektra Honduras — VTEX. API pública de catálogo.
import { vtexDetails } from './vtex.mjs';

const BASE = 'https://www.elektra.com.hn';

// id de categoría VTEX -> categoría propia
const MAP = {
  112: 'celulares', 99: 'laptops', 105: 'tablets', 28: 'televisores',
  21: 'audio', 22: 'audio', 24: 'audio', 25: 'audio', 26: 'consolas',
  70: 'refrigeradoras', 71: 'refrigeradoras', 65: 'lavadoras', 66: 'lavadoras', 67: 'lavadoras',
  59: 'estufas', 61: 'estufas', 54: 'microondas', 39: 'aires', 40: 'aires',
  3: 'camas', 4: 'camas', 5: 'camas', 6: 'camas', 7: 'camas', 8: 'camas', 50: 'freidoras',
  100: 'impresoras', 103: 'monitores', 108: 'audifonos', 111: 'smartwatches',
  88: 'accesorios', 109: 'accesorios', 110: 'accesorios', 34: 'licuadoras', 48: 'licuadoras', 53: 'licuadoras',
  123: 'motos', 124: 'motos', 125: 'motos', 126: 'motos', 127: 'motos', 128: 'motos',
};

export async function scrapeElektra({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const tree = await (await fetch(`${BASE}/api/catalog_system/pub/category/tree/3`)).json();
  const paths = {};
  const walk = (n, p) => { const path = `${p}${n.id}/`; paths[n.id] = path; (n.children || []).forEach((c) => walk(c, path)); };
  tree.forEach((c) => walk(c, '/'));

  const out = [];
  const seen = new Set();
  for (const [id, cat] of Object.entries(MAP)) {
    if (!paths[id]) continue;
    for (let from = 0; from < 2500; from += 50) {
      const url = `${BASE}/api/catalog_system/pub/products/search?fq=C:${paths[id]}&_from=${from}&_to=${from + 49}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const list = await res.json();
      for (const p of list) {
        const item = p.items?.[0];
        const offer = item?.sellers?.[0]?.commertialOffer;
        if (!offer || !offer.Price || seen.has(p.productId)) continue;
        seen.add(p.productId);
        const d = vtexDetails(p);
        out.push({
          store: 'elektra', cat, brand: p.brand || '', name: p.productName || '',
          price: offer.Price, regular: offer.ListPrice || offer.Price,
          available: (offer.AvailableQuantity ?? 1) > 0,
          url: p.link || `${BASE}/${p.linkText}/p`,
          img: d.img, alts: d.alts, desc: d.desc, specs: d.specs,
          sku: String(p.productReference || item.itemId || ''), model: '',
        });
      }
      if (list.length < 50) break;
      await sleep(400);
    }
  }
  return out;
}
