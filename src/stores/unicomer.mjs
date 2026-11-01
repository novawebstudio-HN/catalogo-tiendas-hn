// Tiendas de Grupo Unicomer (La Curacao, RadioShack, Tropigas) — Magento 2 + Live Search.
// Su API de listado está restringida a su propio sitio, así que solo se lee lo que
// la página pública de cada categoría entrega renderizado en el HTML (primeros
// ~20 productos). Cobertura parcial por diseño.

// Extrae el objeto JSON que sigue a "searchResponse: " en el HTML.
export function extractSearchResponse(html) {
  const key = 'searchResponse: ';
  const i = html.indexOf(key);
  if (i < 0) return null;
  const start = i + key.length;
  let depth = 0, inStr = false, esc = false, j = start;
  for (; j < html.length; j++) {
    const c = html[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  try { return JSON.parse(html.slice(start, j + 1)); } catch { return null; }
}

const KNOWN = ['Samsung', 'LG', 'TCL', 'Hisense', 'Mabe', 'Whirlpool', 'Frigidaire', 'Mastertech', 'Apple', 'Motorola', 'Xiaomi', 'Honor', 'Infinix', 'Tecno', 'ZTE', 'Oppo', 'Realme', 'HP', 'Lenovo', 'Dell', 'Acer', 'Asus', 'Sony', 'JBL', 'Nintendo', 'PlayStation', 'Xbox', 'Oster', 'Ninja', 'Black+Decker', 'Daewoo', 'Panasonic', 'RCA', 'JVC', 'Indurama', 'Electrolux', 'GE', 'Haier', 'Midea', 'Serta', 'Sealy', 'Simmons', 'Therapedic', 'Rest Well', 'Restonic', 'Spring Air', 'Olimpia', 'Huawei', 'Vivo', 'Nokia', 'Alcatel', 'Philips', 'Aiwa', 'Bose', 'Imaco', 'Hamilton Beach', 'Ufesa', 'Cuisinart', 'Epson', 'Canon', 'Brother', 'Logitech', 'Anker', 'Belkin', 'Amazfit', 'Garmin', 'Skullcandy', 'Beats', 'Steren', 'Nedis', 'Genius', 'Klip Xtreme', 'Xtech', 'Argom', 'Honda', 'Yamaha', 'Suzuki', 'Bajaj', 'Italika', 'Genesis', 'Serpento', 'Haojue', 'TVS', 'Hero', 'Kawasaki', 'Nutribullet', 'Proctor Silex', 'Taurus', 'Krups', 'Nespresso', 'Keurig', 'Kitchenaid', 'Sankey', 'Premier', 'Atvio', 'Kalley', 'Hyundai', 'Altice'];
export const brandFromName = (name) => {
  const n = ` ${String(name).toLowerCase()} `;
  return KNOWN.find((b) => n.includes(` ${b.toLowerCase()} `)) || '';
};

// map: { 'ruta/de/categoria': 'categoria-propia' }
export function makeUnicomer({ id, site, map, label }) {
  const abs = (u) => (u ? (u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? new URL(u, site).href : u) : '');
  return async function scrape({ fetch, prev = [], sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
    const out = [];
    const failed = [];
    const seen = new Set();
    const get = (path) => fetch(`${site}/honduras/c/${path}`, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    for (const [path, cat] of Object.entries(map)) {
      let res = await get(path);
      if (!res.ok && res.status !== 404) { await sleep(15000); res = await get(path); }
      if (!res.ok) {
        // Se conservan los productos de la corrida anterior para esta categoría.
        const kept = prev.filter((p) => p.src === path);
        out.push(...kept);
        failed.push(`${path} (${res.status}, ${kept.length} anteriores)`);
        await sleep(4000); continue;
      }
      const sr = extractSearchResponse(await res.text());
      const items = sr?.data?.productSearch?.items || [];
      for (const { product: p } of items) {
        if (!p || seen.has(p.sku)) continue;
        seen.add(p.sku);
        const fin = p?.price_range?.minimum_price?.final_price?.value;
        const reg = p?.price_range?.minimum_price?.regular_price?.value;
        const price = Number(fin ?? reg ?? 0);
        if (!price) continue;
        out.push({
          store: id, cat, brand: brandFromName(p.name || ''), name: p.name || '',
          price, regular: Number(reg ?? price),
          available: true, url: abs(p.canonical_url), img: abs(p.image?.url),
          sku: String(p.sku || ''), model: '', src: path,
        });
      }
      await sleep(3000);
    }
    if (failed.length) console.log(`  ${label}: categorías sin respuesta: ${failed.join(', ')}`);
    if (!out.length) throw new Error(`${label} sin productos (${failed.join(', ')})`);
    return out;
  };
}

// Rutas comunes de Unicomer (las tres tiendas usan la misma estructura).
export const UNICOMER_PATHS = {
  'telefonia/celulares-y-telefonos/celulares': 'celulares',
  'tecnologia/computacion/laptops': 'laptops',
  'tecnologia/computacion/tablets': 'tablets',
  'tecnologia/computacion/impresoras': 'impresoras',
  'tecnologia/tv-y-video/televisores': 'televisores',
  'tecnologia/audio/parlantes': 'audio',
  'tecnologia/audio/barras-de-sonido-y-home-theater': 'audio',
  'tecnologia/audio/minicomponentes': 'audio',
  'tecnologia/audio/audifonos-inalambricos': 'audifonos',
  'tecnologia/audio/audifonos-alambricos': 'audifonos',
  'tecnologia/gaming/consolas': 'consolas',
  'tecnologia/gaming/juegos': 'videojuegos',
  'tecnologia/gaming/controles-y-mandos': 'videojuegos',
  'telefonia/powerbanks-y-cargadores/cargadores-de-pared': 'accesorios',
  'telefonia/powerbanks-y-cargadores/powerbanks': 'accesorios',
  'tecnologia/cables-y-adaptadores/cables': 'accesorios',
  'linea-blanca/refrigeracion/refrigeradoras': 'refrigeradoras',
  'linea-blanca/refrigeracion/congeladores': 'refrigeradoras',
  'linea-blanca/lavadoras-y-secadoras/lavadoras': 'lavadoras',
  'linea-blanca/lavadoras-y-secadoras/secadoras': 'lavadoras',
  'linea-blanca/cocina/estufas': 'estufas',
  'electrodomesticos/microondas': 'microondas',
  'linea-blanca/climatizacion/aires-acondicionados': 'aires',
  'colchones/camas': 'camas',
  'colchones/colchones': 'camas',
  'electrodomesticos/freidoras': 'freidoras',
  'electrodomesticos/licuadoras': 'licuadoras',
  'electrodomesticos/cafeteras': 'licuadoras',
  'automotriz/motocicletas/motocicletas-de-trabajo': 'motos',
  'automotriz/motocicletas/motocicletas-automaticas': 'motos',
  'automotriz/motocicletas/motocicletas-deportivas': 'motos',
  'automotriz/motocicletas/motocicletas-doble-proposito': 'motos',
  'automotriz/motocicletas/motocicletas-scooter': 'motos',
  'automotriz/motocicletas/motocicletas-todo-terreno': 'motos',
};
