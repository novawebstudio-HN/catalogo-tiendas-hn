// Almacenes Lady Lee — Shopify. Catálogo público por colección (/collections/{handle}/products.json).
import { htmlToText } from './acosa.mjs';
import { catFromName } from '../classify.mjs';

const SITE = 'https://ladylee.net';

const MAP = {
  celulares: 'celulares', smartphone: 'celulares', laptop: 'laptops', computadoras: 'laptops', pantallas: 'televisores', televisores: 'televisores',
  'barras-de-sonido': 'audio', 'parlantes-bocinas': 'audio', 'altavoces-y-parlantes': 'audio', audio: 'audio',
  'consola-d-video-jgo': 'consolas', videojuegos: 'videojuegos', gaming: 'videojuegos',
  tablet: 'tablets', 'relojes-y-bandas': 'smartwatches', cargadores: 'accesorios', 'accesorios-para-celulares': 'accesorios',
  refrigeracion: 'refrigeradoras', lavadora: 'lavadoras', secadora: 'lavadoras', 'centro-de-lavado': 'lavadoras',
  'estufas-gas': 'estufas', 'estufas-electricas': 'estufas', microondas: 'microondas',
  'aires-acondicionados': 'aires', camas: 'camas', freidoras: 'freidoras',
  'monitores-p-compu': 'monitores', impresoras: 'impresoras',
  'audifonos-microfonos': 'audifonos', 'audifonos-in-ear': 'audifonos', 'audifonos-on-ear': 'audifonos', 'audifonos-over-ear': 'audifonos', 'audifonos-open-ear': 'audifonos',
  'controles-p-consolas': 'videojuegos', 'juegos-de-consola': 'videojuegos',
  'cargadores-para-celulares': 'accesorios', licuadoras: 'licuadoras', cafeteras: 'licuadoras',
  motocicletas: 'motos', mensajera: 'motos', 'motos-forza': 'motos', 'forza-motors': 'motos', cuatrimoto: 'motos',
};

// Colecciones amplias cuyo contenido se afina por nombre (consolas vs juegos, audífonos vs bocinas, etc.).
const BROAD = new Set(['computadoras', 'audio', 'videojuegos', 'gaming', 'televisores']);

export async function scrapeLadyLee({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  const add = (p, cat) => {
    const v = (p.variants || []).find((x) => x.available) || p.variants?.[0];
    const price = Number(v?.price || 0);
    if (!price) return;
    out.push({
      store: 'ladylee', cat, brand: p.vendor || '', name: String(p.title || '').replace(/\s+/g, ' ').trim(),
      price, regular: Math.max(price, Number(v.compare_at_price || 0)),
      available: (p.variants || []).some((x) => x.available),
      url: `${SITE}/products/${p.handle}`,
      img: (p.images?.[0]?.src || '').split('?')[0], alts: (p.images || []).slice(1, 5).map((i) => i.src.split('?')[0]),
      sku: String(v.sku || p.id), model: '', barcode: String(v.barcode || ''),
      desc: htmlToText(p.body_html).slice(0, 900),
      specs: (p.options || []).filter((o) => o.name !== 'Title' && o.values?.length).map((o) => [o.name, o.values.join(', ')]).slice(0, 8),
    });
  };
  const pages = async (path, onList) => {
    for (let page = 1; page <= 60; page++) {
      const res = await fetch(`${SITE}${path}?limit=250&page=${page}`);
      if (!res.ok) throw new Error(`Lady Lee ${path} HTTP ${res.status}`);
      const { products = [] } = await res.json();
      onList(products);
      if (products.length < 250) break;
      await sleep(500);
    }
    await sleep(300);
  };
  for (const [handle, cat] of Object.entries(MAP)) {
    await pages(`/collections/${handle}/products.json`, (products) => {
      for (const p of products) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        if (cat === 'aires' && /enfriador|ventilador/i.test(p.title)) continue;
        add(p, BROAD.has(handle) ? (catFromName(p.title) || cat) : cat);
      }
    });
  }
  // Resto del catálogo: lo que no está en ninguna colección reconocida se clasifica por nombre.
  let extra = 0;
  await pages('/products.json', (products) => {
    for (const p of products) {
      if (seen.has(p.id)) continue;
      const cat = catFromName(p.title);
      if (!cat) continue;
      seen.add(p.id);
      add(p, cat);
      extra++;
    }
  });
  console.log(`  Lady Lee: ${extra} productos extra fuera de las colecciones conocidas`);
  return out;
}
