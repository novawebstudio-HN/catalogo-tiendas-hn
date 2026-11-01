// Jetstereo — API propia (api.jetstereo.com), paginada de 50 en 50.
const API = 'https://api.jetstereo.com';
const SITE = 'https://www.jetstereo.com';

// id de categoría de la tienda -> categoría propia. La consulta de una categoría incluye sus subcategorías,
// así que se usan las categorías padre; las específicas van primero para que ganen.
const MAP = {
  26: 'celulares', 330: 'laptops', 30: 'laptops', 38: 'tablets', 41: 'televisores',
  49: 'audio', 212: 'audio', 46: 'audio', 52: 'consolas',
  74: 'refrigeradoras', 195: 'refrigeradoras', 77: 'lavadoras', 78: 'lavadoras',
  75: 'estufas', 76: 'microondas', 79: 'aires', 204: 'freidoras',
  91: 'monitores', 331: 'monitores', 33: 'impresoras', 89: 'smartwatches', 219: 'audifonos', 132: 'audifonos',
  147: 'videojuegos', 341: 'videojuegos', 166: 'accesorios', 284: 'accesorios',
  193: 'licuadoras', 189: 'licuadoras', 191: 'licuadoras', 190: 'licuadoras', 235: 'licuadoras',
};

export async function scrapeJetstereo({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [id, cat] of Object.entries(MAP)) {
    for (let page = 1; page <= 40; page++) {
      const res = await fetch(`${API}/categories/${id}/products-optimized?per-page=50&page=${page}`);
      if (!res.ok) throw new Error(`Jetstereo ${id} HTTP ${res.status}`);
      const j = await res.json();
      for (const p of j.content || []) {
        const sale = Number(p.price?.sale ?? 0);
        if (!sale || seen.has(p.sku || p.slug)) continue;
        seen.add(p.sku || p.slug);
        out.push({
          store: 'jetstereo', cat,
          brand: typeof p.brand === 'object' ? (p.brand?.name || '') : (p.brand || ''),
          name: p.name || '',
          price: Math.round(sale * 100) / 100,
          regular: Math.round(Number(p.price?.regular ?? sale) * 100) / 100,
          // saleStatus: AVAILABLE | STORE_AVAILABLE | OUT_OF_STOCK
          available: !/OUT_OF_STOCK|agotado/i.test(String(p.saleStatus || '')),
          url: `${SITE}/product/${p.slug}`,
          img: p.mainImage?.full || p.mainImage?.size500 || p.mainImage?.size350 || '',
          sku: String(p.sku || ''), model: String(p.model || ''),
        });
      }
      const meta = j._meta || {};
      if (!meta.pageCount || page >= meta.pageCount) break;
      await sleep(350);
    }
  }
  return out;
}
