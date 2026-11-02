// Páginas estáticas para buscadores (Google no indexa las rutas con #): categorías, marca por categoría,
// modelos (todas las capacidades y colores), productos, "dónde está más barato", sitemap.xml y robots.txt. Se generan al publicar, a partir de site/catalog.json, y no se
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


// ---- Agrupación por modelo: celulares y tablets por el nombre del modelo; el resto por familia de variantes ----
const MODEL_CATS = new Set(['celulares', 'tablets']);
const modelName = (p) => (MODEL_CATS.has(p.c) && p.n.includes(' · ') ? p.n.split(' · ')[0] : (p.v ? p.n.split(' · ')[0] : ''));
const groups = new Map();
for (const p of products) {
  const key = MODEL_CATS.has(p.c) && p.n.includes(' · ') ? `${p.c}|${modelName(p)}` : (p.v ? `v|${p.v}` : '');
  if (!key) continue;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}
const modelOf = new Map(); // producto -> { name, slug, items }
for (const [key, items] of groups) {
  if (items.length < 2) continue;
  const name = modelName(items[0]);
  if (!name || name.length < 4) continue;
  const m = { key, name, slug: `${slugify(name)}-${fnv(key)}`, items, c: items[0].c, b: items.find((x) => x.b)?.b || '' };
  for (const p of items) modelOf.set(p, m);
}
const models = [...new Set(modelOf.values())];
const prodUrl = (p, up) => (modelOf.has(p) ? `${up}m/${modelOf.get(p).slug}/` : `${up}p/${productSlug(p)}/`);
const variantLabel = (p, m) => p.n.slice(m.name.length).replace(/^\s*·\s*/, '') || p.n;

function card(p, up, label) {
  const b = bestOf(p);
  return `<li><a href="${up}p/${productSlug(p)}/">${p.t ? `<img src="${up}${thumb(p)}" alt="${esc(p.n)}" loading="lazy" width="200" height="200">` : ''}<span class="n">${esc(label || p.n)}</span><span class="p">${money(b.p)}</span><span class="s">${p.o.length > 1 ? `En ${p.o.length} tiendas · más barato en ${esc(storeName(b.s))}` : `En ${esc(storeName(b.s))}`}</span></a></li>`;
}
function modelCard(m, up) {
  const all = m.items.flatMap((p) => p.o.map((o) => ({ ...o, p0: p })));
  const best = m.items.map((p) => [p, bestOf(p)]).sort((a, b) => a[1].p - b[1].p)[0];
  const stores = new Set(all.map((o) => o.s)).size;
  const img = m.items.find((p) => p.t);
  return `<li><a href="${up}m/${m.slug}/">${img ? `<img src="${up}${thumb(img)}" alt="${esc(m.name)}" loading="lazy" width="200" height="200">` : ''}<span class="n">${esc(m.name)}</span><span class="p">Desde ${money(best[1].p)}</span><span class="s">${m.items.length} versiones · ${stores} tienda${stores > 1 ? 's' : ''}</span></a></li>`;
}
// Tarjetas de una lista: un modelo aparece una sola vez.
function cardsFor(list, up, max) {
  const seen = new Set(); const out = [];
  for (const p of list) {
    const m = modelOf.get(p);
    if (m) { if (seen.has(m)) continue; seen.add(m); out.push(modelCard(m, up)); } else out.push(card(p, up));
    if (out.length >= max) break;
  }
  return { html: out.join(''), shown: out.length, total: new Set(list.map((p) => modelOf.get(p) || p)).size };
}
// Qué tienda es más barata, entre los productos que están en 2 o más tiendas.
function cheapestStores(list) {
  const multi = list.filter((p) => p.o.filter((o) => o.a).length > 1);
  const wins = {}, present = {};
  for (const p of multi) { const b = bestOf(p); wins[b.s] = (wins[b.s] || 0) + 1; for (const s of new Set(p.o.map((o) => o.s))) present[s] = (present[s] || 0) + 1; }
  return { n: multi.length, rows: Object.keys(present).map((s) => ({ s, wins: wins[s] || 0, present: present[s] })).sort((a, b) => (b.wins - a.wins) || (b.present - a.present)) };
}
const faq = (pairs) => `<h2>Preguntas frecuentes</h2>${pairs.map(([q, a]) => `<h3 style="font-size:16.5px;margin:18px 0 4px">${esc(q)}</h3><p style="margin:0">${a}</p>`).join('')}`;
const faqLd = (pairs) => ({ '@type': 'FAQPage', mainEntity: pairs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
const crumbLd = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })) });

// Limpia lo generado en la corrida anterior.
for (const c of CATEGORIES) await rm(`site/${c.id}`, { recursive: true, force: true });
for (const d of ['p', 'm', 'mas-barato']) await rm(`site/${d}`, { recursive: true, force: true });
await writeFile('site/seo.css', CSS);
const urls = [{ loc: `${SITE}/`, pri: '1.0' }];
const write = async (path, html, pri) => { await mkdir(`site/${path}`, { recursive: true }); await writeFile(`site/${path}index.html`, html); if (pri) urls.push({ loc: `${SITE}/${path}`, pri }); };
const brandSlug = (b) => slugify(b);

// ---- Categorías y marca por categoría ----
const brandPages = [];
for (const c of cats) {
  const list = products.filter((p) => p.c === c.id); // orden del catálogo: marcas conocidas y en varias tiendas primero
  const stores = [...new Set(list.flatMap((p) => p.o.map((o) => o.s)))];
  const minP = Math.min(...list.map((p) => bestOf(p).p));
  const byBrand = list.reduce((m, p) => { if (p.b) (m[p.b] ||= []).push(p); return m; }, {});
  const brands = Object.entries(byBrand).filter(([, l]) => new Set(l.map((p) => modelOf.get(p) || p)).size >= 4).sort((a, b) => b[1].length - a[1].length);
  const cs = cheapestStores(list);
  const name = c.name.toLowerCase();
  const top = cs.rows[0];
  const pairs = [
    [`¿Dónde están más baratos los ${name} en Honduras?`, cs.n ? `Entre los ${cs.n} ${name} que se venden en 2 o más tiendas, <strong>${esc(storeName(top.s))}</strong> tuvo el precio más bajo en ${top.wins} (${Math.round(100 * top.wins / cs.n)}%), según los precios del ${esc(updatedText)}. Depende del producto: revisa la tabla de cada uno.` : `Revisa cada producto: mostramos el precio en cada tienda.`],
    [`¿Cuánto cuestan los ${name} en Honduras?`, `Desde ${money(minP)}. Comparamos ${list.length.toLocaleString('en-US')} productos de ${stores.length} tiendas.`],
    [`¿Qué tiendas comparan?`, esc(stores.map(storeName).join(', ')) + '.'],
  ];
  const cards = cardsFor(list, '../', 120);
  const title = `${c.name}: precios en Honduras y dónde comprar más barato | Vitrina HN`;
  const desc = `¿Dónde están más baratos los ${name} en Honduras? Compara ${list.length.toLocaleString('en-US')} productos en ${stores.map(storeName).slice(0, 5).join(', ')} y más. Desde ${money(minP)}. Actualizado a diario.`;
  const body = `<p class="crumb"><a href="../">Inicio</a> › ${esc(c.name)}</p>
<h1>${esc(c.name)}: precios en Honduras y dónde comprar más barato</h1>
<p class="lead">${list.length.toLocaleString('en-US')} productos de ${stores.length} tiendas, con el precio de cada una. Actualizado el ${esc(updatedText)}.</p>
${brands.length ? `<p class="chips">${brands.map(([b]) => `<a href="${brandSlug(b)}/">${esc(c.name)} ${esc(b)}</a>`).join('')}</p>` : ''}
<ul class="grid">${cards.html}</ul>
${cards.total > cards.shown ? `<p class="note">Mostrando ${cards.shown} de ${cards.total.toLocaleString('en-US')}. <a href="../#${c.id}">Ver todos con filtros en el comparador</a>.</p>` : ''}
${cs.n >= 3 ? `<h2>¿Qué tienda es más barata en ${esc(name)}?</h2><p class="lead">Entre los ${cs.n} ${esc(name)} que se venden en 2 o más tiendas:</p><table><thead><tr><th>Tienda</th><th>Más barata en</th><th class="h">Productos comparados</th></tr></thead><tbody>${cs.rows.slice(0, 12).map((r) => `<tr><td>${esc(storeName(r.s))}</td><td class="num">${r.wins} (${Math.round(100 * r.wins / cs.n)}%)</td><td class="num h">${r.present}</td></tr>`).join('')}</tbody></table>` : ''}
${faq(pairs)}`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', name: title, url: `${SITE}/${c.id}/` }, crumbLd([['Inicio', `${SITE}/`], [c.name, `${SITE}/${c.id}/`]]), faqLd(pairs)] };
  await write(`${c.id}/`, page({ path: `${c.id}/`, title, desc, body, jsonld, depth: 1 }), '0.8');

  for (const [b, bl] of brands) {
    const bcs = cheapestStores(bl);
    const bmin = Math.min(...bl.map((p) => bestOf(p).p));
    const bstores = [...new Set(bl.flatMap((p) => p.o.map((o) => o.s)))];
    const bcards = cardsFor(bl, '../../', 120);
    const t = `${c.name} ${b} en Honduras: precios y dónde está más barato | Vitrina HN`;
    const d = `Compara ${bl.length} ${name} ${b} en ${bstores.map(storeName).slice(0, 5).join(', ')}${bstores.length > 5 ? ' y más' : ''}. Desde ${money(bmin)}. Precios actualizados el ${updatedText}.`;
    const bpairs = [[`¿Dónde están más baratos los ${name} ${b} en Honduras?`, bcs.n ? `<strong>${esc(storeName(bcs.rows[0].s))}</strong> tuvo el precio más bajo en ${bcs.rows[0].wins} de ${bcs.n} productos ${esc(b)} que se venden en varias tiendas (${esc(updatedText)}).` : `Revisa cada producto: mostramos el precio en cada tienda.`]];
    const bbody = `<p class="crumb"><a href="../../">Inicio</a> › <a href="../">${esc(c.name)}</a> › ${esc(b)}</p>
<h1>${esc(c.name)} ${esc(b)} en Honduras: precios comparados</h1>
<p class="lead">${bl.length} productos ${esc(b)} en ${bstores.length} tiendas (${esc(bstores.map(storeName).join(', '))}). Desde ${money(bmin)}.</p>
<ul class="grid">${bcards.html}</ul>
${faq(bpairs)}`;
    const bjson = { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', name: t, url: `${SITE}/${c.id}/${brandSlug(b)}/` }, crumbLd([['Inicio', `${SITE}/`], [c.name, `${SITE}/${c.id}/`], [b, `${SITE}/${c.id}/${brandSlug(b)}/`]]), faqLd(bpairs)] };
    await write(`${c.id}/${brandSlug(b)}/`, page({ path: `${c.id}/${brandSlug(b)}/`, title: t, desc: d, body: bbody, jsonld: bjson, depth: 2 }), '0.7');
    brandPages.push(1);
  }
}

// ---- Modelos: todas las capacidades y colores en una página ("iPhone 17 Pro Max precio Honduras") ----
for (const m of models) {
  const rows = m.items.map((p) => ({ p, b: bestOf(p) })).sort((a, b) => ((a.p.cs || 0) - (b.p.cs || 0)) || (a.b.p - b.b.p));
  const best = [...rows].sort((a, b) => a.b.p - b.b.p)[0];
  const hiAll = Math.max(...m.items.flatMap((p) => p.o.filter((o) => o.a).map((o) => o.p)), best.b.p);
  const stores = [...new Set(m.items.flatMap((p) => p.o.map((o) => o.s)))];
  const caps = [...new Set(m.items.map((p) => p.cp).filter(Boolean))];
  const img = m.items.find((p) => p.t);
  const title = `${m.name} precio en Honduras: ¿dónde está más barato? | Vitrina HN`;
  const desc = `${m.name} en Honduras desde ${money(best.b.p)} en ${storeName(best.b.s)}. Compara ${m.items.length} versiones${caps.length > 1 ? ` (${caps.slice(0, 3).join(', ')})` : ''} en ${stores.map(storeName).slice(0, 5).join(', ')}${stores.length > 5 ? ' y más' : ''}.`;
  const pairs = [
    [`¿Dónde está más barato el ${m.name} en Honduras?`, `En <strong>${esc(storeName(best.b.s))}</strong>, a ${money(best.b.p)} (${esc(variantLabel(best.p, m))}), según los precios del ${esc(updatedText)}.`],
    [`¿Cuánto cuesta el ${m.name} en Honduras?`, `Entre ${money(best.b.p)} y ${money(hiAll)}, según la tienda${caps.length > 1 ? ', la capacidad' : ''} y el color.`],
    [`¿En qué tiendas se vende?`, esc(stores.map(storeName).join(', ')) + '.'],
  ];
  const body = `<p class="crumb"><a href="../../">Inicio</a> › <a href="../../${m.c}/">${esc(catName(m.c))}</a>${m.b ? ` › <a href="../../${m.c}/${brandSlug(m.b)}/">${esc(m.b)}</a>` : ''}</p>
<div class="prod"><div>${img ? `<img src="../../${thumb(img)}" alt="${esc(m.name)}" width="440" height="440">` : ''}</div>
<div><p class="crumb">${esc(m.b || catName(m.c))}</p>
<h1>${esc(m.name)}: precio en Honduras</h1>
<p class="price">Desde ${money(best.b.p)}</p><p class="where">Más barato en ${esc(storeName(best.b.s))} · ${esc(variantLabel(best.p, m))}</p>
<p><a class="cta" href="../../#p/${encodeURIComponent(pkey(best.p))}">Comparar y ver historial</a></p></div></div>
<h2>Precio de cada versión del ${esc(m.name)}</h2>
<table><thead><tr><th>Versión</th><th>Precio más bajo</th><th>Tienda</th><th class="h">Tiendas</th></tr></thead><tbody>${rows.map(({ p, b }) => `<tr class="${p === best.p ? 'best' : ''}"><td><a href="../../p/${productSlug(p)}/">${esc(variantLabel(p, m))}</a></td><td class="num"><strong>${money(b.p)}</strong></td><td>${esc(storeName(b.s))}</td><td class="num h">${p.o.length}</td></tr>`).join('')}</tbody></table>
<p class="note">Precios referenciales tomados de cada tienda el ${esc(updatedText)}. El precio válido es el que muestra la tienda al comprar.</p>
${faq(pairs)}`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Product', name: m.name, ...(m.b ? { brand: { '@type': 'Brand', name: m.b } } : {}), ...(img ? { image: `${SITE}/${thumb(img)}` } : {}), category: catName(m.c), url: `${SITE}/m/${m.slug}/`,
      offers: { '@type': 'AggregateOffer', priceCurrency: 'HNL', lowPrice: best.b.p, highPrice: hiAll, offerCount: m.items.reduce((n, p) => n + p.o.length, 0), availability: 'https://schema.org/InStock' } },
    crumbLd([['Inicio', `${SITE}/`], [catName(m.c), `${SITE}/${m.c}/`], [m.name, `${SITE}/m/${m.slug}/`]]), faqLd(pairs)] };
  await write(`m/${m.slug}/`, page({ path: `m/${m.slug}/`, title, desc, image: img ? thumb(img) : '', body, jsonld, depth: 2 }), '0.7');
}

// ---- Productos ----
let n = 0;
for (const p of products) {
  const slug = productSlug(p);
  const m = modelOf.get(p);
  const offers = [...p.o].sort((a, b) => (b.a - a.a) || (a.p - b.p));
  const b = bestOf(p);
  const hi = Math.max(...offers.filter((o) => o.a).map((o) => o.p), b.p);
  const multi = offers.length > 1;
  const title = multi ? `${p.n}: dónde está más barato en Honduras (${money(b.p)}) | Vitrina HN` : `${p.n}: precio en Honduras ${money(b.p)} | Vitrina HN`;
  const desc = multi
    ? `¿Dónde está más barato el ${p.n}? Hoy en ${storeName(b.s)} a ${money(b.p)}. Compara ${offers.map((o) => storeName(o.s)).join(', ')}${hi > b.p ? `: ahorra hasta ${money(hi - b.p)}` : ''}.`
    : `${p.n} a ${money(b.p)} en ${storeName(b.s)}. Precio actualizado el ${updatedText}.`;
  const rows = offers.map((o) => `<tr class="${o === b ? 'best' : ''}"><td>${esc(storeName(o.s))}</td><td class="num"><strong>${money(o.p)}</strong></td><td class="num h">${o.r > o.p ? `<s>${money(o.r)}</s>` : '—'}</td><td class="h">${o.a ? 'Disponible' : 'Agotado'}</td><td><a href="${esc(o.u)}" rel="nofollow noopener" target="_blank">Ver en tienda ›</a></td></tr>`).join('');
  const siblings = m ? m.items.filter((x) => x !== p) : [];
  const related = products.filter((x) => x !== p && x.c === p.c && x.b === p.b && !siblings.includes(x)).sort((a, x) => Math.abs(bestOf(a).p - b.p) - Math.abs(bestOf(x).p - b.p)).slice(0, 8);
  const body = `<p class="crumb"><a href="../../">Inicio</a> › <a href="../../${p.c}/">${esc(catName(p.c))}</a>${m ? ` › <a href="../../m/${m.slug}/">${esc(m.name)}</a>` : ''}</p>
<div class="prod"><div>${p.t ? `<img src="../../${thumb(p)}" alt="${esc(p.n)}" width="440" height="440">` : ''}</div>
<div><p class="crumb">${esc(p.b || catName(p.c))}${p.m ? ` · Modelo ${esc(p.m)}` : ''}</p>
<h1>${esc(p.n)}</h1>
<p class="price">${money(b.p)}</p><p class="where">${multi ? 'Más barato en' : 'En'} ${esc(storeName(b.s))}${hi > b.p ? ` · ahorras hasta ${money(hi - b.p)} frente a la tienda más cara` : ''}</p>
<p><a class="cta" href="../../#p/${encodeURIComponent(pkey(p))}">Ver historial y comparar</a></p></div></div>
<h2>Precio en cada tienda</h2>
<table><thead><tr><th>Tienda</th><th>Precio</th><th class="h">Antes</th><th class="h">Disponibilidad</th><th></th></tr></thead><tbody>${rows}</tbody></table>
<p class="note">Precios referenciales tomados de cada tienda el ${esc(updatedText)}. El precio válido es el que muestra la tienda al comprar.</p>
${siblings.length ? `<h2>Otras versiones del ${esc(m.name)}</h2><ul class="grid">${siblings.slice(0, 12).map((x) => card(x, '../../', variantLabel(x, m))).join('')}</ul><p class="note"><a href="../../m/${m.slug}/">Ver todas las versiones del ${esc(m.name)}</a></p>` : ''}
${related.length ? `<h2>Otros ${esc(catName(p.c).toLowerCase())} ${esc(p.b)}</h2><ul class="grid">${related.map((x) => card(x, '../../')).join('')}</ul>` : ''}`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.n, ...(p.b ? { brand: { '@type': 'Brand', name: p.b } } : {}),
    ...(p.m ? { mpn: p.m } : {}), ...(p.t ? { image: `${SITE}/${thumb(p)}` } : {}), category: catName(p.c), url: `${SITE}/p/${slug}/`,
    offers: { '@type': 'AggregateOffer', priceCurrency: 'HNL', lowPrice: b.p, highPrice: hi, offerCount: offers.length,
      availability: offers.some((o) => o.a) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };
  await write(`p/${slug}/`, page({ path: `p/${slug}/`, title, desc, image: p.t ? thumb(p) : '', body, jsonld, depth: 2 }), multi ? '0.6' : '0.4');
  n++;
}

// ---- "Dónde está más barato": las mayores diferencias de precio entre tiendas ----
{
  const gaps = products.map((p) => { const av = p.o.filter((o) => o.a); if (av.length < 2) return null; const lo = Math.min(...av.map((o) => o.p)), hi = Math.max(...av.map((o) => o.p)); return { p, lo, hi, gap: hi - lo }; })
    .filter((x) => x && x.gap >= 200 && x.hi / x.lo < 2.2).sort((a, b) => b.gap - a.gap).slice(0, 80);
  const title = '¿Dónde está más barato? Diferencias de precio entre tiendas de Honduras | Vitrina HN';
  const desc = `El mismo producto puede costar miles de lempiras menos en otra tienda. Las ${gaps.length} mayores diferencias de precio entre Diunsa, Jetstereo, La Curacao, Walmart, Elektra y más, actualizadas el ${updatedText}.`;
  const body = `<p class="crumb"><a href="../">Inicio</a> › Dónde está más barato</p>
<h1>¿Dónde está más barato? Las mayores diferencias de precio en Honduras</h1>
<p class="lead">El mismo producto, en la tienda más barata y en la más cara. Actualizado el ${esc(updatedText)}.</p>
<table><thead><tr><th>Producto</th><th>Más barato</th><th class="h">Más caro</th><th>Ahorras</th></tr></thead><tbody>${gaps.map(({ p, lo, hi, gap }) => { const b = bestOf(p); return `<tr><td><a href="../p/${productSlug(p)}/">${esc(p.n)}</a></td><td class="num">${money(lo)}<br><span class="s" style="color:var(--muted);font-size:13px">${esc(storeName(b.s))}</span></td><td class="num h">${money(hi)}</td><td class="num"><strong>${money(gap)}</strong></td></tr>`; }).join('')}</tbody></table>`;
  await write('mas-barato/', page({ path: 'mas-barato/', title, desc, body, jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: `${SITE}/mas-barato/` }, depth: 1 }), '0.9');
}

await writeFile('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`);
await writeFile('site/robots.txt', `User-agent: *\nAllow: /\nDisallow: /captura/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`SEO: ${cats.length} categorías, ${brandPages.length} marcas, ${models.length} modelos, ${n} productos; sitemap con ${urls.length} URLs (${SITE}).`);
