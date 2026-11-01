// Diunsa — API propia (apicsm.dapplications.tech) que usa su sitio Angular.
import { htmlToText } from './acosa.mjs';

const API = 'https://apicsm.dapplications.tech/api/em/material/paginate';
const SITE = 'https://www.diunsa.hn';
const IMG = 'https://imgcdn.dapplications.tech/';

const MAP = {
  271: 'celulares', 275: 'laptops', 279: 'tablets', 103: 'televisores', 121: 'audio', 284: 'consolas',
  246: 'refrigeradoras', 247: 'lavadoras', 248: 'lavadoras', 249: 'estufas', 250: 'estufas',
  254: 'microondas', 266: 'aires', 1003: 'camas', 329: 'freidoras',
  318: 'monitores', 281: 'impresoras', 1024: 'smartwatches', 1025: 'audifonos', 280: 'videojuegos',
  317: 'accesorios', 199: 'accesorios', 333: 'licuadoras', 336: 'licuadoras', 327: 'licuadoras',
  370: 'motos', 371: 'motos',
};

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const body = (groupCode) => JSON.stringify({
  businessPartner: 1, storeId: null, groupCode: String(groupCode), officeCode: '0', type: 'PD',
  sortBy: 'brand', sortOption: 'ASC', search: '',
  filter: { priceMin: null, priceMax: null, brand: null, supplier: null },
  source: 'WEB', hidden: '0', isToLiquidation: null, userIsAhorroMas: '0',
});

export async function scrapeDiunsa({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  for (const [code, cat] of Object.entries(MAP)) {
    for (let skip = 0; skip < 3000; skip += 60) {
      const res = await fetch(`${API}?skip=${skip}&take=60`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE, Referer: `${SITE}/` }, body: body(code),
      });
      if (!res.ok) throw new Error(`Diunsa ${code} HTTP ${res.status}`);
      const j = await res.json();
      for (const p of j.data || []) {
        const price = Number(p.newPrice || 0);
        if (!price) continue;
        // Vehículos y otros subgrupos fuera de alcance.
        if (cat !== 'motos' && /vehicul|carro|moto/i.test(p.materialGroupName || '')) continue;
        const num = parseInt(String(p.code || '').split('-').pop(), 10);
        const pics = (p.images || []).filter((im) => im.active !== 0 && Number(im.idDelete || 0) === 0)
          .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999))
          .map((im) => im.fileLink || (im.fileName ? IMG + im.fileName : ''))
          .filter(Boolean);
        out.push({
          store: 'diunsa', cat, brand: p.brandName || '', name: p.name || '',
          price, regular: Number(p.oldPrice || price),
          available: Number(p.stock ?? p.availibilityCount ?? 1) > 0,
          url: `${SITE}/${slug(p.materialGroupName)}/${slug(p.name)}-${num}`,
          img: pics[0] || '', alts: pics.slice(1, 5),
          sku: String(p.externalKeys?.code || ''), model: String(p.nameAlias || ''), barcode: String(p.barcode || ''),
          desc: typeof p.content === 'string' ? htmlToText(p.content).slice(0, 900) : '',
          specs: Array.isArray(p.specs) ? p.specs.map((x) => [x.name || x.label || x.key, x.value]).filter(([k, v]) => k && v).slice(0, 16) : [],
        });
      }
      if (!j.next) break;
      await sleep(350);
    }
  }
  return out;
}
