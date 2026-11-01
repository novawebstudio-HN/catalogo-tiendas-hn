// Acosa Honduras — WooCommerce. API pública de tienda (Store API) bajo el prefijo /API/.
// Desde la nube su sitio pide verificación de navegador (no se intenta burlar): sus precios
// vienen de data/manual/acosa.json, capturado desde un navegador (tools/bookmarklet-acosa.txt).
const SITE = 'https://acosa.com.hn';

// id de categoría WooCommerce -> categoría propia (incluye subcategorías)
const MAP = {
  1954: 'celulares', 15913: 'laptops', 16252: 'tablets', 1903: 'televisores', 1747: 'audio',
  16333: 'monitores', 19574: 'monitores', 1735: 'impresoras', 4567: 'smartwatches',
  16408: 'audifonos', 16409: 'audifonos', 19558: 'audifonos',
  16434: 'accesorios', 16429: 'accesorios', 16270: 'accesorios',
  19582: 'videojuegos',
};

export const htmlToText = (h) => String(h || '')
  .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ': ').replace(/<\/tr>/gi, '\n')
  .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, '-').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();

export async function scrapeAcosa({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [id, cat] of Object.entries(MAP)) {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${SITE}/API/wc/store/v1/products?category=${id}&per_page=100&page=${page}`);
      if (!res.ok) throw new Error(`Acosa ${id} HTTP ${res.status}`);
      if (/bxVerify/i.test(res.url)) throw new Error('Acosa pide verificación de navegador a las consultas desde la nube; se usa la captura manual');
      const body = await res.text();
      if (!/^\s*\[/.test(body)) {
        const title = body.match(/<title>([^<]*)<\/title>/i)?.[1] || body.slice(0, 120).replace(/\s+/g, ' ');
        throw new Error(`Acosa ${id}: respuesta no JSON (${res.status}, ${res.headers.get('content-type')}, url final ${res.url}): ${title}`);
      }
      const list = JSON.parse(body);
      for (const p of list) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        const div = 10 ** Number(p.prices?.currency_minor_unit ?? 2);
        const price = Number(p.prices?.price || 0) / div;
        if (!price) continue;
        const attr = (re) => (p.attributes || []).find((a) => re.test(a.name))?.terms?.map((t) => t.name).join(', ') || '';
        // Productos usados o remanufacturados no se comparan con nuevos.
        if (/usad[oa]|remanufact|reacondicionad|refurb/i.test(`${p.name} ${(p.categories || []).map((c) => c.slug).join(' ')}`)) continue;
        out.push({
          store: 'acosa', cat,
          brand: attr(/^marca$/i) || (p.brands || [])[0]?.name || '',
          name: htmlToText(p.name),
          price: Math.round(price * 100) / 100,
          regular: Math.round((Number(p.prices?.regular_price || 0) / div || price) * 100) / 100,
          available: !!p.is_in_stock,
          url: p.permalink, img: p.images?.[0]?.src || '', alts: (p.images || []).slice(1, 5).map((i) => i.src),
          sku: String(p.sku || p.id), model: attr(/n[uú]mero de parte|modelo/i), barcode: attr(/c[oó]digo de barra/i).replace(/\D/g, ''),
          desc: htmlToText(p.short_description || p.description).slice(0, 900),
          specs: (p.attributes || []).filter((a) => !/c[oó]digo de barra/i.test(a.name)).map((a) => [a.name, a.terms.map((t) => t.name).join(', ')]).slice(0, 14),
        });
      }
      if (list.length < 100) break;
      await sleep(500);
    }
    await sleep(500);
  }
  return out;
}
