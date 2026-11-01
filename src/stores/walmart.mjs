// Walmart Honduras — VTEX. API pública de catálogo, igual que Elektra.
import { vtexDetails } from './vtex.mjs';

const BASE = 'https://www.walmart.com.hn';

// ruta de categoría VTEX -> reglas [categoría propia, filtro opcional sobre el nombre]; gana la primera que aplique.
const MAP = [
  ['/13/106/', [['celulares', /celular|smartphone|tel[eé]fono|galaxy|iphone|redmi|honor|motorola|moto /i]]],
  ['/13/106/501/', [['smartwatches', /smartwatch|reloj inteligente|smart ?band|watch/i], ['accesorios', /cargador|cable|power ?bank|bater[ií]a port/i]]],
  ['/13/109/516/', [['laptops']]],
  ['/13/109/519/', [['tablets']]], ['/13/109/831/', [['tablets']]], ['/13/109/832/', [['tablets']]], ['/13/109/935/', [['tablets']]], ['/13/109/936/', [['tablets']]],
  ['/13/109/518/', [['impresoras', /impresora|multifuncional/i]]],
  ['/13/109/517/', [['monitores', /monitor/i], ['accesorios', /cargador|cable|hub|adaptador/i]]],
  ['/13/109/835/', [['monitores', /monitor/i], ['accesorios', /cargador|cable|hub|adaptador/i]]],
  ['/13/109/939/', [['monitores', /monitor/i], ['accesorios', /cargador|cable|hub|adaptador/i]]],
  ['/13/108/512/', [['televisores']]],
  ['/13/107/510/', [['audio']]], ['/13/107/511/', [['audio']]],
  ['/13/107/507/', [['audifonos']]],
  ['/13/110/520/', [['consolas', /consola|playstation|ps5|ps4/i], ['videojuegos']]],
  ['/13/110/521/', [['consolas', /consola|switch/i], ['videojuegos']]],
  ['/13/110/522/', [['videojuegos']]], ['/13/110/523/', [['videojuegos']]],
  ['/13/110/525/', [['videojuegos', /control|dualsense|headset|aud[ií]fono|volante/i]]],
  ['/13/110/526/', [['videojuegos', /control|joy-?con|headset|aud[ií]fono/i]]],
  ['/13/110/529/', [['videojuegos', /control|headset|aud[ií]fono/i]]],
  ['/13/111/530/', [['lavadoras']]],
  ['/13/111/531/', [['estufas', /estufa|cocina/i]]],
  ['/13/111/532/', [['refrigeradoras']]],
  ['/13/112/534/', [['aires', /aire/i]]],
  ['/13/112/537/', [['freidoras', /freidora/i]]],
  ['/13/112/542/', [['microondas', /microond/i]]],
  ['/13/112/540/', [['licuadoras', /licuadora|batidora/i]]],
  ['/13/112/541/', [['licuadoras', /cafetera|espresso/i]]],
  ['/13/112/539/', [['licuadoras', /procesador|extractor de jugo/i]]],
];

export async function scrapeWalmart({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [path, rules] of MAP) {
    for (let from = 0; from < 2500; from += 50) {
      const res = await fetch(`${BASE}/api/catalog_system/pub/products/search?fq=C:${path}&_from=${from}&_to=${from + 49}`);
      if (res.status === 404) break;
      if (!res.ok) throw new Error(`Walmart ${path} HTTP ${res.status}`);
      const list = await res.json();
      for (const p of list) {
        if (seen.has(p.productId)) continue;
        const name = (p.productName || '').replace(/\s+/g, ' ').trim();
        const cat = rules.find(([, re]) => !re || re.test(name))?.[0];
        if (!cat) continue;
        seen.add(p.productId);
        const item = p.items?.[0];
        const offer = item?.sellers?.[0]?.commertialOffer;
        if (!offer || !offer.Price) continue;
        const d = vtexDetails(p);
        // Plan público de meses sin intereses con tarjeta BAC (especificación "BAC MSI").
        const msi = String([].concat(p['BAC MSI'] || [])[0] || '').match(/(\d+)\s*meses sin intereses/i);
        out.push({
          store: 'walmart', cat, brand: p.brand || '', name,
          price: offer.Price, regular: Math.max(offer.Price, offer.ListPrice || 0),
          available: (offer.AvailableQuantity ?? 1) > 0,
          url: p.link || `${BASE}/${p.linkText}/p`,
          img: d.img, alts: d.alts, desc: d.desc, specs: d.specs,
          sku: String(item.itemId || p.productId || ''), model: '', barcode: String(item.ean || ''),
          ...(msi ? { plan: { n: Number(msi[1]), t: 'sin intereses con tarjeta BAC' } } : {}),
        });
      }
      if (list.length < 50) break;
      await sleep(400);
    }
  }
  return out;
}
