// Elektra Honduras — VTEX. API pública de catálogo.
import { vtexDetails } from './vtex.mjs';
import { catFromName } from '../classify.mjs';

const BASE = 'https://www.elektra.com.hn';

// id de categoría VTEX -> categoría propia. La consulta incluye las subcategorías, así que se usan las
// categorías padre (los productos a veces están solo en el padre) y se afina por nombre donde hace falta.
const MAP = {
  112: 'celulares', 99: 'laptops', 105: 'tablets', 28: 'televisores', 26: 'consolas',
  108: 'audifonos', 111: 'smartwatches', 88: 'accesorios', 109: 'accesorios', 110: 'accesorios',
  100: 'impresoras', 103: 'monitores', 50: 'freidoras', 54: 'microondas', 33: 'licuadoras',
  19: 'audio', 69: 'refrigeradoras', 64: 'lavadoras', 58: 'estufas', 38: 'aires', 1: 'camas', 122: 'motos',
  47: 'name', 131: 'name', // Electrodomésticos y "Sin categoría": según el nombre
};
// Categorías amplias donde el nombre decide (audífonos dentro de audio, secadoras, etc.).
const BY_NAME = new Set([19, 47, 64, 131]);

export async function scrapeElektra({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const tree = await (await fetch(`${BASE}/api/catalog_system/pub/category/tree/3`)).json();
  const paths = {};
  const walk = (n, p) => { const path = `${p}${n.id}/`; paths[n.id] = path; (n.children || []).forEach((c) => walk(c, path)); };
  tree.forEach((c) => walk(c, '/'));

  const out = [];
  const seen = new Set();
  for (const [id, cat0] of Object.entries(MAP)) {
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
        const cat = BY_NAME.has(Number(id)) ? (catFromName(p.productName) || (cat0 === 'name' ? null : cat0)) : cat0;
        if (!cat) continue;
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
