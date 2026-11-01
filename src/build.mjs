// Normaliza los productos crudos de las 4 tiendas y agrupa los que son el mismo modelo.
import { CATEGORIES, STORES, MIN_PRICE, ACCESSORY_RE } from './taxonomy.mjs';

const STORE_ORDER = ['jetstereo', 'diunsa', 'curacao', 'elektra'];

const deaccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

const BRAND_ALIASES = { 'general electric': 'ge', 'black and decker': 'black+decker', 'black & decker': 'black+decker', 'sin marca': '' };
export const brandKey = (b) => {
  const k = deaccent(b).toLowerCase().trim();
  return (BRAND_ALIASES[k] ?? k).replace(/[^a-z0-9+]/g, '');
};
const titleBrand = (b) => {
  const s = String(b || '').trim();
  if (!s || /sin marca/i.test(s)) return '';
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
    out.push(n.replace(/^COMBO/, '').replace(/ESP$/, ''));
  }
  return [...new Set(out)].filter((n) => n.length >= 5);
}

const storage = (name) => {
  const m = [...String(name).toUpperCase().matchAll(/(\d+)\s?(GB|TB)/g)].map((x) => Number(x[1]) * (x[2] === 'TB' ? 1024 : 1));
  return m.length ? Math.max(...m) : null;
};
const inches = (name) => {
  const m = String(name).match(/(\d{2,3})\s?(?:"|”|''|pulgadas|pulg\b|in\b)/i);
  return m ? Number(m[1]) : null;
};

function sameModel(a, b) {
  for (const x of a.models) for (const y of b.models) {
    const [s, l] = x.length <= y.length ? [x, y] : [y, x];
    if (s.length >= 7 && l.startsWith(s) && l.length - s.length <= 6) return true;
  }
  return false;
}

function compatible(a, b) {
  if (a.cat !== b.cat) return false;
  if (a.barcode && b.barcode && a.barcode === b.barcode) return true;
  if (a.bk && b.bk && a.bk !== b.bk) return false;
  if (!sameModel(a, b)) return false;
  const sa = storage(a.name), sb = storage(b.name);
  if (sa && sb && sa !== sb) return false;
  const ia = inches(a.name), ib = inches(b.name);
  if (ia && ib && ia !== ib) return false;
  return true;
}

export function clean(items) {
  return items
    .filter((p) => p && p.name && p.price >= MIN_PRICE && !ACCESSORY_RE.test(deaccent(p.name)))
    // Precios marcador (99999, 999999…) que algunas tiendas usan para productos no a la venta.
    .filter((p) => !/^9{5,}(\.0+)?$/.test(String(p.price)))
    .filter((p) => !(p.cat === 'laptops' && /monitor|impresora|desktop|escritorio|all in one|\baio\b|mouse|teclado|mochila/i.test(p.name)))
    .map((p) => {
      let brand = titleBrand(p.brand);
      if (!brand) {
        const first = String(p.name).split(/\s+/).find((w) => /^[A-Z][A-Za-z]+$/.test(w) && w.length > 2 && !/^(Cama|Colchon|Colchón|Televisor|Refrigeradora|Lavadora|Estufa|Aire|Bocina|Horno|Microondas|Freidora|Celular|Laptop|Tablet|Consola|Secadora|Congelador|Minicomponente|Individual|Matrimonial|Queen|King)$/i.test(w));
        brand = first ? titleBrand(first) : '';
      }
      return { ...p, brand, bk: brandKey(brand), models: modelCandidates(p), barcode: (p.barcode || '').replace(/^0+/, '') };
    });
}

export function group(items) {
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const byCat = {};
  items.forEach((p, i) => (byCat[p.cat] ||= []).push(i));
  for (const idxs of Object.values(byCat)) {
    // Índice por prefijo de 7 caracteres del modelo para no comparar todo contra todo.
    const buckets = {};
    for (const i of idxs) for (const m of items[i].models) if (m.length >= 7) (buckets[m.slice(0, 7)] ||= new Set()).add(i);
    for (const i of idxs) if (items[i].barcode) (buckets[`bc:${items[i].barcode}`] ||= new Set()).add(i);
    for (const set of Object.values(buckets)) {
      const arr = [...set];
      for (let x = 0; x < arr.length; x++) for (let y = x + 1; y < arr.length; y++) {
        if (find(arr[x]) !== find(arr[y]) && compatible(items[arr[x]], items[arr[y]])) parent[find(arr[x])] = find(arr[y]);
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
      .map((p) => ({ s: p.store, p: p.price, r: Math.max(p.regular || p.price, p.price), u: p.url, a: p.available ? 1 : 0 }))
      .sort((a, b) => (b.a - a.a) || (a.p - b.p));
    const head = ps.find((p) => p.img) || ps[0];
    const model = ps.map((p) => p.models[0]).filter(Boolean).sort((a, b) => a.length - b.length)[0] || '';
    return {
      id: `${ps[0].store}-${ps[0].sku || ps[0].url}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60),
      c: ps[0].cat, b: ps.find((p) => p.brand)?.brand || '', n: ps[0].name.replace(/\s+/g, ' ').trim(),
      m: model, i: head.img || '', o: offers,
    };
  });
}

export function buildCatalog(rawByStore, status) {
  const all = clean(Object.values(rawByStore).flat());
  const products = group(all).sort((a, b) => (b.o.length - a.o.length) || a.c.localeCompare(b.c) || a.n.localeCompare(b.n));
  return {
    updated: new Date().toISOString(),
    stores: Object.fromEntries(Object.entries(STORES).map(([id, s]) => [id, {
      name: s.name, site: s.site, count: all.filter((p) => p.store === id).length,
      ok: status[id]?.ok ?? false, updated: status[id]?.updated || null, note: status[id]?.note || '',
    }])),
    categories: CATEGORIES,
    products,
  };
}
