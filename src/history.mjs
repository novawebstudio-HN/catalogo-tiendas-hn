// Historial de precios por oferta (tienda + código). Se guarda solo cuando el precio cambia:
// cada entrada es [día, precio, precio "antes"], con día = días desde el 1 de enero de 2026 (hora de Honduras).
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';

const EPOCH = Date.UTC(2026, 0, 1);
export const dayNumber = (t = Date.now()) => Math.floor((t - 6 * 3600e3 - EPOCH) / 864e5);
const FILE = 'data/history.json';

export async function loadHistory() {
  try { return JSON.parse(await readFile(FILE, 'utf8')); } catch { return { v: 1, offers: {}, seen: {} }; }
}

// Precio vigente en un día dado (la última entrada en o antes de ese día).
const priceAt = (h, day) => { let v = null; for (const e of h) { if (e[0] <= day) v = e; else break; } return v; };

export function updateHistory(hist, catalog, today = dayNumber()) {
  for (const p of catalog.products) {
    for (const o of p.o) {
      const h = (hist.offers[o.k] ||= []);
      const last = h[h.length - 1];
      const entry = [today, o.p, o.r];
      if (last && last[0] === today) h[h.length - 1] = entry;
      else if (!last || last[1] !== o.p || last[2] !== o.r) h.push(entry);
      // Si el día anterior ya tenía el mismo precio, se fusiona (evita entradas repetidas).
      if (h.length >= 2 && h[h.length - 2][1] === h[h.length - 1][1] && h[h.length - 2][2] === h[h.length - 1][2]) h.pop();
      hist.seen[o.k] = today;
    }
  }
  // Limpieza: ofertas que no se ven hace 180 días y entradas de más de 400 días.
  for (const [k, d] of Object.entries(hist.seen)) if (today - d > 180) { delete hist.seen[k]; delete hist.offers[k]; }
  for (const h of Object.values(hist.offers)) {
    while (h.length > 1 && today - h[1][0] > 400) h.shift();
  }
  return hist;
}

// Agrega a cada oferta del catálogo: f = primer día con datos, l = precio más bajo de los 30 días
// anteriores (sin contar hoy), w = precio de hace 7 días.
export function applyStats(hist, catalog, today = dayNumber()) {
  catalog.today = today;
  catalog.epoch = '2026-01-01';
  for (const p of catalog.products) {
    for (const o of p.o) {
      const h = hist.offers[o.k];
      if (!h?.length) continue;
      o.f = h[0][0];
      if (o.f >= today) { delete o.f; continue; }
      let min = Infinity;
      const start = Math.max(o.f, today - 30);
      const first = priceAt(h, start);
      if (first) min = first[1];
      for (const e of h) if (e[0] > start && e[0] < today) min = Math.min(min, e[1]);
      if (Number.isFinite(min)) o.l = min;
      if (o.f <= today - 7) o.w = priceAt(h, today - 7)?.[1];
    }
  }
}

// Archivos de detalle por categoría (se cargan al abrir la ficha de un producto).
export async function writeDetails(catalog, hist, dir = 'site/details', today = dayNumber()) {
  await mkdir(dir, { recursive: true });
  const byCat = {};
  for (const p of catalog.products) {
    const det = p.det || {};
    const h = {};
    for (const o of p.o) {
      const e = hist.offers[o.k];
      if (e?.length) h[o.s] = e.filter((x, i) => i === e.length - 1 || today - e[i + 1]?.[0] < 120).map(([d, pr, r]) => (r !== pr ? [d, pr, r] : [d, pr]));
    }
    (byCat[p.c] ||= {})[p.id] = { ...(det.d ? { d: det.d } : {}), ...(det.s?.length ? { s: det.s } : {}), g: (det.g || []).slice(0, 8), h };
  }
  const keep = new Set();
  for (const [cat, obj] of Object.entries(byCat)) {
    await writeFile(`${dir}/${cat}.json`, JSON.stringify(obj));
    keep.add(`${cat}.json`);
  }
  for (const f of await readdir(dir)) if (!keep.has(f)) await unlink(`${dir}/${f}`);
}

export async function saveHistory(hist) {
  await mkdir('data', { recursive: true });
  await writeFile(FILE, JSON.stringify(hist));
}
