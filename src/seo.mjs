// Páginas estáticas para buscadores (Google no indexa las rutas con #): una por categoría y una por
// producto, más sitemap.xml y robots.txt. Se generan al publicar, a partir de site/catalog.json, y no se
// guardan en el repositorio. Cada página es útil por sí sola y enlaza al comparador interactivo.
// Uso: SITE_URL=https://vitrinahn.shop node src/seo.mjs
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { CATEGORIES, STORES } from './taxonomy.mjs';

const SITE = (process.env.SITE_URL || 'https://vitrinahn.shop').replace(/\/$/, '');
const catalog = JSON.parse(await readFile('site/catalog.json', 'utf8'));
const products = catalog.products;
const cats = catalog.categories;
const storeName = (id) => STORES[id]?.name || id;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (v) => 'L ' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const today = new Date(catalog.updated).toISOString().slice(0, 10);
const updatedText = new Date(catalog.updated).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Tegucigalpa' });

// Mismo cálculo que en index.html (productSlug): nombre + huella corta del id.
export const fnv = (s) => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
export const slugify = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/["”″]/g, '-pulgadas').replace(/\+/g, '-plus').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
export const productSlug = (p) => `${slugify(p.n)}-${fnv(p.id)}`;

const pkey = (p) => p.o.map((o) => o.k).filter(Boolean).sort()[0] || p.id;
const bestOf = (p) => { const av = p.o.filter((o) => o.a); return [...(av.length ? av : p.o)].sort((a, b) => a.p - b.p)[0]; };
const thumb = (p) => (p.t ? `thumbs/${p.t}.webp` : '');
const catName = (id) => cats.find((c) => c.id === id)?.name || id;

const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#059669"/><path d="M13 17.5A4.5 4.5 0 0 1 17.5 13h16.6a4.5 4.5 0 0 1 3.2 1.3l12.9 12.9a4.5 4.5 0 0 1 0 6.4L33.6 50.2a4.5 4.5 0 0 1-6.4 0L14.3 37.3a4.5 4.5 0 0 1-1.3-3.2Z" fill="#fff"/><circle cx="22.5" cy="22.5" r="3.6" fill="#059669"/><path d="M25 35.5l5.5 5.5 11-11" fill="none" stroke="#059669" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CSS = `:root{--ink:#0B1F17;--muted:#56645D;--line:#E3E9E6;--act:#059669;--soft:#E8F7F0}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.55 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--act)}.wrap{max-width:1040px;margin:0 auto;padding:0 18px}
.top{border-bottom:1px solid var(--line)}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;height:62px}
.logo{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:20px;color:var(--ink);text-decoration:none;letter-spacing:-.02em}.logo svg{width:30px;height:30px}.logo span{color:var(--act);margin-left:-5px}
.cta{background:var(--act);color:#fff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:10px;font-size:14.5px;white-space:nowrap}
main{padding:22px 0 50px}.crumb{font-size:14px;color:var(--muted)}.crumb a{color:var(--muted)}
h1{font-size:clamp(24px,4vw,34px);line-height:1.15;letter-spacing:-.02em;margin:8px 0 8px}h2{font-size:20px;margin:30px 0 10px}
.lead{color:var(--muted);margin:0 0 18px;max-width:75ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;list-style:none;padding:0;margin:0}
.grid li a{display:flex;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:12px;padding:12px;height:100%;text-decoration:none;color:var(--ink)}
.grid img{width:100%;aspect-ratio:1;object-fit:contain;background:#fff}.grid .n{font-weight:600;font-size:14.5px;line-height:1.3}
.grid .p{font-weight:800;font-size:18px}.grid .s{font-size:13px;color:var(--muted)}
.prod{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:28px;align-items:start}
.prod img{width:100%;max-width:440px;aspect-ratio:1;object-fit:contain;border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff}
.price{font-size:40px;font-weight:800;letter-spacing:-.02em;margin:6px 0 0}.where{color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}th{font-size:13px;color:var(--muted)}
td.num{white-space:nowrap;font-variant-numeric:tabular-nums}tr.best td{background:var(--soft)}
.chips a{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 11px;margin:0 6px 8px 0;text-decoration:none;color:var(--ink);font-size:14px}
.note{font-size:13px;color:var(--muted);margin-top:10px}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:13.5px}footer .wrap{padding-block:20px 40px}footer a{color:var(--muted)}
@media (max-width:700px){.prod{grid-template-columns:minmax(0,1fr)}.price{font-size:34px}th.h,td.h{display:none}}`;

function page({ path, title, desc, image, body, jsonld, depth }) {
  const up = '../'.repeat(depth);
  const url = `${SITE}/${path}`;
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<meta property="og:type" content="website"><meta property="og:site_name" content="Vitrina HN"><meta property="og:locale" content="es_HN">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${image ? `${SITE}/${image}` : `${SITE}/og.png`}">
<meta name="twitter:card" content="${image ? 'summary' : 'summary_large_image'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}seo.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body>
<header class="top"><div class="wrap bar"><a class="logo" href="${up}">${LOGO}Vitrina<span>HN</span></a><a class="cta" href="${up}">Abrir el comparador</a></div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap"><p>Vitrina HN es un sitio independiente y no está afiliado a ninguna de las tiendas. Precios referenciales actualizados el ${esc(updatedText)}: el precio válido es el que muestra la tienda al comprar. <a href="${up}aviso-legal.html">Aviso legal</a></p>
<p>${cats.map((c) => `<a href="${up}${c.id}/">${esc(c.name)}</a>`).join(' · ')}</p></div></footer>
</body></html>`;
}

function card(p, up) {
  const b = bestOf(p);
  return `<li><a href="${up}p/${productSlug(p)}/">${p.t ? `<img src="${up}${thumb(p)}" alt="${esc(p.n)}" loading="lazy" width="200" height="200">` : ''}<span class="n">${esc(p.n)}</span><span class="p">${money(b.p)}</span><span class="s">${p.o.length > 1 ? `En ${p.o.length} tiendas · más barato en ${esc(storeName(b.s))}` : `En ${esc(storeName(b.s))}`}</span></a></li>`;
}

// Limpia lo generado en la corrida anterior.
for (const c of CATEGORIES) await rm(`site/${c.id}`, { recursive: true, force: true });
await rm('site/p', { recursive: true, force: true });

await writeFile('site/seo.css', CSS);
const urls = [{ loc: `${SITE}/`, pri: '1.0' }];

// ---- Categorías ----
for (const c of cats) {
  const list = products.filter((p) => p.c === c.id).sort((a, b) => (b.o.length - a.o.length) || (bestOf(a).p - bestOf(b).p));
  const multi = list.filter((p) => p.o.length > 1).length;
  const stores = [...new Set(list.flatMap((p) => p.o.map((o) => o.s)))];
  const minP = Math.min(...list.map((p) => bestOf(p).p));
  const brands = Object.entries(list.reduce((m, p) => { if (p.b) m[p.b] = (m[p.b] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([b]) => b);
  const name = c.name.toLowerCase();
  const title = `${c.name} en Honduras: compara precios en ${stores.length} tiendas | Vitrina HN`;
  const desc = `Compara ${list.length.toLocaleString('en-US')} ${name} en ${stores.map(storeName).slice(0, 6).join(', ')} y más. Desde ${money(minP)}. ${brands.slice(0, 4).join(', ')}. Precios actualizados a diario.`;
  const top = list.slice(0, 120);
  const body = `<p class="crumb"><a href="../">Inicio</a> › ${esc(c.name)}</p>
<h1>${esc(c.name)} en Honduras: precios comparados</h1>
<p class="lead">${list.length.toLocaleString('en-US')} productos de ${stores.length} tiendas (${esc(stores.map(storeName).join(', '))}). ${multi} se venden en 2 o más tiendas, para que veas dónde sale más barato. Actualizado el ${esc(updatedText)}.</p>
${brands.length ? `<p class="chips">${brands.map((b) => `<a href="../#${c.id}">${esc(b)}</a>`).join('')}</p>` : ''}
<ul class="grid">${top.map((p) => card(p, '../')).join('')}</ul>
${list.length > top.length ? `<p class="note">Mostrando ${top.length} de ${list.length.toLocaleString('en-US')}. <a href="../#${c.id}">Ver todos con filtros en el comparador</a>.</p>` : ''}`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: `${SITE}/${c.id}/`,
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: c.name, item: `${SITE}/${c.id}/` }] },
  };
  await mkdir(`site/${c.id}`, { recursive: true });
  await writeFile(`site/${c.id}/index.html`, page({ path: `${c.id}/`, title, desc, body, jsonld, depth: 1 }));
  urls.push({ loc: `${SITE}/${c.id}/`, pri: '0.8' });
}

// ---- Productos ----
let n = 0;
for (const p of products) {
  const slug = productSlug(p);
  const offers = [...p.o].sort((a, b) => (b.a - a.a) || (a.p - b.p));
  const b = bestOf(p);
  const hi = Math.max(...offers.filter((o) => o.a).map((o) => o.p), b.p);
  const where = offers.length > 1 ? `más barato en ${storeName(b.s)}` : `en ${storeName(b.s)}`;
  const title = `${p.n}: precio en Honduras desde ${money(b.p)} | Vitrina HN`;
  const desc = offers.length > 1
    ? `${p.n} desde ${money(b.p)} en ${storeName(b.s)}. Compara el precio en ${offers.map((o) => storeName(o.s)).join(', ')}${hi > b.p ? `: ahorra hasta ${money(hi - b.p)}` : ''}.`
    : `${p.n} a ${money(b.p)} en ${storeName(b.s)}. Precio actualizado el ${updatedText} y comparado con las tiendas de Honduras.`;
  const rows = offers.map((o) => `<tr class="${o === b ? 'best' : ''}"><td>${esc(storeName(o.s))}</td><td class="num"><strong>${money(o.p)}</strong></td><td class="num h">${o.r > o.p ? `<s>${money(o.r)}</s>` : '—'}</td><td class="h">${o.a ? 'Disponible' : 'Agotado'}</td><td><a href="${esc(o.u)}" rel="nofollow noopener" target="_blank">Ver en tienda ›</a></td></tr>`).join('');
  const related = products.filter((x) => x !== p && x.c === p.c && x.b === p.b).sort((a, x) => Math.abs(bestOf(a).p - b.p) - Math.abs(bestOf(x).p - b.p)).slice(0, 8);
  const body = `<p class="crumb"><a href="../../">Inicio</a> › <a href="../../${p.c}/">${esc(catName(p.c))}</a>${p.b ? ` › ${esc(p.b)}` : ''}</p>
<div class="prod"><div>${p.t ? `<img src="../../${thumb(p)}" alt="${esc(p.n)}" width="440" height="440">` : ''}</div>
<div><p class="crumb">${esc(p.b || catName(p.c))}${p.m ? ` · Modelo ${esc(p.m)}` : ''}</p>
<h1>${esc(p.n)}</h1>
<p class="price">${money(b.p)}</p><p class="where">${esc(where.charAt(0).toUpperCase() + where.slice(1))}${hi > b.p ? ` · ahorras hasta ${money(hi - b.p)} frente a la tienda más cara` : ''}</p>
<p><a class="cta" href="../../#p/${encodeURIComponent(pkey(p))}">Ver historial y comparar</a></p></div></div>
<h2>Precio de ${esc(p.n)} en cada tienda</h2>
<table><thead><tr><th>Tienda</th><th>Precio</th><th class="h">Antes</th><th class="h">Disponibilidad</th><th></th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Precios referenciales tomados de cada tienda el ${esc(updatedText)}. El precio válido es el que muestra la tienda al comprar.</p>
${related.length ? `<h2>Otros ${esc(catName(p.c).toLowerCase())} ${esc(p.b)}</h2><ul class="grid">${related.map((x) => card(x, '../../')).join('')}</ul>` : ''}`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.n, ...(p.b ? { brand: { '@type': 'Brand', name: p.b } } : {}),
    ...(p.m ? { mpn: p.m } : {}), ...(p.t ? { image: `${SITE}/${thumb(p)}` } : {}), category: catName(p.c), url: `${SITE}/p/${slug}/`,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'HNL', lowPrice: b.p, highPrice: hi, offerCount: offers.length,
      availability: offers.some((o) => o.a) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };
  await mkdir(`site/p/${slug}`, { recursive: true });
  await writeFile(`site/p/${slug}/index.html`, page({ path: `p/${slug}/`, title, desc, image: p.t ? thumb(p) : '', body, jsonld, depth: 2 }));
  urls.push({ loc: `${SITE}/p/${slug}/`, pri: offers.length > 1 ? '0.6' : '0.4' });
  n++;
}

await writeFile('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);
await writeFile('site/robots.txt', `User-agent: *\nAllow: /\nDisallow: /captura/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`SEO: ${cats.length} categorías, ${n} productos, sitemap con ${urls.length} URLs (${SITE}).`);
