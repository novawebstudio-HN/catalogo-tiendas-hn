// Jetstereo — API propia (api.jetstereo.com), paginada de 50 en 50.
const API = 'https://api.jetstereo.com';
const SITE = 'https://www.jetstereo.com';

const MAP = {
  26: 'celulares', 325: 'laptops', 32: 'laptops', 330: 'laptops', 38: 'tablets', 41: 'televisores',
  47: 'audio', 48: 'audio', 212: 'audio', 52: 'consolas',
  74: 'refrigeradoras', 195: 'refrigeradoras', 77: 'lavadoras', 78: 'lavadoras',
  75: 'estufas', 76: 'microondas', 79: 'aires', 204: 'freidoras',
};

export async function scrapeJetstereo({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  for (const [id, cat] of Object.entries(MAP)) {
    for (let page = 1; page <= 40; page++) {
      const res = await fetch(`${API}/categories/${id}/products-optimized?per-page=50&page=${page}`);
      if (!res.ok) throw new Error(`Jetstereo ${id} HTTP ${res.status}`);
      const j = await res.json();
      for (const p of j.content || []) {
        const sale = Number(p.price?.sale ?? 0);
        if (!sale) continue;
        out.push({
          store: 'jetstereo', cat,
          brand: typeof p.brand === 'object' ? (p.brand?.name || '') : (p.brand || ''),
          name: p.name || '',
          price: Math.round(sale * 100) / 100,
          regular: Math.round(Number(p.price?.regular ?? sale) * 100) / 100,
          // saleStatus: AVAILABLE | STORE_AVAILABLE | OUT_OF_STOCK
          available: !/OUT_OF_STOCK|agotado/i.test(String(p.saleStatus || '')),
          url: `${SITE}/product/${p.slug}`,
          img: p.mainImage?.size350 || p.mainImage?.full || '',
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
