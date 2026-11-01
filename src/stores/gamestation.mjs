// Game Station Honduras — WooCommerce sin API pública: se leen las páginas de categoría
// (HTML público, permitido por su robots.txt), 12 productos por página, los más nuevos primero.
import { brandFromName } from './unicomer.mjs';

const SITE = 'https://gamestation.hn';

// categoría de la tienda -> [categoría propia por defecto, máximo de páginas]
const PAGES = [
  ['play4/ps5', 'consolas', 4], ['switch/switch-2-consolas', 'consolas', 3], ['switch/nintendo-switch-consolas', 'consolas', 3],
  ['xbox/xbox-series', 'consolas', 4],
  ['play4/ps5games', 'videojuegos', 20], ['switch/switch-2-video-juegos', 'videojuegos', 15], ['switch/nintendo-switch-juegos', 'videojuegos', 15],
  ['xbox/xbox-one-juegos', 'videojuegos', 8],
  ['play4/ps5items', 'videojuegos', 12], ['switch/switch-2-accesorios', 'videojuegos', 6], ['switch/nintendo-switch-accesorios', 'videojuegos', 8],
  ['tecno/celulares', 'celulares', 4], ['tecno/parlante', 'audio', 4], ['tecno/headset-auriculares', 'audifonos', 6],
];

const dec = (s) => String(s || '').replace(/&#8211;|&ndash;/g, '-').replace(/&#8217;|&rsquo;/g, "'").replace(/&#215;/g, 'x')
  .replace(/&amp;/g, '&').replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/<[^>]+>/g, '').trim();
const num = (s) => Number(String(s).replace(/,/g, ''));

export function parseLoop(html) {
  const out = [];
  for (const chunk of html.split('<li class="post-').slice(1)) {
    const cls = chunk.slice(0, chunk.indexOf('"'));
    const id = cls.split(' ')[0];
    const href = chunk.match(/<a href="([^"]+)" class="woocommerce-LoopProduct-link/)?.[1];
    const name = dec(chunk.match(/<h2 class="woocommerce-loop-product__title">([\s\S]*?)<\/h2>/)?.[1]);
    if (!href || !name) continue;
    const img = chunk.match(/<img[^>]+src="([^"]+)"/)?.[1] || '';
    const amounts = [...chunk.matchAll(/Price-currencySymbol">[^<]*<\/span>\s*([\d,]+(?:\.\d+)?)/g)].map((m) => num(m[1]));
    if (!amounts.length) continue;
    const onSale = /<del/.test(chunk);
    out.push({
      id, href, name,
      img: (img.startsWith('//') ? `https:${img}` : img).replace(/-\d+x\d+(\.\w+)$/, '$1'),
      price: onSale ? amounts[amounts.length - 1] : amounts[0],
      regular: onSale ? amounts[0] : amounts[0],
      available: !/\boutofstock\b/.test(cls),
      cats: [...cls.matchAll(/product_cat-([\w-]+)/g)].map((m) => m[1]),
    });
  }
  return out;
}

const CONSOLE_RE = /\bconsola\b/i;
const GAMEGEAR_RE = /\b(control|dualsense|joy-?con|mando|volante|headset|aud[ií]fono|auricular|vr2?|portal|pro controller)\b/i;

export async function scrapeGameStation({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [path, defCat, maxPages] of PAGES) {
    for (let page = 1; page <= maxPages; page++) {
      const url = `${SITE}/product-category/${path}/${page > 1 ? `page/${page}/` : ''}?orderby=date`;
      const res = await fetch(url, { headers: { Accept: 'text/html' } });
      if (res.status === 404) break;
      if (!res.ok) throw new Error(`Game Station ${path} HTTP ${res.status}`);
      const html = await res.text();
      const items = parseLoop(html);
      for (const p of items) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        let cat = defCat;
        if (defCat === 'consolas' || defCat === 'videojuegos') {
          if (CONSOLE_RE.test(p.name) && !/lector|estante|soporte|base|funda|estuche|cargador|cable/i.test(p.name)) cat = 'consolas';
          else if (/games|juegos/.test(path) || GAMEGEAR_RE.test(p.name)) cat = 'videojuegos';
          else continue; // memorias, cables, bases y otros accesorios menores
        }
        out.push({
          store: 'gamestation', cat, brand: brandFromName(p.name), name: p.name,
          price: p.price, regular: p.regular, available: p.available,
          url: p.href, img: p.img, sku: p.id.replace(/\D/g, ''), model: '',
        });
      }
      if (items.length < 12 || !html.includes(`/page/${page + 1}/`)) break;
      await sleep(900);
    }
    await sleep(900);
  }
  return out;
}
