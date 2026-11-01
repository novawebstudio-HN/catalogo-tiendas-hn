// Sycom Honduras — Odoo eCommerce. Se lee el listado público de la tienda (/shop, HTML, permitido por su
// robots.txt) de 500 en 500 y se clasifica cada producto por su nombre. La tienda no publica precio anterior.
import { catFromName } from '../classify.mjs';
import { brandFromName } from './unicomer.mjs';
import { htmlToText } from './acosa.mjs';

const SITE = 'https://www.sycomhn.com';
const PER_PAGE = 500;

const dec = (s) => htmlToText(String(s || '')).replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s || '').replace(/[^\d.]/g, '')) || 0;

// Las laptops vienen con regalos en el nombre ("… + Mochila + Kaspersky + Mouse"): se quitan.
const stripGifts = (name) => String(name).replace(/\s*\+\s*(mochila|kaspersky|mouse|antivirus|office|maletin|malet[ií]n|audifonos?)\b.*$/i, '').trim();

// Clasificación: primero las reglas propias de la tienda, luego la general por nombre.
function classify(name) {
  if (/\b(power ?bank|cargador|cable (usb|hdmi|tipo|lightning|displayport)|adaptador (usb|de corriente|hdmi)|hub usb)\b/i.test(name)
    && !/\b(para auto|carro|coche|organizador|soporte|stand)\b/i.test(name)) return 'accesorios';
  if (/^(cartucho|tinta|t[oó]ner|cinta|ribbon|papel|etiquetas?|rollo|botella)\b/i.test(name)) return null; // consumibles
  if (/\b(bater[ií]a para|repuesto|mochila|maletin|malet[ií]n|funda|estuche|stand|soporte|bracket|montaje|kit de limpieza|extensi[oó]n|regleta|supresor|ups)\b/i.test(name) || /^(base|case)\b/i.test(name)) return null;
  // Impresoras térmicas, de punto de venta y de etiquetas no son de uso doméstico.
  if (/impresora/i.test(name) && /t[eé]rmica|\bpos\b|zebra|etiqueta|matricial|plotter|sublimaci/i.test(name)) return null;
  return catFromName(name);
}

// Tarjetas del listado: cada producto es un <form itemtype="http://schema.org/Product">.
export function parseList(html) {
  const out = [];
  for (const chunk of html.split('itemtype="http://schema.org/Product"').slice(1)) {
    const block = chunk.slice(0, chunk.indexOf('</form>') > 0 ? chunk.indexOf('</form>') : 4000);
    const href = block.match(/<a[^>]+itemprop="url"[^>]+href="([^"?]+)/)?.[1] || block.match(/href="(\/shop\/[^"?#]+)/)?.[1];
    const name = dec(block.match(/itemprop="name"[^>]*>([\s\S]*?)<\//)?.[1]);
    const price = num(block.match(/itemprop="price"[^>]*content="([^"]+)"/)?.[1] || block.match(/oe_currency_value">([^<]+)</)?.[1]);
    const img = block.match(/<img[^>]+itemprop="image"[^>]+src="([^"]+)"/)?.[1] || '';
    const id = block.match(/name="product_template_id"[^>]*value="(\d+)"/)?.[1] || href?.match(/-(\d+)$/)?.[1] || '';
    if (!href || !name) continue;
    out.push({ id, href, name, price, img, soldOut: /agotado|sold ?out|o_wsale_product_sold_out/i.test(block) });
  }
  return out;
}

export async function scrapeSycom({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const list = [];
  const seen = new Set();
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${SITE}/shop${page > 1 ? `/page/${page}` : ''}?ppg=${PER_PAGE}`, { headers: { Accept: 'text/html' } });
    if (res.status === 404) break;
    if (!res.ok) throw new Error(`Sycom página ${page} HTTP ${res.status}`);
    const items = parseList(await res.text());
    let fresh = 0;
    for (const p of items) { if (!seen.has(p.id)) { seen.add(p.id); list.push(p); fresh++; } }
    if (!fresh || items.length < PER_PAGE) break;
    await sleep(800);
  }
  const out = [];
  let scanned = 0;
  for (const p of list) {
    scanned++;
    p.name = stripGifts(p.name);
    const cat = classify(p.name);
    if (!cat || !p.price) continue;
    // El nombre viene como "Laptop HP 15 | Core i5 | 8GB | 512GB SSD | 15-FD0021LA": el último tramo suele ser el modelo.
    const parts = p.name.split('|').map((x) => x.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    const model = parts.length > 1 && /\d/.test(last) && !/\s/.test(last) && last.length <= 20 ? last : '';
    out.push({
      store: 'sycom', cat, brand: brandFromName(p.name), name: parts.join(' · '),
      price: p.price, regular: p.price, available: !p.soldOut,
      url: `${SITE}${p.href}`,
      img: p.img ? `${SITE}${p.img.replace(/image_(128|256|512)\b/, 'image_1024')}` : '',
      sku: p.id, model,
    });
  }
  console.log(`  Sycom: ${scanned} productos revisados, ${out.length} dentro de alcance`);
  return out;
}
