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

const body = (groupCode, search = '') => JSON.stringify({
  businessPartner: 1, storeId: null, groupCode: String(groupCode), officeCode: '0', type: 'PD',
  sortBy: 'brand', sortOption: 'ASC', search,
  filter: { priceMin: null, priceMax: null, brand: null, supplier: null },
  source: 'WEB', hidden: '0', isToLiquidation: null, userIsAhorroMas: '0',
});

// Algunos productos están asignados a la categoría general (por ejemplo "Electrodomésticos") y no
// aparecen en la específica; se completan con el buscador del sitio, aceptando solo nombres que
// correspondan a la categoría.
const SEARCHES = [
  ['aire acondicionado', 'aires', /\b(aire|minisplit|mini split)\b/i], ['minisplit', 'aires', /\b(aire|minisplit|mini split)\b/i],
  ['refrigeradora', 'refrigeradoras', /refrigerad|congelador|freezer|frigobar/i], ['congelador', 'refrigeradoras', /congelador|freezer/i],
  ['lavadora', 'lavadoras', /\blavadora|centro de lavado/i], ['secadora', 'lavadoras', /\bsecadora\b(?!.*(cabello|pelo|mano))/i],
  ['estufa', 'estufas', /\bestufa\b/i], ['microondas', 'microondas', /microondas/i],
  ['televisor', 'televisores', /\b(tv|televisor|pantalla)\b/i], ['smart tv', 'televisores', /\b(tv|televisor|pantalla)\b/i],
  ['celular', 'celulares', /\b(celular|smartphone)\b/i], ['laptop', 'laptops', /\b(laptop|notebook)\b/i],
  ['tablet', 'tablets', /\b(tablet|ipad)\b/i], ['monitor', 'monitores', /\bmonitor\b/i], ['impresora', 'impresoras', /\b(impresora|multifuncional)\b/i],
  ['consola', 'consolas', /\bconsola\b/i], ['freidora', 'freidoras', /freidora/i],
  ['licuadora', 'licuadoras', /licuadora/i], ['cafetera', 'licuadoras', /cafetera|percolador/i],
  ['bocina', 'audio', /bocina|parlante/i], ['barra de sonido', 'audio', /barra de sonido/i],
  ['audifonos', 'audifonos', /aud[ií]fono|auricular|earbuds/i], ['reloj inteligente', 'smartwatches', /reloj inteligente|smartwatch|smart watch|smartband/i],
  ['colchon', 'camas', /\b(colch[oó]n|cama|box spring)\b/i],
];

function toItem(p, cat) {
  const price = Number(p.newPrice || 0);
  if (!price) return null;
  const num = parseInt(String(p.code || '').split('-').pop(), 10);
  const pics = (p.images || []).filter((im) => im.active !== 0 && Number(im.idDelete || 0) === 0)
    .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999))
    .map((im) => im.fileLink || (im.fileName ? IMG + im.fileName : ''))
    .filter(Boolean);
  return {
    store: 'diunsa', cat, brand: p.brandName || '', name: p.name || '',
    price, regular: Number(p.oldPrice || price),
    available: Number(p.stock ?? p.availibilityCount ?? 1) > 0,
    url: `${SITE}/${slug(p.materialGroupName)}/${slug(p.name)}-${num}`,
    img: pics[0] || '', alts: pics.slice(1, 5),
    sku: String(p.externalKeys?.code || ''), model: String(p.nameAlias || ''), barcode: String(p.barcode || ''),
    desc: typeof p.content === 'string' ? htmlToText(p.content).slice(0, 900) : '',
    specs: Array.isArray(p.specs) ? p.specs.map((x) => [x.name || x.label || x.key, x.value]).filter(([k, v]) => k && v).slice(0, 16) : [],
  };
}

export async function scrapeDiunsa({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  const pages = async (code, search, onItem) => {
    for (let skip = 0; skip < 3000; skip += 60) {
      const res = await fetch(`${API}?skip=${skip}&take=60`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE, Referer: `${SITE}/` }, body: body(code, search),
      });
      if (!res.ok) throw new Error(`Diunsa ${code} ${search} HTTP ${res.status}`);
      const j = await res.json();
      for (const p of j.data || []) onItem(p);
      if (!j.next) break;
      await sleep(350);
    }
  };
  for (const [code, cat] of Object.entries(MAP)) {
    await pages(code, '', (p) => {
      // Vehículos y otros subgrupos fuera de alcance.
      if (cat !== 'motos' && /vehicul|carro|moto/i.test(p.materialGroupName || '')) return;
      if (seen.has(p.code)) return;
      const it = toItem(p, cat);
      if (it) { seen.add(p.code); out.push(it); }
    });
  }
  let extra = 0;
  for (const [q, cat, re] of SEARCHES) {
    await pages('0', q, (p) => {
      if (seen.has(p.code) || !re.test(p.name || '') || /vehicul|carro|moto|repuesto|accesorio/i.test(p.materialGroupName || '')) return;
      const it = toItem(p, cat);
      if (it) { seen.add(p.code); out.push(it); extra++; }
    });
    await sleep(350);
  }
  console.log(`  Diunsa: ${extra} productos extra encontrados con el buscador`);
  return out;
}
