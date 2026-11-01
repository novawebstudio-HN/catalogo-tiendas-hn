// Walmart Honduras — VTEX. API pública de catálogo, igual que Elektra.
const BASE = 'https://www.walmart.com.hn';

// ruta de categoría VTEX -> [categoría propia, filtro opcional sobre el nombre]
const MAP = [
  ['/13/106/', 'celulares', /celular|smartphone|tel[eé]fono|galaxy|iphone|redmi|honor|motorola|moto /i],
  ['/13/109/516/', 'laptops'],
  ['/13/109/519/', 'tablets'], ['/13/109/831/', 'tablets'], ['/13/109/832/', 'tablets'], ['/13/109/935/', 'tablets'], ['/13/109/936/', 'tablets'],
  ['/13/108/512/', 'televisores'],
  ['/13/107/510/', 'audio'], ['/13/107/511/', 'audio'],
  ['/13/111/530/', 'lavadoras'],
  ['/13/111/531/', 'estufas', /estufa|cocina/i],
  ['/13/111/532/', 'refrigeradoras'],
  ['/13/112/534/', 'aires', /aire/i],
  ['/13/112/537/', 'freidoras', /freidora/i],
  ['/13/112/542/', 'microondas', /microond/i],
];

export async function scrapeWalmart({ fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const out = [];
  const seen = new Set();
  for (const [path, cat, only] of MAP) {
    for (let from = 0; from < 2500; from += 50) {
      const res = await fetch(`${BASE}/api/catalog_system/pub/products/search?fq=C:${path}&_from=${from}&_to=${from + 49}`);
      if (res.status === 404) break;
      if (!res.ok) throw new Error(`Walmart ${path} HTTP ${res.status}`);
      const list = await res.json();
      for (const p of list) {
        if (seen.has(p.productId)) continue;
        seen.add(p.productId);
        if (only && !only.test(p.productName || '')) continue;
        const item = p.items?.[0];
        const offer = item?.sellers?.[0]?.commertialOffer;
        if (!offer || !offer.Price) continue;
        out.push({
          store: 'walmart', cat, brand: p.brand || '', name: (p.productName || '').replace(/\s+/g, ' ').trim(),
          price: offer.Price, regular: Math.max(offer.Price, offer.ListPrice || 0),
          available: (offer.AvailableQuantity ?? 1) > 0,
          url: p.link || `${BASE}/${p.linkText}/p`,
          img: (item.images?.[0]?.imageUrl || '').split('?')[0],
          sku: String(item.itemId || p.productId || ''), model: '', barcode: String(item.ean || ''),
        });
      }
      if (list.length < 50) break;
      await sleep(400);
    }
  }
  return out;
}
