// Almacenes Lady Lee — Shopify. Catálogo público por colección (/collections/{handle}/products.json).
const SITE = 'https://ladylee.net';

const MAP = {
  celulares: 'celulares', laptop: 'laptops', pantallas: 'televisores',
  'barras-de-sonido': 'audio', 'parlantes-bocinas': 'audio', 'consola-d-video-jgo': 'consolas',
  refrigeracion: 'refrigeradoras', lavadora: 'lavadoras', secadora: 'lavadoras', 'centro-de-lavado': 'lavadoras',
  'estufas-gas': 'estufas', 'estufas-electricas': 'estufas', microondas: 'microondas',
  'aires-acondicionados': 'aires', camas: 'camas', freidoras: 'freidoras',
};

export async function scrapeLadyLee({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [handle, cat] of Object.entries(MAP)) {
    for (let page = 1; page <= 20; page++) {
      const res = await fetch(`${SITE}/collections/${handle}/products.json?limit=250&page=${page}`);
      if (!res.ok) throw new Error(`Lady Lee ${handle} HTTP ${res.status}`);
      const { products = [] } = await res.json();
      for (const p of products) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        if (cat === 'aires' && /enfriador|ventilador/i.test(p.title)) continue;
        const v = (p.variants || []).find((x) => x.available) || p.variants?.[0];
        const price = Number(v?.price || 0);
        if (!price) continue;
        out.push({
          store: 'ladylee', cat, brand: p.vendor || '', name: String(p.title || '').replace(/\s+/g, ' ').trim(),
          price, regular: Math.max(price, Number(v.compare_at_price || 0)),
          available: (p.variants || []).some((x) => x.available),
          url: `${SITE}/products/${p.handle}`,
          img: (p.images?.[0]?.src || '').split('?')[0],
          sku: String(v.sku || p.id), model: '', barcode: String(v.barcode || ''),
        });
      }
      if (products.length < 250) break;
      await sleep(500);
    }
    await sleep(400);
  }
  return out;
}
