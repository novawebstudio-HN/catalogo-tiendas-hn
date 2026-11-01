// Normaliza los productos crudos de todas las tiendas y agrupa los que son el mismo modelo.
import { createHash } from 'node:crypto';
import { CATEGORIES, STORES, ACCESSORY_RE, CHARGER_RE, minPrice } from './taxonomy.mjs';

const STORE_ORDER = Object.keys(STORES);
// Clave estable de una oferta (tienda + código de la tienda); sirve para el historial y los links.
export const offerKey = (p) => `${p.store}:${String(p.sku || createHash('sha1').update(String(p.url)).digest('hex').slice(0, 10)).replace(/[^\w.-]/g, '').slice(0, 40)}`;

const deaccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

const BRAND_ALIASES = { 'general electric': 'ge', 'black and decker': 'black+decker', 'black & decker': 'black+decker', 'black + decker': 'black+decker', 'b&d': 'black+decker', 'bd': 'black+decker', 'sin marca': '' };
export const brandKey = (b) => {
  const k = deaccent(b).toLowerCase().trim();
  return (BRAND_ALIASES[k] ?? k).replace(/[^a-z0-9+]/g, '');
};
const DISPLAY_ALIASES = { iphone: 'Apple', ipad: 'Apple', 'general electric': 'GE', 'black and decker': 'Black+Decker', 'black & decker': 'Black+Decker', 'samsung electronics': 'Samsung' };
const titleBrand = (b) => {
  const s0 = String(b || '').trim();
  const s = DISPLAY_ALIASES[deaccent(s0).toLowerCase()] || s0;
  if (!s || /sin marca/i.test(s)) return '';
  if (s !== s0) return s;
  if (s.length <= 4) return s.toUpperCase();
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
};

// Tokens que parecen medidas y no modelos.
const UNIT_RE = /^\d+([.,]\d+)?(GB|TB|MB|BTU|BTUS|W|V|HZ|MP|MAH|PULG|IN|KG|LB|LBS|LIBRAS|PIES|FT|CU|L|LTS|CM|MM|P|K|G|MS|RPM|CC|MAX)?$/;
const STOP = new Set(['SMART', 'INVERTER', 'GOOGLE', 'ANDROID', 'QLED', 'OLED', 'ULTRA', 'GALAXY', 'IPHONE', 'WIFI', 'BLUETOOTH']);

export function modelCandidates(item) {
  // El slug del URL suele traer el modelo completo aunque el nombre venga recortado.
  const slugToks = String(item.url || '').split('?')[0].split('/').filter(Boolean).slice(-2).join(' ').replace(/-/g, ' ');
  const raw = `${item.model || ''} ${item.name || ''} ${slugToks}`.toUpperCase();
  const toks = raw.split(/[\s/,()|+]+/).map((t) => t.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ''));
  const out = [];
  for (const t of toks) {
    const n = t.replace(/[^A-Z0-9]/g, '');
    if (n.length < 5 || STOP.has(n)) continue;
    if (!/[A-Z]/.test(n) || !/\d/.test(n)) continue;
    if (UNIT_RE.test(n)) continue;
    if ((n.match(/\d/g) || []).length < 2) continue;
    // No son modelos: capacidades/colores ("BLACK256GB"), resoluciones ("1920X1080"),
    // procesadores ("I513420H") ni códigos internos de tienda ("HN4195").
    if (/\d(GB|TB)|(GB|TB)\d|\d+X\d{3,}|^I[3579]\d{4}|^HN\d{3,5}$|BLACK|BLUE|GR[AE]Y|GREEN|WHITE|SILVER|GOLD|PINK|PURPLE|NEGRO|AZUL|GRIS|VERDE|BLANCO|PLATA|ROSA|MORADO/.test(n)) continue;
    out.push(n.replace(/^COMBO/, '').replace(/ESP$/, ''));
  }
  return [...new Set(out)].filter((n) => n.length >= 5);
}

// Capacidad (GB) para no mezclar 128 GB con 256 GB. Acepta "256GB", "256 G", "1TB" y "/128/".
const storage = (name) => {
  const N = String(name).toUpperCase();
  const m = [...N.matchAll(/(\d+)\s?(GB|TB|G|T)\b/g)].map((x) => Number(x[1]) * (x[2].startsWith('T') ? 1024 : 1));
  for (const x of N.matchAll(/\/\s?(32|64|128|256|512)\s?(?=\/|$|\s)/g)) m.push(Number(x[1]));
  const big = m.filter((v) => v >= 32);
  return big.length ? Math.max(...big) : null;
};
const inches = (name) => {
  const m = String(name).match(/(\d{2,3})\s?(?:"|”|''|pulgadas|pulg\b|in\b)/i);
  return m ? Number(m[1]) : null;
};

// Núcleo del modelo: se quitan sufijos de región o empaque que no cambian el producto
// (Samsung UN55U8000FPXPA = UN55U8000F; WA23C3553GWAP = WA23C3553GW).
const REGION_SUFFIX = /(PXPA|PXZA|PXZX|PXPR|PXPE|PXZS|PXP|PXZ|PX|AP|ESP)$/;
export function cores(models) {
  const out = new Set();
  for (let m of models) {
    if (m.length < 7) continue;
    out.add(m);
    for (let k = 0; k < 2; k++) { const s = m.replace(REGION_SUFFIX, ''); if (s === m || s.length < 7) break; m = s; out.add(m); }
  }
  return [...out];
}

// Señales de que dos productos NO son el mismo, aunque compartan código de barras o parte del modelo.
function conflict(a, b) {
  if (a.cat !== b.cat) return true;
  // Algunas tiendas cargan mal la marca; un modelo completo idéntico (9+ caracteres) o el mismo
  // código de barras pesa más que la marca.
  const strong = (a.barcode && a.barcode === b.barcode) || (a.full || a.cores).some((x) => x.length >= 9 && (b.full || b.cores).includes(x));
  if (!strong && a.bk && b.bk && a.bk !== b.bk) return true;
  const sa = storage(a.name), sb = storage(b.name);
  if (sa && sb && sa !== sb) return true;
  const ia = inches(a.name), ib = inches(b.name);
  if (ia && ib && ia !== ib) return true;
  if (Math.max(a.price, b.price) / Math.min(a.price, b.price) > 2.5) return true;
  // Misma familia pero variante distinta (UN65U8000F vs UN65U8000H, VX122C1N vs VX122C1U).
  if (a.cores.length && b.cores.length && !a.cores.some((x) => b.cores.includes(x))) {
    for (const x of a.cores) for (const y of b.cores) {
      if (x.length >= 8 && y.length >= 8 && x.slice(0, 6) === y.slice(0, 6) && !x.startsWith(y) && !y.startsWith(x)) return true;
    }
  }
  return false;
}

// Enlace directo: mismo código de barras o mismo núcleo de modelo, sin señales en contra.
function linked(a, b) {
  if (conflict(a, b)) return false;
  if (a.barcode && b.barcode && a.barcode === b.barcode) return true;
  if (a.gk && a.gk === b.gk) return true;
  const fa = a.full || a.cores, fb = b.full || b.cores;
  return fa.some((x) => fb.includes(x));
}

// Juegos: plataforma y título normalizado para emparejar el mismo juego entre tiendas.
const PLATFORMS = [[/switch\s*2|ns2\b/i, 'NS2'], [/ps5|playstation\s*5/i, 'PS5'], [/ps4|playstation\s*4/i, 'PS4'], [/xbox\s*series|xsx/i, 'XSX'], [/xbox\s*one/i, 'XB1'], [/xbox/i, 'XBOX'], [/switch|nintendo/i, 'NSW']];
const PLATFORM_WORDS = /(nintendo\s*)?switch\s*2|\bns2\b|nintendo\s*switch|\bswitch\b|\bps[45]\b|playstation\s*[45]|xbox\s*series\s*[xs](\s*[|/]\s*[xs])?|xbox\s*one|\bxbox\b|\bnsw\b/gi;
const GAME_STOP = new Set(['juego', 'videojuego', 'para', 'de', 'del', 'la', 'el', 'los', 'las', 'the', 'of', 'and', 'y', 'nintendo', 'playstation', 'version', 'usa', 'us', 'latam', 'fisico', 'standard', 'estandar', 'edition', 'edicion', 'sony', 'microsoft', 'game', 'videogame', 'nuevo', 'sellado']);
export function gameKey(name) {
  const plat = PLATFORMS.find(([re]) => re.test(name))?.[1];
  if (!plat) return '';
  const toks = deaccent(name).replace(PLATFORM_WORDS, ' ').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t && !GAME_STOP.has(t));
  if (toks.length < 1 || toks.join('').length < 4) return '';
  return `${plat}|${[...new Set(toks)].sort().join(' ')}`;
}

const DROP_BY_CAT = {
  aires: /enfriador|ventilador/i,
  laptops: /monitor|impresora|desktop|escritorio|all in one|\baio\b|mouse|teclado|mochila/i,
  licuadoras: /\bvaso\b|cuchilla|jarra de repuesto|filtro/i,
  impresoras: /tinta|cartucho|toner|t[oó]ner|papel|cabezal|repuesto/i,
  motos: /casco|llanta|bater[ií]a|aceite|repuesto|guante|chaqueta|juguete/i,
  smartwatches: /correa|pulso|cargador|protector|funda/i,
  lavadoras: /cabello|pelo|de mano|plancha/i,
  camas: /camarote|litera|cuna|sof[aá] ?cama|almohada/i,
};
const CONSOLE_NAME = /\bconsola\b|console|playstation\s*5\s*(slim|pro|digital)|ps5\s*(slim|pro|digital)|switch\s*(2|oled|lite)\b|xbox series [xs]\b/i;
const GAME_GEAR = /\bjuego\b|videojuego|\bcontrol(es)?\b|\bmando\b|dualsense|joy-?con|volante|headset/i;

export function clean(items) {
  const out = [];
  for (const p0 of items) {
    if (!p0 || !p0.name || !p0.price) continue;
    const p = { ...p0 };
    const name = deaccent(p.name);
    // Precios marcador (99999, 999999…) que algunas tiendas usan para productos no a la venta.
    if (/^9{5,}(\.0+)?$/.test(String(p.price))) continue;
    // Juegos y controles que vienen dentro de "consolas".
    if (p.cat === 'consolas' && !/\bconsola\b/i.test(name) && (GAME_GEAR.test(name) || (p.price < 4000 && !CONSOLE_NAME.test(name)))) p.cat = 'videojuegos';
    // Baterías portátiles y power banks que algunas tiendas ponen en celulares o audio.
    if (['celulares', 'tablets', 'audio', 'audifonos', 'smartwatches'].includes(p.cat) && /^\s*(bater[ií]a|power ?bank|cargador)\b/i.test(name)) p.cat = 'accesorios';
    // Accesorios: los cargadores y cables pasan a su categoría; el resto (fundas, micas…) se descarta.
    if (p.cat === 'accesorios') {
      if (!CHARGER_RE.test(name) || /funda|estuche|protector|mica|vidrio|case\b|soporte|holder/i.test(name)) continue;
    } else if (ACCESSORY_RE.test(name)) {
      if (['celulares', 'tablets', 'laptops', 'smartwatches'].includes(p.cat) && CHARGER_RE.test(name) && !/funda|estuche|protector|mica|vidrio|case\b/i.test(name)) p.cat = 'accesorios';
      else continue;
    }
    if (DROP_BY_CAT[p.cat]?.test(name)) continue;
    // Combos de dos productos (estufa + lavadora, etc.) no se comparan con un producto suelto.
    if (/\bcombo\b/i.test(name) && /\+/.test(name) && p.cat !== 'consolas') continue;
    if (p.price < minPrice(p.cat)) continue;
    let brand = titleBrand(p.brand);
    if (!brand) {
      const first = String(p.name).split(/\s+/).find((w) => /^[A-Z][A-Za-z]+$/.test(w) && w.length > 2 && !/^(Cama|Colchon|Colchón|Televisor|Refrigeradora|Lavadora|Estufa|Aire|Bocina|Horno|Microondas|Freidora|Celular|Laptop|Tablet|Consola|Secadora|Congelador|Minicomponente|Individual|Matrimonial|Queen|King|Juego|Control|Cargador|Cable|Monitor|Impresora|Licuadora|Cafetera|Batidora|Motocicleta|Moto|Reloj|Smartwatch|Audifonos|Audífonos|Parlante|Switch|Xbox|Memoria|Adaptador|Power)$/i.test(w));
      brand = first && p.cat !== 'videojuegos' ? titleBrand(first) : '';
    }
    const models = modelCandidates(p);
    out.push({ ...p, brand, bk: brandKey(brand), models, cores: cores(models), barcode: (p.barcode || '').replace(/^0+/, ''), gk: p.cat === 'videojuegos' ? gameKey(p.name) : '' });
  }
  return out;
}

export function group(items) {
  const parent = items.map((_, i) => i);
  const members = items.map((_, i) => [i]);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // Solo se unen dos grupos si ningún par de productos entre ellos tiene señales en contra.
  const union = (x, y) => {
    const rx = find(x), ry = find(y);
    if (rx === ry) return false;
    for (const i of members[rx]) for (const j of members[ry]) if (conflict(items[i], items[j])) return false;
    parent[rx] = ry; members[ry].push(...members[rx]); members[rx] = [];
    return true;
  };
  const byCat = {};
  items.forEach((p, i) => (byCat[p.cat] ||= []).push(i));
  for (const idxs of Object.values(byCat)) {
    // 1) Enlaces seguros: código de barras o núcleo de modelo idéntico.
    // Un núcleo es "incompleto" si existe otro que solo le agrega 1-2 letras (UN65U8000 vs UN65U8000F/H).
    const all = new Set(idxs.flatMap((i) => items[i].cores));
    // Solo es ambiguo si tiene dos o más versiones completas distintas (sin contar sufijos de región).
    const exts = (c) => new Set([...all].filter((d) => d.length > c.length && d.length - c.length <= 2 && d.startsWith(c) && /^[A-Z]{1,2}$/.test(d.slice(c.length)))
      .map((d) => d.replace(REGION_SUFFIX, '')).filter((d) => d !== c));
    const incomplete = new Set([...all].filter((c) => exts(c).size >= 2));
    for (const i of idxs) items[i].full = items[i].cores.filter((c) => !incomplete.has(c));
    const buckets = {};
    for (const i of idxs) for (const c of items[i].full) (buckets[`m:${c}`] ||= []).push(i);
    for (const i of idxs) if (items[i].barcode) (buckets[`b:${items[i].barcode}`] ||= []).push(i);
    for (const i of idxs) if (items[i].gk) (buckets[`g:${items[i].gk}`] ||= []).push(i);
    for (const arr of Object.values(buckets)) {
      for (let x = 0; x < arr.length; x++) for (let y = x + 1; y < arr.length; y++) {
        if (linked(items[arr[x]], items[arr[y]])) union(arr[x], arr[y]);
      }
    }
    // 2) Códigos incompletos (ej. "UN58U8000" sin la letra del año): se unen solo si
    //    existe una única versión completa posible en la misma categoría y marca.
    for (const i of idxs) {
      for (const c of items[i].cores) {
        if (c.length < 8) continue;
        const roots = new Set();
        for (const j of idxs) {
          if (i === j || find(i) === find(j)) continue;
          if (items[j].cores.some((d) => d.length - c.length >= 1 && d.length - c.length <= 2 && d.startsWith(c) && /^[A-Z]{1,2}$/.test(d.slice(c.length))) && !conflict(items[i], items[j])) roots.add(find(j));
        }
        const exts = new Set([...roots].flatMap((r) => members[r].flatMap((k) => items[k].cores.filter((d) => d.startsWith(c) && d.length - c.length <= 2 && d.length > c.length).map((d) => d.replace(REGION_SUFFIX, '')))));
        if (roots.size === 1 && exts.size === 1) union(i, [...roots][0]);
      }
    }
  }
  const groups = {};
  items.forEach((p, i) => (groups[find(i)] ||= []).push(p));

  return Object.values(groups).map((ps) => {
    ps.sort((a, b) => STORE_ORDER.indexOf(a.store) - STORE_ORDER.indexOf(b.store));
    const best = {};
    for (const p of ps) if (!best[p.store] || p.price < best[p.store].price) best[p.store] = p;
    const offers = Object.values(best)
      .map((p) => ({ s: p.store, k: offerKey(p), p: p.price, r: Math.max(p.regular || p.price, p.price), u: p.url, a: p.available ? 1 : 0, ...(p.plan ? { q: p.plan } : {}) }))
      .sort((a, b) => (b.a - a.a) || (a.p - b.p));
    // Fotos candidatas de todas las tiendas del grupo; thumbs.mjs usa la primera que funcione.
    const pics = [...new Set(ps.flatMap((p) => [p.img, ...(p.alts || [])]).filter(Boolean))].slice(0, 8);
    // Modelo a mostrar: el código completo más repetido entre las tiendas (sin sufijo de región).
    const freq = {};
    for (const p of ps) for (const c of new Set((p.full || p.cores).map((c) => c.replace(REGION_SUFFIX, '')))) freq[c] = (freq[c] || 0) + 1;
    const model = Object.entries(freq).sort((a, b) => (b[1] - a[1]) || (b[0].length - a[0].length))[0]?.[0] || ps.flatMap((p) => p.models)[0] || '';
    // Detalles para la ficha: la descripción más completa y la lista de características más larga.
    const desc = ps.map((p) => p.desc || '').sort((a, b) => b.length - a.length)[0] || '';
    const specs = ps.map((p) => p.specs || []).sort((a, b) => b.length - a.length)[0] || [];
    const product = {
      id: `${ps[0].store}-${ps[0].sku || ps[0].url}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60),
      c: ps[0].cat, b: ps.find((p) => p.brand)?.brand || '', n: ps[0].name.replace(/\s+/g, ' ').trim(),
      m: model, i: pics[0] || '', ii: pics, o: offers,
    };
    Object.defineProperty(product, 'det', { value: { d: desc, s: specs, g: pics }, enumerable: false });
    return product;
  });
}

export function buildCatalog(rawByStore, status) {
  const all = clean(Object.values(rawByStore).flat());
  const used = new Set(all.map((p) => p.cat));
  const products = group(all).sort((a, b) => (b.o.length - a.o.length) || a.c.localeCompare(b.c) || a.n.localeCompare(b.n));
  return {
    updated: new Date().toISOString(),
    stores: Object.fromEntries(Object.entries(STORES).map(([id, s]) => [id, {
      name: s.name, site: s.site, count: all.filter((p) => p.store === id).length,
      ok: status[id]?.ok ?? false, manual: !!status[id]?.manual, updated: status[id]?.updated || null, note: status[id]?.note || '',
    }])),
    categories: CATEGORIES.filter((c) => used.has(c.id)).map(({ id, name, group }) => ({ id, name, group })),
    products,
  };
}
