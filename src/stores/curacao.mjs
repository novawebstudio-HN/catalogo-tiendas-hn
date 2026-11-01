// La Curacao Honduras — Magento 2 + Live Search.
// Su API de listado está restringida a su propio sitio, así que solo se lee lo que
// la página pública de cada categoría entrega renderizado en el HTML (primeros
// ~20 productos en existencia). Cobertura parcial por diseño.
const SITE = 'https://www.lacuracaonline.com';

const MAP = {
  'telefonia/celulares-y-telefonos/celulares': 'celulares',
  'tecnologia/computacion/laptops': 'laptops',
  'tecnologia/computacion/tablets': 'tablets',
  'tecnologia/tv-y-video/televisores': 'televisores',
  'tecnologia/audio/parlantes': 'audio',
  'tecnologia/audio/barras-de-sonido-y-home-theater': 'audio',
  'tecnologia/gaming/consolas': 'consolas',
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
};

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

const abs = (u) => (u ? (u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? SITE + u : u) : '');

const brandFromName = (name) => {
  const KNOWN = ['Samsung', 'LG', 'TCL', 'Hisense', 'Mabe', 'Whirlpool', 'Frigidaire', 'Mastertech', 'Apple', 'Motorola', 'Xiaomi', 'Honor', 'Infinix', 'Tecno', 'ZTE', 'Oppo', 'Realme', 'HP', 'Lenovo', 'Dell', 'Acer', 'Asus', 'Sony', 'JBL', 'Nintendo', 'PlayStation', 'Xbox', 'Oster', 'Ninja', 'Black+Decker', 'Daewoo', 'Panasonic', 'RCA', 'JVC', 'Indurama', 'Electrolux', 'GE', 'Haier', 'Midea', 'Serta', 'Sealy', 'Simmons', 'Therapedic', 'Rest Well', 'Restonic', 'Spring Air', 'Olimpia', 'Huawei', 'Vivo', 'Nokia', 'Alcatel', 'Philips', 'Aiwa', 'Bose', 'Imaco', 'Hamilton Beach', 'Ufesa', 'Cuisinart'];
  const n = ` ${name.toLowerCase()} `;
  return KNOWN.find((b) => n.includes(` ${b.toLowerCase()} `)) || '';
};

export async function scrapeCuracao({ fetch, prev = [], sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const failed = [];
  const get = () => (path) => fetch(`${SITE}/honduras/c/${path}`, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  for (const [path, cat] of Object.entries(MAP)) {
    let res = await get()(path);
    if (!res.ok) { await sleep(15000); res = await get()(path); }
    if (!res.ok) {
      // Se conservan los productos de la corrida anterior para esta categoría.
      const kept = prev.filter((p) => p.src === path);
      out.push(...kept);
      failed.push(`${path} (${res.status}, ${kept.length} anteriores)`);
      await sleep(5000); continue;
    }
    const sr = extractSearchResponse(await res.text());
    const items = sr?.data?.productSearch?.items || [];
    for (const { product: p } of items) {
      const price = Number(p?.price_range?.minimum_price?.final_price?.value ?? p?.price_range?.minimum_price?.regular_price?.value ?? 0);
      if (!price) continue;
      out.push({
        store: 'curacao', cat, brand: brandFromName(p.name || ''), name: p.name || '',
        price, regular: Number(p?.price_range?.minimum_price?.regular_price?.value ?? price),
        available: true, url: abs(p.canonical_url), img: abs(p.image?.url),
        sku: String(p.sku || ''), model: '', src: path,
      });
    }
    await sleep(3000);
  }
  if (failed.length) console.log(`  Curacao: categorías sin respuesta: ${failed.join(', ')}`);
  if (!out.length) throw new Error(`Curacao sin productos (${failed.join(', ')})`);
  return out;
}
