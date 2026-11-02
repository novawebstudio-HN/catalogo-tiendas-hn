// Normaliza los productos crudos de todas las tiendas y agrupa los que son el mismo modelo.
import { createHash } from 'node:crypto';
import { CATEGORIES, STORES, ACCESSORY_RE, CHARGER_RE, minPrice } from './taxonomy.mjs';
import { displayName, brandFromName, phoneKey, canonicalBrand } from './names.mjs';

const STORE_ORDER = Object.keys(STORES);
// Clave estable de una oferta (tienda + código de la tienda); sirve para el historial y los links.
export const offerKey = (p) => `${p.store}:${String(p.sku || createHash('sha1').update(String(p.url)).digest('hex').slice(0, 10)).replace(/[^\w.-]/g, '').slice(0, 40)}`;

const deaccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

const BRAND_ALIASES = { playstation: 'sony', 'sony interactive': 'sony', 'sony playstation': 'sony', xbox: 'microsoft', 'general electric': 'ge', 'black and decker': 'black+decker', 'black & decker': 'black+decker', 'black + decker': 'black+decker', 'b&d': 'black+decker', 'bd': 'black+decker', redmi: 'xiaomi', poco: 'xiaomi', 'sin marca': '' };
export const brandKey = (b) => {
  const k = deaccent(b).toLowerCase().trim();
  return (BRAND_ALIASES[k] ?? k).replace(/[^a-z0-9+]/g, '');
};
const DISPLAY_ALIASES = { iphone: 'Apple', ipad: 'Apple', playstation: 'Sony', 'sony interactive': 'Sony', xbox: 'Xbox', 'general electric': 'GE', 'black and decker': 'Black+Decker', 'black & decker': 'Black+Decker', 'samsung electronics': 'Samsung', redmi: 'Xiaomi', poco: 'Xiaomi' };
const titleBrand = (b) => {
  const s0 = String(b || '').trim();
  const s = DISPLAY_ALIASES[deaccent(s0).toLowerCase()] || s0;
  if (!s || /sin marca/i.test(s)) return '';
  if (s !== s0) return s;
  if (canonicalBrand(s)) return canonicalBrand(s);
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
    // No son modelos: capacidades/colores ("BLACK256GB"), resoluciones ("1920X1080"),
    // procesadores ("I513420H") ni códigos internos de tienda ("HN4195").
    if (/\d(GB|TB)|(GB|TB)\d|\d+X\d{3,}|^I[3579]\d{4}|^HN\d{3,5}$|BLACK|BLUE|GR[AE]Y|GREEN|WHITE|SILVER|GOLD|PINK|PURPLE|NEGRO|AZUL|GRIS|VERDE|BLANCO|PLATA|ROSA|MORADO/.test(n)) continue;
    out.push(n.replace(/^COMBO/, '').replace(/ESP$/, ''));
  }
  return [...new Set(out)].filter((n) => n.length >= 5);
}

// Capacidad (GB) para no mezclar 128 GB con 256 GB. Acepta "256GB", "256 G", "1TB" y "/128/".
const storage = (name) => {
  const N = String(name).toUpperCase();
  const m = [...N.matchAll(/(\d+)\s?(GB|TB|G|T)\b/g)].map((x) => Number(x[1]) * (x[2].startsWith('T') ? 1024 : 1));
  for (const x of N.matchAll(/\/\s?(32|64|128|256|512)\s?(?=\/|$|\s)/g)) m.push(Number(x[1]));
  const big = m.filter((v) => v >= 32);
  return big.length ? Math.max(...big) : null;
};
const inches = (name) => {
  const m = String(name).match(/(\d{2,3})\s?(?:"|”|''|pulgadas|pulg\b|in\b)/i);
  return m ? Number(m[1]) : null;
};

// Núcleo del modelo: se quitan sufijos de región o empaque que no cambian el producto
// (Samsung UN55U8000FPXPA = UN55U8000F; WA23C3553GWAP = WA23C3553GW).
const REGION_SUFFIX = /(PXPA|PXZA|PXZX|PXPR|PXPE|PXZS|PXP|PXZ|PX|AP|ESP)$/;
export function cores(models) {
  const out = new Set();
  for (let m of models) {
    if (m.length < 7) continue;
    out.add(m);
    // Algunas tiendas escriben la letra O donde el fabricante usa cero (MSM544LMLSSO = MSM544LMLSS0).
    if (/O/.test(m.slice(2))) out.add(m.slice(0, 2) + m.slice(2).replace(/O/g, '0'));
    for (let k = 0; k < 2; k++) { const s = m.replace(REGION_SUFFIX, ''); if (s === m || s.length < 7) break; m = s; out.add(m); }
  }
  return [...out];
}

// Señales de que dos productos NO son el mismo, aunque compartan código de barras o parte del modelo.
function conflict(a, b) {
  if (a.cat !== b.cat) return true;
  // Algunas tiendas cargan mal la marca; un modelo completo idéntico (9+ caracteres) o el mismo
  // código de barras pesa más que la marca.
  const strong = (a.barcode && a.barcode === b.barcode) || (a.full || a.cores).some((x) => x.length >= 9 && (b.full || b.cores).includes(x));
  if (!strong && a.bk && b.bk && a.bk !== b.bk) return true;
  const sa = storage(a.name), sb = storage(b.name);
  if (sa && sb && sa !== sb) return true;
  const ia = inches(a.name), ib = inches(b.name);
  if (ia && ib && ia !== ib) return true;
  if (Math.max(a.price, b.price) / Math.min(a.price, b.price) > 2.5) return true;
  // Misma familia pero variante distinta (UN65U8000F vs UN65U8000H, VX122C1N vs VX122C1U).
  if (a.cores.length && b.cores.length && !a.cores.some((x) => b.cores.includes(x))) {
    for (const x of a.cores) for (const y of b.cores) {
      if (x.length >= 8 && y.length >= 8 && x.slice(0, 6) === y.slice(0, 6) && !x.startsWith(y) && !y.startsWith(x)) return true;
    }
  }
  return false;
}

// Enlace directo: mismo código de barras o mismo núcleo de modelo, sin señales en contra.
function linked(a, b) {
  if (conflict(a, b)) return false;
  if (a.barcode && b.barcode && a.barcode === b.barcode) return true;
  if (a.gk && a.gk === b.gk) return true;
  if (a.ck && a.ck === b.ck && !a.ck.includes('bundle?')) return true;
  if (a.nk && a.nk === b.nk) return true;
  const fa = a.full || a.cores, fb = b.full || b.cores;
  return fa.some((x) => fb.includes(x));
}

// Descripciones para el público: sin emojis, sin frases que mencionan a una tienda, y las tablas
// que vienen aplanadas ("Marca / Samsung / Modelo / …") o líneas "clave: valor" pasan a características.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}\u{E000}-\u{F8FF}]/gu;
const STORE_WORDS = /\b(elektra|diunsa|curacao|jetstereo|walmart|lady ?lee|gallo|tropigas|radioshack|radio shack|acosa|game ?station|credigallo|tienda en l[ií]nea|nuestr[ao]s? (tienda|cr[eé]dito|opciones|sucursal)|env[ií]o gratis|cuotas|a cr[eé]dito|compr[aá] (ya|hoy|en)|agr[eé]galo al carrito)\b/i;
export function cleanDesc(text) {
  let lines = String(text || '').replace(EMOJI, '').replace(/\s+:\s+/g, ': ').split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !/^[•·\-–]\s*$/.test(l));
  const pairs = [];
  const hi = lines.findIndex((l, i) => /^(especificaci[oó]n(es)?|caracter[ií]stica(s)?)(:)?$/i.test(l) && /^(detalle|descripci[oó]n|valor)(:)?$/i.test(lines[i + 1] || ''));
  if (hi >= 0) {
    const rest = lines.slice(hi + 2);
    for (let i = 0; i + 1 < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]]);
    lines = lines.slice(0, hi);
  }
  const keep = [];
  for (const l of lines) {
    if (/^especificaci[oó]n(es)?(: ?detalle)?:?$/i.test(l)) continue;
    const m = l.match(/^([^:•·\-–][^:]{1,38}):\s*(.{1,120})$/);
    if (m && !/[.!?]$/.test(m[2]) && m[1].split(' ').length <= 5) { pairs.push([m[1].trim(), m[2].trim()]); continue; }
    keep.push(l);
  }
  const d = keep.map((l) => l.split(/(?<=[.!?])\s+/).filter((x) => !STORE_WORDS.test(x)).join(' ').trim()).filter(Boolean).join('\n');
  return { d: d.replace(/\s+([.,;:!?])/g, '$1').slice(0, 1200), pairs: pairs.filter(([k, v]) => k && v && k.length <= 40 && v.length <= 120 && !STORE_WORDS.test(`${k} ${v}`)).slice(0, 16) };
}

// Consolas: "huella" = plataforma + edición + juegos incluidos + color, porque muchas tiendas no
// publican el código de modelo (Diunsa "PS5/HW 2015/GT7/AB/DIGITAL" = Curacao "PS5 Bundle Digital con ASTRO BOT y Gran Turismo 7").
const CONSOLE_COLORS = [[/blanc|white/, 'blanco'], [/negr|black/, 'negro'], [/ne[oó]n/, 'neon'], [/azul|blue/, 'azul'], [/coral/, 'coral'], [/amarill|yellow/, 'amarillo'], [/gris|gray|grey/, 'gris'], [/morad|purple/, 'morado'], [/hyrule/, 'hyrule'], [/roj|red/, 'rojo']];
const BUNDLES = [[/astro ?bot|\bab\b/, 'astrobot'], [/gran turismo|\bgt ?7\b|\bgt\b/, 'gt7'], [/call of duty|black ops|\bcod\b/, 'cod'], [/mario kart|\bmk\b/, 'mariokart'], [/mario (bros\.? )?wonder/, 'mariowonder'], [/pok[eé]mon/, 'pokemon'], [/fortnite/, 'fortnite'], [/\bfc ?2\d|fifa/, 'fc'], [/spider/, 'spiderman'], [/zelda/, 'zelda'], [/donkey kong/, 'dk'], [/minecraft/, 'minecraft'], [/god of war/, 'gow'], [/choose one/, 'chooseone']];
export function consoleKey(name) {
  const n = deaccent(name).toLowerCase().replace(/[\/|,+]/g, ' ');
  let plat = '';
  if (/portal/.test(n)) plat = 'PSPORTAL';
  else if (/ps5|playstation\s*5/.test(n)) plat = /\bpro\b/.test(n) ? 'PS5PRO' : 'PS5';
  else if (/switch\s*2|\bns2\b/.test(n)) plat = 'NS2';
  else if (/switch/.test(n)) plat = /oled/.test(n) ? 'NSWOLED' : /lite/.test(n) ? 'NSWLITE' : 'NSW';
  else if (/xbox series x|\bxsx\b/.test(n)) plat = 'XSX';
  else if (/xbox series s|\bxss\b/.test(n)) plat = 'XSS';
  else if (/ally/.test(n)) plat = /ally x\b/.test(n) ? 'ALLYX' : 'ALLY';
  if (!plat) return '';
  const parts = [plat];
  if (plat.startsWith('PS5')) parts.push(/digital/.test(n) ? 'digital' : 'disco');
  const bundles = BUNDLES.filter(([re]) => re.test(n)).map(([, k]) => k).sort();
  if (!bundles.length && /bundle|pack|\bcon\b|\+/.test(deaccent(name).toLowerCase())) parts.push('bundle?');
  parts.push(bundles.join('+'));
  if (plat.startsWith('NSW') || plat === 'NS2') parts.push(CONSOLE_COLORS.filter(([re]) => re.test(n)).map(([, c]) => c).sort().join('+'));
  return parts.join('|');
}

// ---- Variantes de color: mismo producto en distintos colores (se muestran en una sola tarjeta) ----
const COLOR_NAMES = {
  negro: 'Negro', negra: 'Negro', black: 'Negro', bk: 'Negro', blk: 'Negro', ngr: 'Negro', mbk: 'Negro', onyx: 'Negro', obsidiana: 'Negro',
  blanco: 'Blanco', blanca: 'Blanco', white: 'Blanco', wh: 'Blanco', wht: 'Blanco',
  gris: 'Gris', gray: 'Gris', grey: 'Gris', gry: 'Gris', grafito: 'Grafito', graphite: 'Grafito',
  plata: 'Plata', plateado: 'Plata', plateada: 'Plata', silver: 'Plata', slv: 'Plata',
  azul: 'Azul', blue: 'Azul', celeste: 'Celeste', marino: 'Azul marino', cobalt: 'Azul cobalto', indigo: 'Índigo', zafiro: 'Zafiro', sapphire: 'Zafiro',
  rojo: 'Rojo', roja: 'Rojo', red: 'Rojo', volcanic: 'Rojo volcánico', vino: 'Vino', burdeos: 'Vino',
  rosado: 'Rosado', rosada: 'Rosado', rosa: 'Rosado', pink: 'Rosado', fucsia: 'Fucsia', coral: 'Coral',
  verde: 'Verde', green: 'Verde', menta: 'Menta', mint: 'Menta', jade: 'Jade', olive: 'Oliva', sage: 'Verde salvia', teal: 'Verde azulado',
  morado: 'Morado', morada: 'Morado', purple: 'Morado', violeta: 'Violeta', violet: 'Violeta', lila: 'Lila', lavanda: 'Lavanda', lavender: 'Lavanda',
  dorado: 'Dorado', dorada: 'Dorado', oro: 'Dorado', gold: 'Dorado', gld: 'Dorado', champagne: 'Champagne', bronce: 'Bronce', cobre: 'Cobre',
  amarillo: 'Amarillo', amarilla: 'Amarillo', yellow: 'Amarillo', naranja: 'Naranja', orange: 'Naranja',
  cafe: 'Café', beige: 'Beige', crema: 'Crema', cream: 'Crema', arena: 'Arena', sand: 'Arena', turquesa: 'Turquesa', aqua: 'Aqua', cyan: 'Celeste',
  titanio: 'Titanio', titanium: 'Titanio', camuflaje: 'Camuflaje', camouflaje: 'Camuflaje', camo: 'Camuflaje',
  midnight: 'Medianoche', starlight: 'Blanco estelar', cosmic: 'Cósmico', galactic: 'Galáctico', sterling: 'Plata', neon: 'Neón',
  inox: 'Acero inoxidable', inoxidable: 'Acero inoxidable', acero: 'Acero inoxidable',
};
const MODELISH = (t) => /\d/.test(t) && /[a-z]/.test(t) && t.length >= 6;
// Colores de dos palabras en los nombres normalizados ("Blanco estelar", "Azul marino") se tratan como uno.
const MULTI_COLOR = [[/blanco estelar/g, 'starlight'], [/azul marino/g, 'marino'], [/azul cobalto/g, 'cobalt'], [/verde azulado/g, 'teal'], [/verde oliva/g, 'olive'], [/verde salvia/g, 'sage'], [/rojo volcanico/g, 'volcanic'], [/acero inoxidable/g, 'inox']];
const colorToks = (name) => MULTI_COLOR.reduce((t, [re, w]) => t.replace(re, w), deaccent(name).toLowerCase());
export function colorFamily(p) {
  const toks = colorToks(p.n).split(/[^a-z0-9]+/).filter(Boolean);
  const colors = [], rest = [];
  for (const t of toks) { if (COLOR_NAMES[t]) { if (!colors.includes(COLOR_NAMES[t])) colors.push(COLOR_NAMES[t]); } else if (!MODELISH(t)) rest.push(t); }
  return { key: `${p.c}|${brandKey(p.b)}|${rest.join(' ')}`, color: colors.join(' / ') };
}
// Celulares, tablets y laptops: el mismo modelo en distintos colores y capacidades (almacenamiento y RAM)
// se muestra en una sola tarjeta con selector. La clave es el nombre sin color ni capacidades.
const VARIANT_CATS = new Set(['celulares', 'tablets', 'laptops']);
const fmtGB = (n) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`);
export function variantFamily(p) {
  const toks = colorToks(p.n).split(/[^a-z0-9+]+/).filter(Boolean);
  const colors = [], rest = [];
  let storage = 0, ram = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (COLOR_NAMES[t]) { if (!colors.includes(COLOR_NAMES[t])) colors.push(COLOR_NAMES[t]); continue; }
    const cap = /^(\d+)(gb|tb)?$/.exec(t);
    const unit = cap && (cap[2] || ((toks[i + 1] === 'gb' || toks[i + 1] === 'tb') ? toks[i + 1] : ''));
    if (cap && unit) {
      const v = Number(cap[1]) * (unit === 'tb' ? 1024 : 1);
      if (!cap[2]) i++;
      if (toks[i + 1] === 'ram') { ram = v; i++; } else if (v >= 32) storage = Math.max(storage, v); else if (!ram && v <= 24) ram = v;
      continue;
    }
    if (t === 'ssd' || t === 'ram') continue;
    if (!MODELISH(t)) rest.push(t);
  }
  const cap = storage ? [fmtGB(storage), ram ? `${ram} GB RAM` : ''].filter(Boolean).join(' · ') : '';
  return { key: `${p.c}|${brandKey(p.b)}|${rest.join(' ')}`, color: colors.join(' / '), cap, storage, ram };
}

// ---- Características que se leen del nombre, para productos cuya tienda no publica ficha ----
export function nameSpecs(name, cat) {
  const n = deaccent(name).toLowerCase().replace(/(\d),(\d{3})/g, '$1$2');
  const out = [];
  const add = (k, v) => { if (v && !out.some(([x]) => x === k)) out.push([k, v]); };
  const gbs = [...n.matchAll(/(\d+)\s?(gb|tb)\b/g)].map((m) => Number(m[1]) * (m[2] === 'tb' ? 1024 : 1));
  if (['celulares', 'tablets', 'laptops', 'consolas'].includes(cat) && gbs.length) {
    const st = Math.max(...gbs); if (st >= 32) add('Almacenamiento', st >= 1024 ? `${st / 1024} TB` : `${st} GB`);
    const ram = n.match(/(\d+)\s?gb\s?(de\s)?ram|ram\s?(\d+)\s?gb/); const rv = ram ? Number(ram[1] || ram[3]) : gbs.filter((v) => v <= 32 && v < st)[0];
    if (rv) add('Memoria RAM', `${rv} GB`);
  }
  const inch = n.match(/(\d{2,3}(?:\.\d)?)\s?(?:"|”|''|pulgadas|pulg\b)/) || (['televisores', 'monitores'].includes(cat) && n.match(/\b(?:tv|televisor|pantalla|monitor)\D{0,20}?\b(\d{2,3})\b/));
  if (inch && ['televisores', 'monitores', 'celulares', 'tablets', 'laptops'].includes(cat)) add('Pantalla', `${inch[1]}"`);
  if (['televisores', 'monitores'].includes(cat)) {
    const r = /\b8k\b/.test(n) ? '8K' : /\b4k\b|uhd/.test(n) ? '4K UHD' : /fhd|full hd|1080/.test(n) ? 'Full HD' : /\bhd\b/.test(n) ? 'HD' : '';
    add('Resolución', r);
    const panel = /oled/.test(n) ? 'OLED' : /qned/.test(n) ? 'QNED' : /qled/.test(n) ? 'QLED' : /mini ?led/.test(n) ? 'Mini LED' : /\bled\b/.test(n) ? 'LED' : '';
    add('Panel', panel);
    const hz = n.match(/(\d{2,3})\s?hz/); if (hz) add('Frecuencia', `${hz[1]} Hz`);
  }
  if (cat === 'aires') {
    const b = n.match(/(\d{1,2})000\s?btu/) || n.match(/(\d{1,2})\s?(?:mil|k)\s?btu/) || n.match(/\b(\d{1,2})\s?btu/);
    if (b) add('Capacidad', `${Number(b[1]).toLocaleString('en-US')},000 BTU`);
    add('Tecnología', /inverter/.test(n) ? 'Inverter' : /on ?\/? ?off|convencional/.test(n) ? 'Convencional' : '');
    add('Tipo', /portatil/.test(n) ? 'Portátil' : /ventana/.test(n) ? 'Ventana' : /split/.test(n) ? 'Minisplit' : '');
  }
  if (cat === 'refrigeradoras') { const f = n.match(/(\d{1,2}(?:\.\d)?)\s?(?:pies|pie\b|ft|cu|')/); if (f) add('Capacidad', `${f[1]} pies cúbicos`); if (/inverter/.test(n)) add('Tecnología', 'Inverter'); }
  if (cat === 'lavadoras') { const k = n.match(/(\d{2})\s?(?:kg|kilos)\b/); const l = n.match(/(\d{2})\s?(?:lb|lbs|libras)\b/); if (k) add('Capacidad', `${k[1]} kg`); else if (l) add('Capacidad', `${l[1]} libras`); }
  if (cat === 'estufas') { const q = n.match(/(\d)\s?quemador/); if (q) add('Quemadores', q[1]); add('Tipo', /electric|induccion|vitroceram/.test(n) ? 'Eléctrica' : /gas/.test(n) ? 'De gas' : ''); }
  if (cat === 'microondas' || cat === 'freidoras') { const c = n.match(/(\d(?:\.\d)?)\s?(?:pies|ft|cu|')/) || n.match(/(\d(?:\.\d)?)\s?(?:l|lt|litros|qt)\b/); if (c) add('Capacidad', c[0].replace(/\s+/g, ' ')); }
  if (cat === 'motos') { const c = n.match(/(\d{2,4})\s?cc\b/); if (c) add('Cilindraje', `${c[1]} cc`); const y = n.match(/\b(202\d)\b/); if (y) add('Año', y[1]); }
  const w = n.match(/(\d{2,4})\s?w(?:atts?)?\b/); if (w && ['audio', 'licuadoras', 'microondas', 'freidoras'].includes(cat)) add('Potencia', `${w[1]} W`);
  return out;
}

// Juegos: plataforma y título normalizado para emparejar el mismo juego entre tiendas.
const PLATFORMS = [[/switch\s*2|ns2\b/i, 'NS2'], [/ps5|playstation\s*5/i, 'PS5'], [/ps4|playstation\s*4/i, 'PS4'], [/xbox\s*series|xsx/i, 'XSX'], [/xbox\s*one/i, 'XB1'], [/xbox/i, 'XBOX'], [/switch|nintendo/i, 'NSW']];
const PLATFORM_WORDS = /(nintendo\s*)?switch\s*2|\bns2\b|nintendo\s*switch|\bswitch\b|\bps[45]\b|playstation\s*[45]|xbox\s*series\s*[xs](\s*[|/]\s*[xs])?|xbox\s*one|\bxbox\b|\bnsw\b/gi;
const GAME_STOP = new Set(['juego', 'videojuego', 'para', 'de', 'del', 'la', 'el', 'los', 'las', 'the', 'of', 'and', 'y', 'nintendo', 'playstation', 'version', 'usa', 'us', 'latam', 'fisico', 'standard', 'estandar', 'edition', 'edicion', 'sony', 'microsoft', 'game', 'videogame', 'nuevo', 'sellado']);
export function gameKey(name) {
  const plat = PLATFORMS.find(([re]) => re.test(name))?.[1];
  if (!plat) return '';
  const toks = deaccent(name).replace(PLATFORM_WORDS, ' ').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t && !GAME_STOP.has(t));
  if (toks.length < 1 || toks.join('').length < 4) return '';
  return `${plat}|${[...new Set(toks)].sort().join(' ')}`;
}

const DROP_BY_CAT = {
  aires: /enfriador|ventilador/i,
  laptops: /monitor|impresora|desktop|escritorio|all in one|\baio\b|mouse|teclado|mochila/i,
  licuadoras: /\bvaso\b|cuchilla|jarra de repuesto|filtro/i,
  impresoras: /tinta|cartucho|toner|t[oó]ner|papel|cabezal|repuesto/i,
  motos: /casco|llanta|bater[ií]a|aceite|repuesto|guante|chaqueta|juguete/i,
  smartwatches: /correa|pulso|cargador|protector|funda/i,
  lavadoras: /cabello|pelo|de mano|plancha/i,
  camas: /camarote|litera|cuna|sof[aá] ?cama|almohada|\brespaldo\b|inflable/i,
  refrigeradoras: /\bvitrina|exhibidor|enfriador de (bebidas|botellas|vino)|dispensador|cava\b/i,
};
const CONSOLE_NAME = /\bconsola\b|console|playstation\s*5\s*(slim|pro|digital)|ps5\s*(slim|pro|digital)|switch\s*(2|oled|lite)\b|xbox series [xs]\b/i;
const GAME_GEAR = /\bjuego\b|videojuego|\bcontrol(es)?\b|\bmando\b|dualsense|joy-?con|volante|headset/i;

export function clean(items) {
  const out = [];
  for (const p0 of items) {
    if (!p0 || !p0.name || !p0.price) continue;
    const p = { ...p0 };
    const name = deaccent(p.name);
    // Precios marcador (99999, 999999…) que algunas tiendas usan para productos no a la venta.
    if (/^9{5,}(\.0+)?$/.test(String(p.price))) continue;
    // Covers, bases, discos y otros accesorios que vienen dentro de "consolas".
    if (p.cat === 'consolas' && (/\b(cover|covers|carcasa|tapa|faceplate|placa|skin|funda|estuche|soporte|base|estaci[oó]n|dock|cargador|cable|ssd|memoria|disco duro|lector|ventilador|enfriador|c[aá]mara|vr ?2|volante|mochila|maleta)\b/i.test(name) || p.price < 3000)) p.cat = 'videojuegos';
    // Juegos y controles que vienen dentro de "consolas".
    if (p.cat === 'consolas' && !/\bconsola\b/i.test(name) && (GAME_GEAR.test(name) || (p.price < 4000 && !CONSOLE_NAME.test(name)))) p.cat = 'videojuegos';
    // Baterías portátiles y power banks que algunas tiendas ponen en celulares o audio.
    if (['celulares', 'tablets', 'audio', 'audifonos', 'smartwatches'].includes(p.cat) && /^\s*(bater[ií]a|power ?bank|cargador)\b/i.test(name)) p.cat = 'accesorios';
    // Accesorios: los cargadores y cables pasan a su categoría; el resto (fundas, micas…) se descarta.
    if (p.cat === 'accesorios') {
      if (!CHARGER_RE.test(name) || /funda|estuche|protector|mica|vidrio|case\b|soporte|holder/i.test(name)) continue;
    } else if (ACCESSORY_RE.test(name)) {
      if (['celulares', 'tablets', 'laptops', 'smartwatches'].includes(p.cat) && CHARGER_RE.test(name) && !/funda|estuche|protector|mica|vidrio|case\b/i.test(name)) p.cat = 'accesorios';
      else continue;
    }
    if (DROP_BY_CAT[p.cat]?.test(name)) continue;
    // Combos de dos productos (estufa + lavadora, etc.) no se comparan con un producto suelto.
    if (/\bcombo\b/i.test(name) && /\+/.test(name) && p.cat !== 'consolas') continue;
    if (p.price < minPrice(p.cat)) continue;
    let brand = titleBrand(p.brand);
    const nb = brandFromName(p.name);
    if (nb && (!brand || (!deaccent(p.name).toLowerCase().includes(deaccent(brand).toLowerCase()) && brandKey(nb) !== brandKey(brand)))) brand = titleBrand(nb);
    // Consolas, juegos y controles: la marca sale de la plataforma si la tienda no la dice.
    if (!brand && ['consolas', 'videojuegos'].includes(p.cat)) brand = /switch|nintendo|joy-?con|amiibo/i.test(name) ? 'Nintendo' : /ps5|ps4|playstation|dualsense|dualshock/i.test(name) ? 'Sony' : /xbox/i.test(name) ? 'Xbox' : '';
    if (!brand) {
      const first = String(p.name).split(/\s+/).find((w) => /^[A-Z][A-Za-z]+$/.test(w) && w.length > 2 && !/^(Cama|Colchon|Colchón|Televisor|Refrigeradora|Lavadora|Estufa|Aire|Bocina|Horno|Microondas|Freidora|Celular|Laptop|Tablet|Consola|Secadora|Congelador|Minicomponente|Individual|Matrimonial|Queen|King|Juego|Control|Cargador|Cable|Monitor|Impresora|Licuadora|Cafetera|Batidora|Motocicleta|Moto|Reloj|Smartwatch|Audifonos|Audífonos|Parlante|Switch|Xbox|Memoria|Adaptador|Power|Joycon|JoyCon|Choose|Pack|Bundle|Edition|Edicion|Edición)$/i.test(w));
      brand = first && p.cat !== 'videojuegos' ? titleBrand(first) : '';
    }
    const models = modelCandidates(p);
    out.push({ ...p, brand, bk: brandKey(brand), models, cores: cores(models), barcode: (p.barcode || '').replace(/^0+/, ''), gk: p.cat === 'videojuegos' ? gameKey(p.name) : '', ck: p.cat === 'consolas' ? consoleKey(p.name) : '', nk: ['celulares', 'tablets'].includes(p.cat) ? phoneKey(p.name, brand, p.cat) : '' });
  }
  return out;
}

// Nombre uniforme: el primero que se pueda armar con la estructura de la categoría; si no, el original limpio.
function bestName(ps) {
  const brand = ps.find((p) => p.brand)?.brand || '';
  let fallback = '';
  for (const p of ps) {
    const d = displayName(p.name, p.cat, brand);
    if (d.includes(' · ') || /^(Televisor|Aire acondicionado|Refrigeradora|Congelador|Frigobar|Lavadora|Secadora|Centro de lavado|Laptop) /.test(d)) return d;
    fallback ||= d;
  }
  return fallback;
}

const IMG_RANK = ['jetstereo', 'walmart', 'elektra', 'curacao', 'radioshack', 'tropigas', 'ladylee', 'gallo', 'acosa', 'sycom', 'gamestation', 'diunsa'];

export function group(items) {
  const parent = items.map((_, i) => i);
  const members = items.map((_, i) => [i]);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  // Solo se unen dos grupos si ningún par de productos entre ellos tiene señales en contra.
  const union = (x, y) => {
    const rx = find(x), ry = find(y);
    if (rx === ry) return false;
    for (const i of members[rx]) for (const j of members[ry]) if (conflict(items[i], items[j])) return false;
    parent[rx] = ry; members[ry].push(...members[rx]); members[rx] = [];
    return true;
  };
  const byCat = {};
  items.forEach((p, i) => (byCat[p.cat] ||= []).push(i));
  for (const idxs of Object.values(byCat)) {
    // 1) Enlaces seguros: código de barras o núcleo de modelo idéntico.
    // Un núcleo es "incompleto" si existe otro que solo le agrega 1-2 letras (UN65U8000 vs UN65U8000F/H).
    const all = new Set(idxs.flatMap((i) => items[i].cores));
    // Solo es ambiguo si tiene dos o más versiones completas distintas (sin contar sufijos de región).
    const exts = (c) => new Set([...all].filter((d) => d.length > c.length && d.length - c.length <= 2 && d.startsWith(c) && /^[A-Z]{1,2}$/.test(d.slice(c.length)))
      .map((d) => d.replace(REGION_SUFFIX, '')).filter((d) => d !== c));
    const incomplete = new Set([...all].filter((c) => exts(c).size >= 2));
    for (const i of idxs) items[i].full = items[i].cores.filter((c) => !incomplete.has(c));
    const buckets = {};
    for (const i of idxs) for (const c of items[i].full) (buckets[`m:${c}`] ||= []).push(i);
    for (const i of idxs) if (items[i].barcode) (buckets[`b:${items[i].barcode}`] ||= []).push(i);
    for (const i of idxs) if (items[i].gk) (buckets[`g:${items[i].gk}`] ||= []).push(i);
    for (const i of idxs) if (items[i].ck && !items[i].ck.includes('bundle?')) (buckets[`c:${items[i].ck}`] ||= []).push(i);
    for (const i of idxs) if (items[i].nk) (buckets[`n:${items[i].nk}`] ||= []).push(i);
    for (const arr of Object.values(buckets)) {
      for (let x = 0; x < arr.length; x++) for (let y = x + 1; y < arr.length; y++) {
        if (linked(items[arr[x]], items[arr[y]])) union(arr[x], arr[y]);
      }
    }
    // 2) Códigos incompletos (ej. "UN58U8000" sin la letra del año): se unen solo si
    //    existe una única versión completa posible en la misma categoría y marca.
    //    La extensión puede ser de color o región (JBLSB580 → JBLSB580BLKAM), un dígito de revisión
    //    (LMA78113CBAB → LMA78113CBAB0) o un sufijo corto tipo A01X.
    const EXT_OK = (x) => /^[A-Z]{1,6}$/.test(x) || /^\d{1,2}$/.test(x) || /^[A-Z]\d{1,3}[A-Z]?$/.test(x);
    for (const i of idxs) {
      for (const c of items[i].cores) {
        if (c.length < 8) continue;
        const roots = new Set();
        for (const j of idxs) {
          if (i === j || find(i) === find(j)) continue;
          if (items[j].cores.some((d) => d.length > c.length && d.length - c.length <= 6 && d.startsWith(c) && EXT_OK(d.slice(c.length))) && !conflict(items[i], items[j])) roots.add(find(j));
        }
        // Todas las versiones completas de ese código en la categoría (si hay más de una, es ambiguo).
        const exts = new Set(idxs.filter((k) => find(k) !== find(i)).flatMap((k) => items[k].cores.filter((d) => d.length > c.length && d.length - c.length <= 6 && d.startsWith(c) && EXT_OK(d.slice(c.length))).map((d) => d.replace(REGION_SUFFIX, '').replace(/O/g, '0'))));
        const longest = [...exts].filter((d) => ![...exts].some((e) => e !== d && e.startsWith(d)));
        if (roots.size === 1 && longest.length === 1) union(i, [...roots][0]);
      }
    }
  }
  // 3) Juegos y controles: un título contiene al otro (misma plataforma) y lo que sobra no cambia el
  //    producto (editora, "videojuego"…). No se aceptan diferencias de edición, versión, color ni secuela.
  const EXTRA_BLOCK = /^(\d+|ii|iii|iv|vi|deluxe|gold|ultimate|complete|completa|goty|premium|collector|coleccionista|bundle|edge|pro|elite|slim|lite|oled|portal|chroma|negro|black|blanco|white|rojo|red|azul|blue|gris|gray|grey|verde|green|morado|purple|rosa|pink|camo|cosmic|midnight|galactic|starlight|nova|indigo|volcanic|sterling|cobalt|edicion|edition|remastered|remake|definitive|director|cut|plus|season|pass|vr|vr2|dlc|pack|digital|code|codigo|tarjeta|card|amiibo|figura)$/;
  const games = items.map((p, i) => [p, i]).filter(([p]) => p.cat === 'videojuegos' && p.gk);
  const parsed = games.map(([p, i]) => { const [plat, t] = p.gk.split('|'); return { i, plat, toks: new Set(t.split(' ')) }; });
  for (let x = 0; x < parsed.length; x++) for (let y = x + 1; y < parsed.length; y++) {
    const A = parsed[x], B = parsed[y];
    if (A.plat !== B.plat || find(A.i) === find(B.i)) continue;
    const [small, big] = A.toks.size <= B.toks.size ? [A, B] : [B, A];
    if (small.toks.size < 2 || [...small.toks].join('').length < 6) continue;
    if (![...small.toks].every((t) => big.toks.has(t))) continue;
    const extra = [...big.toks].filter((t) => !small.toks.has(t));
    if (extra.length > 3 || extra.some((t) => EXTRA_BLOCK.test(t))) continue;
    const pa = items[A.i].price, pb = items[B.i].price;
    if (Math.max(pa, pb) / Math.min(pa, pb) > 3.5) continue;
    union(A.i, B.i);
  }

  const groups = {};
  items.forEach((p, i) => (groups[find(i)] ||= []).push(p));

  return Object.values(groups).map((ps) => {
    ps.sort((a, b) => STORE_ORDER.indexOf(a.store) - STORE_ORDER.indexOf(b.store));
    const best = {};
    for (const p of ps) if (!best[p.store] || p.price < best[p.store].price) best[p.store] = p;
    const offers = Object.values(best)
      .map((p) => ({ s: p.store, k: offerKey(p), p: p.price, r: Math.max(p.regular || p.price, p.price), u: p.url, a: p.available ? 1 : 0, ...(p.plan ? { q: { ...p.plan, t: String(p.plan.t).replace(/^meses\s+/, '') } } : {}) }))
      .sort((a, b) => (b.a - a.a) || (a.p - b.p));
    // Fotos candidatas de todas las tiendas del grupo; thumbs.mjs usa la primera que funcione.
    // Se prefieren las fotos de las tiendas que suelen usar la foto oficial del color correcto; Diunsa a veces
    // repite una foto genérica o de otro modelo para todos los colores.
    const byImg = [...ps].sort((a, b) => IMG_RANK.indexOf(a.store) - IMG_RANK.indexOf(b.store));
    const pics = [...new Set(byImg.flatMap((p) => [p.img, ...(p.alts || [])]).filter(Boolean))].slice(0, 8);
    // Modelo a mostrar: el código completo más repetido entre las tiendas (sin sufijo de región).
    const freq = {};
    for (const p of ps) for (const c of new Set((p.full || p.cores).map((c) => c.replace(REGION_SUFFIX, '')))) freq[c] = (freq[c] || 0) + 1;
    const model = Object.entries(freq).sort((a, b) => (b[1] - a[1]) || (b[0].length - a[0].length))[0]?.[0] || ps.flatMap((p) => p.models)[0] || '';
    // Detalles para la ficha: la descripción más completa y la lista de características más larga.
    // Se prefiere la descripción más completa y mejor ordenada (con líneas o viñetas).
    const score = (x) => Math.min(x.d.length, 900) + 250 * Math.min(6, x.d.split('\n').length - 1);
    const descs = ps.map((p) => cleanDesc(p.desc)).sort((a, b) => score(b) - score(a));
    const desc = descs[0]?.d || '';
    const specs = [...(ps.map((p) => p.specs || []).sort((a, b) => b.length - a.length)[0] || [])].map(([k, v]) => [String(k).replace(EMOJI, '').trim(), String(v).replace(EMOJI, '').trim()]);
    for (const pr of descs.flatMap((x) => x.pairs)) if (specs.length < 18 && !specs.some(([k]) => k.toLowerCase() === pr[0].toLowerCase())) specs.push(pr);
    // Si la tienda no publica ficha, se completan con lo que dice el nombre del producto.
    if (specs.length < 4) for (const pr of nameSpecs(ps[0].name, ps[0].cat)) if (!specs.some(([k]) => k.toLowerCase() === pr[0].toLowerCase())) specs.push(pr);
    // Características cortas y concretas; las frases largas no son una característica.
    for (let i = specs.length - 1; i >= 0; i--) { const [k, v] = specs[i]; if (!k || !v || k.length > 32 || v.length > 90 || (/[.!]$/.test(v) && v.length > 40)) specs.splice(i, 1); }
    const product = {
      id: `${ps[0].store}-${ps[0].sku || ps[0].url}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 60),
      c: ps[0].cat, b: ps.find((p) => p.brand)?.brand || '', n: bestName(ps), on: [...new Set(ps.map((p) => p.name.replace(/\s+/g, ' ').trim()))].join(' | ').slice(0, 180),
      m: model, i: pics[0] || '', ii: pics, o: offers,
    };
    Object.defineProperty(product, 'det', { value: { d: desc, s: specs, g: pics }, enumerable: false });
    return product;
  });
}

// Orden "Más relevantes": marcas conocidas y productos que se venden en varias tiendas primero, sin que sea solo
// lo más caro, y alternando marcas para que el inicio no sea todo de una misma.
const POPULAR = {
  celulares: ['Samsung', 'Apple', 'Xiaomi', 'Honor', 'Motorola', 'Redmi', 'Tecno', 'Infinix', 'Huawei', 'Oppo'],
  tablets: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Honor', 'Huawei'],
  laptops: ['HP', 'Lenovo', 'Dell', 'Apple', 'Asus', 'Acer', 'MSI'],
  monitores: ['Samsung', 'LG', 'Dell', 'HP', 'Asus', 'Lenovo', 'AOC'],
  impresoras: ['Epson', 'HP', 'Canon', 'Brother'],
  smartwatches: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Amazfit', 'Garmin', 'Honor'],
  televisores: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Xiaomi', 'Philips'],
  audio: ['JBL', 'Sony', 'LG', 'Samsung', 'Bose', 'Marshall', 'Ultimate Ears'],
  audifonos: ['Apple', 'Samsung', 'Sony', 'JBL', 'Beats', 'Bose', 'Xiaomi', 'Skullcandy'],
  consolas: ['Sony', 'Nintendo', 'Xbox', 'Microsoft'],
  videojuegos: ['Sony', 'Nintendo', 'Xbox', 'Microsoft'],
  refrigeradoras: ['LG', 'Samsung', 'Whirlpool', 'Mabe', 'Frigidaire', 'Electrolux', 'Indurama', 'Hisense'],
  lavadoras: ['LG', 'Samsung', 'Whirlpool', 'Mabe', 'Frigidaire', 'Electrolux'],
  estufas: ['Mabe', 'Whirlpool', 'Frigidaire', 'Electrolux', 'LG', 'Samsung', 'Indurama'],
  microondas: ['LG', 'Samsung', 'Oster', 'Panasonic', 'Whirlpool', 'Mabe', 'Black+Decker'],
  aires: ['LG', 'Samsung', 'Carrier', 'Mabe', 'Frigidaire', 'Midea', 'Daewoo', 'Hisense'],
  camas: ['Serta', 'Sealy', 'Simmons', 'Spring Air', 'Restonic', 'Therapedic'],
  freidoras: ['Ninja', 'Oster', 'Philips', 'Black+Decker', 'Cosori', 'Hamilton Beach'],
  licuadoras: ['Oster', 'Ninja', 'Nutribullet', 'Black+Decker', 'Hamilton Beach', 'Kitchenaid'],
  motos: ['Honda', 'Yamaha', 'Suzuki', 'Bajaj', 'Italika', 'Genesis'],
  accesorios: ['Apple', 'Samsung', 'Anker', 'Belkin', 'Ugreen', 'Baseus', 'Xiaomi'],
};
// En "Todo", primero lo que más se busca.
const CAT_BONUS = { celulares: 3, televisores: 2.5, laptops: 2, consolas: 2, refrigeradoras: 1.5, aires: 1.5, audifonos: 1, tablets: 1, lavadoras: 1, smartwatches: 0.5, videojuegos: -2, accesorios: -2 };
export function popularOrder(products) {
  const bySorted = {};
  for (const p of products) (bySorted[p.c] ||= []).push(p.o.length ? Math.min(...p.o.map((o) => o.p)) : 0);
  const median = Object.fromEntries(Object.entries(bySorted).map(([c, v]) => { v.sort((a, b) => a - b); return [c, v[Math.floor(v.length / 2)] || 1]; }));
  const score = (p) => {
    const list = POPULAR[p.c] || [];
    const i = list.findIndex((b) => brandKey(b) === brandKey(p.b));
    const brand = i < 0 ? 0 : 8 - Math.min(i, 6);
    const stores = Math.min(p.o.length, 6) * 2.2;
    const price = Math.min(...p.o.map((o) => o.p));
    const far = Math.abs(Math.log(price / median[p.c])); // ni lo más barato ni lo más caro de la categoría
    const avail = p.o.some((o) => o.a) ? 0 : -6;
    return brand + stores - far * 2.5 + avail + (p.i ? 0.5 : -3) + (CAT_BONUS[p.c] || 0);
  };
  const scored = products.map((p) => [p, score(p)]).sort((a, b) => b[1] - a[1]);
  // Alterna marcas: cada repetición seguida de la misma marca en la misma categoría resta puntos.
  const out = []; const seen = {};
  let pool = scored;
  while (pool.length) {
    let bestIdx = 0, bestVal = -Infinity;
    for (let i = 0; i < Math.min(pool.length, 40); i++) {
      const [p, sc] = pool[i]; const k = `${p.c}|${brandKey(p.b)}`;
      const v = sc - (seen[k] || 0) * 1.6;
      if (v > bestVal) { bestVal = v; bestIdx = i; }
    }
    const [p] = pool.splice(bestIdx, 1)[0];
    const k = `${p.c}|${brandKey(p.b)}`; seen[k] = (seen[k] || 0) + 1;
    out.push(p);
  }
  return out;
}

export function buildCatalog(rawByStore, status) {
  const all = clean(Object.values(rawByStore).flat());
  const used = new Set(all.map((p) => p.cat));
  const products = popularOrder(group(all));
  // Familias: mismo nombre salvo el color (y, en celulares, tablets y laptops, salvo la capacidad).
  // Cada combinación color+capacidad aparece una sola vez y los precios deben ser parecidos.
  const fam = {};
  for (const p of products) {
    const f = VARIANT_CATS.has(p.c) ? variantFamily(p) : { ...colorFamily(p), cap: '', storage: 0, ram: 0 };
    if (f.color || f.cap) (fam[f.key] ||= []).push([p, f]);
  }
  for (const [key, list0] of Object.entries(fam)) {
    let list = list0;
    // Si unos integrantes dicen la capacidad y otros no, se agrupan solo los que la dicen.
    if (list.some(([, f]) => f.cap) && list.some(([, f]) => !f.cap)) list = list.filter(([, f]) => f.cap);
    // Misma capacidad y color repetidos (tiendas que no dicen la RAM o el color): se queda el más barato.
    const best = new Map();
    for (const e of list) { const k = `${e[1].storage}|${e[1].color}`; const price = Math.min(...e[0].o.map((o) => o.p)); if (!best.has(k) || price < best.get(k)[1]) best.set(k, [e, price]); }
    list = [...best.values()].map(([e]) => e);
    // Un integrante sin color, cuando otro de la misma capacidad sí lo dice, es casi siempre el mismo producto.
    list = list.filter(([, f]) => f.color || !list.some(([, g]) => g.color && g.storage === f.storage));
    if (list.length < 2) continue;
    const withCap = list.every(([, f]) => f.cap);
    const prices = list.map(([p]) => Math.min(...p.o.map((o) => o.p)));
    if (Math.max(...prices) / Math.min(...prices) > (withCap ? 3 : 1.3)) continue;
    const v = createHash('sha1').update(key).digest('hex').slice(0, 10);
    for (const [p, f] of list) { p.v = v; p.cl = f.color; if (f.cap) { p.cp = f.cap; p.cs = f.storage * 1000 + f.ram; } }
  }
  return {
    updated: new Date().toISOString(),
    stores: Object.fromEntries(Object.entries(STORES).map(([id, s]) => [id, {
      name: s.name, site: s.site, count: all.filter((p) => p.store === id).length,
      ok: status[id]?.ok ?? false, manual: !!status[id]?.manual, updated: status[id]?.updated || null, note: status[id]?.note || '',
    }])),
    categories: CATEGORIES.filter((c) => used.has(c.id)).map(({ id, name, group }) => ({ id, name, group })),
    products,
  };
}
