// Nombres uniformes para mostrar: cada tienda escribe distinto ("CEL SAMSUNG S25 ULTRA/6.9"/512GB/12G/NGR",
// "Samsung Galaxy S25 Ultra/ 12GB RAM/ 256GB/ Titanium Black"). Aquí se arma un nombre con la misma
// estructura por categoría (marca, modelo y lo que importa al comparar). Si no se puede leer con
// seguridad, se usa el nombre original limpio.

const deaccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

export const KNOWN_BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Redmi', 'POCO', 'Honor', 'Motorola', 'Huawei', 'Infinix', 'Tecno', 'ZTE', 'Oppo', 'Realme', 'Vivo', 'Nokia', 'Alcatel', 'Blu', 'Google', 'OnePlus',
  'LG', 'TCL', 'Hisense', 'Sony', 'Philips', 'Panasonic', 'JVC', 'RCA', 'Aiwa', 'Tekno', 'Hyundai', 'Kalley', 'Hotline', 'Roku',
  'HP', 'Lenovo', 'Dell', 'Acer', 'Asus', 'MSI', 'Microsoft', 'Epson', 'Canon', 'Brother',
  'JBL', 'Bose', 'Beats', 'Skullcandy', 'Sennheiser', 'Klip Xtreme', 'Xtech', 'Logitech', 'HyperX', 'Razer', 'Anker', 'Belkin', 'Amazfit', 'Garmin',
  'Nintendo', 'Xbox', 'PlayStation',
  'Mabe', 'Whirlpool', 'Frigidaire', 'Electrolux', 'GE', 'Haier', 'Midea', 'Daewoo', 'Indurama', 'Oster', 'Ninja', 'Black+Decker', 'Hamilton Beach', 'Proctor Silex', 'Cuisinart', 'Imaco', 'Telstar', 'Carrier', 'Gree', 'Aux', 'Mastertech', 'Premier', 'Sankey', 'Westinghouse',
  'Serta', 'Sealy', 'Simmons', 'Therapedic', 'Restonic', 'Spring Air', 'Olimpia', 'Rest Well', 'Indufoam',
  'Honda', 'Yamaha', 'Suzuki', 'Bajaj', 'Italika', 'Genesis', 'Serpento', 'Haojue', 'TVS', 'Hero', 'Kawasaki', 'AKT', 'Forza', 'UM', 'Keeway', 'Freedom'];
const BRAND_CANON = Object.fromEntries(KNOWN_BRANDS.map((b) => [deaccent(b).toLowerCase(), b]));
Object.assign(BRAND_CANON, { 'black & decker': 'Black+Decker', 'black and decker': 'Black+Decker', 'b+d': 'Black+Decker', 'b&d': 'Black+Decker', 'black + decker': 'Black+Decker', iphone: 'Apple', ipad: 'Apple', macbook: 'Apple' });
const BRAND_RE = new RegExp(`(^|[^a-z0-9])(${Object.keys(BRAND_CANON).sort((a, b) => b.length - a.length).map((b) => b.replace(/[+.&]/g, (m) => `\\${m}`)).join('|')})(?=[^a-z0-9]|$)`, 'i');

// Escritura oficial de una marca conocida ("ACER" → "Acer", "MABE" → "Mabe").
export const canonicalBrand = (b) => BRAND_CANON[deaccent(b).toLowerCase().trim()] || '';

// Marca que dice el propio nombre (la primera conocida).
export function brandFromName(name) {
  const m = deaccent(name).toLowerCase().match(BRAND_RE);
  return m ? BRAND_CANON[m[2].toLowerCase()] : '';
}

const COLORS = {
  negro: 'Negro', negra: 'Negro', black: 'Negro', bk: 'Negro', blk: 'Negro', ngr: 'Negro', mbk: 'Negro', onyx: 'Negro', obsidiana: 'Negro', medianoche: 'Negro', midnight: 'Negro',
  blanco: 'Blanco', blanca: 'Blanco', white: 'Blanco', wh: 'Blanco', wht: 'Blanco', starlight: 'Blanco estelar',
  gris: 'Gris', gray: 'Gris', grey: 'Gris', gry: 'Gris', grafito: 'Grafito', graphite: 'Grafito',
  plata: 'Plata', plateado: 'Plata', plateada: 'Plata', silver: 'Plata', slv: 'Plata',
  azul: 'Azul', blue: 'Azul', celeste: 'Celeste', marino: 'Azul marino', cobalt: 'Azul', indigo: 'Índigo', zafiro: 'Azul', sapphire: 'Azul',
  rojo: 'Rojo', roja: 'Rojo', red: 'Rojo', vino: 'Vino',
  rosado: 'Rosado', rosada: 'Rosado', rosa: 'Rosado', pink: 'Rosado', fucsia: 'Fucsia', coral: 'Coral',
  verde: 'Verde', green: 'Verde', menta: 'Menta', mint: 'Menta', jade: 'Verde', sage: 'Verde', teal: 'Verde azulado', olive: 'Verde oliva',
  morado: 'Morado', morada: 'Morado', purple: 'Morado', violeta: 'Violeta', violet: 'Violeta', lila: 'Lila', lavanda: 'Lavanda', lavender: 'Lavanda',
  dorado: 'Dorado', dorada: 'Dorado', oro: 'Dorado', gold: 'Dorado', gld: 'Dorado', champagne: 'Champagne',
  amarillo: 'Amarillo', amarilla: 'Amarillo', yellow: 'Amarillo', naranja: 'Naranja', orange: 'Naranja',
  cafe: 'Café', beige: 'Beige', crema: 'Crema', cream: 'Crema', arena: 'Arena', sand: 'Arena', turquesa: 'Turquesa', aqua: 'Aqua',
  titanio: 'Titanio', titanium: 'Titanio', camuflaje: 'Camuflaje',
};
// Un color puede venir con adjetivo ("Titanium Black", "Negro Medianoche", "Light Gold"): se toma el principal.
// Abreviaturas y colores cortados que usan algunas tiendas ("SILVE", "ORANG", "BLU", "CMO" = Cosmic Orange).
const COLOR_ABBR = { blu: 'Azul', cmo: 'Naranja', sb: '', db: 'Azul', dgy: 'Gris' };
// Abreviaturas que solo valen al final del nombre (Diunsa corta los nombres: "…/128GB/WIFI+CEL/PIN", "…/6GB/WIFI/GY").
const COLOR_TAIL = { pin: 'Rosado', pnk: 'Rosado', ros: 'Rosado', gy: 'Gris', gra: 'Gris', gry: 'Gris', sil: 'Plata', slv: 'Plata', grn: 'Verde', pur: 'Morado', mor: 'Morado', yel: 'Amarillo', ama: 'Amarillo', org: 'Naranja', nar: 'Naranja', lav: 'Lavanda', neg: 'Negro', bk: 'Negro', wh: 'Blanco', gld: 'Dorado', dor: 'Dorado', azu: 'Azul', cel: '', wf: '' };
function colorOf(text) {
  const toks = deaccent(text).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const t of toks) if (COLORS[t] && !['titanio', 'titanium'].includes(t)) return COLORS[t];
  for (const t of toks) if (COLOR_ABBR[t]) return COLOR_ABBR[t];
  for (const t of toks) if (t.length >= 4) { const k = Object.keys(COLORS).find((c) => c.length > t.length && c.startsWith(t) && c.length >= 5); if (k) return COLORS[k]; }
  const last = toks[toks.length - 1];
  if (last && COLOR_TAIL[last] !== undefined) return COLOR_TAIL[last];
  return toks.some((t) => t === 'titanio' || t === 'titanium') ? 'Titanio' : '';
}

const SMALL = new Set(['de', 'del', 'la', 'el', 'y', 'con', 'para', 'en', 'a', 'por', 'sin', 'e', 'o']);
const UPPER = new Set(['tv', 'led', 'lcd', 'hd', 'fhd', 'uhd', 'qled', 'oled', 'qned', 'btu', 'usb', 'ssd', 'hdd', 'ram', 'ai', 'bt', 'lg', 'hp', 'jbl', 'rca', 'jvc', 'tcl', 'ge', 'msi', 'zte', 'nfc', 'gps', 'dvd', 'ac', 'dc', 'pc', 'cpu', 'fe', 'se', 'xl', 'tws', 'anc', 'b+d', 'akt', 'um', 'tvs', 'aux', 'lp', 'ps5', 'ps4', 'nsx', 'rgb', 'ips', 'va', 'wifi']);
const SPECIAL = { iphone: 'iPhone', ipad: 'iPad', macbook: 'MacBook', imac: 'iMac', airpods: 'AirPods', ideapad: 'IdeaPad', thinkpad: 'ThinkPad', vivobook: 'VivoBook', zenbook: 'ZenBook', thinq: 'ThinQ', wifi: 'Wi-Fi', esim: 'eSIM', playstation: 'PlayStation', oneplus: 'OnePlus', poco: 'POCO', dualsense: 'DualSense', nanocell: 'NanoCell', airfryer: 'AirFryer', 'black+decker': 'Black+Decker', minisplit: 'Minisplit', 'mini-split': 'Minisplit' };
function word(t, first) {
  const raw = t; const low = deaccent(t).toLowerCase();
  if (SPECIAL[low]) return SPECIAL[low];
  if (BRAND_CANON[low] && low.length > 1) return BRAND_CANON[low];
  if (UPPER.has(low)) return raw.toUpperCase().replace('WIFI', 'Wi-Fi');
  if (!first && SMALL.has(low)) return raw.toLowerCase();
  if (/\d/.test(raw)) {
    // Play20A, Magic7, S25, A57, 15C: letras iniciales con mayúscula inicial y sufijos en mayúscula.
    const m = raw.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]{3,})(\d.*)$/);
    return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + m[2].toUpperCase() : raw.toUpperCase();
  }
  return raw[0].toUpperCase() + raw.slice(1).toLowerCase();
}
// Nombre original legible: sin mayúsculas sostenidas, separadores "/ " como " · ", sin dobles espacios.
export function tidy(name) {
  let s = String(name || '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\/\s+|\s+\/\s*/g, ' · ').replace(/\s*\|\s*/g, ' · ').replace(/\s+-\s+/g, ' · ').replace(/\s*,\s*/g, ', ').replace(/(\s·\s)+/g, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '');
  const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const caps = letters && letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / letters.length > 0.7;
  if (caps) s = s.split(' ').map((t, i) => t.split(/([\/,])/).map((x, j) => (/^[\/,]$/.test(x) || !x ? x : word(x, i === 0 && j === 0))).join('')).join(' ');
  return s;
}

const GB = (n) => (n >= 1024 ? `${n / 1024} TB` : `${n} GB`);
const ttl = (s) => s.split(' ').filter(Boolean).map((t, i) => word(t, i === 0)).join(' ');
const fmtNum = (v) => Number(v).toLocaleString('en-US');

// Separa el texto del modelo: lo que viene después de la marca y antes del primer dato técnico.
function modelWords(name, brand, extraStop = []) {
  let s = deaccent(name).replace(/[–—]/g, ' - ').replace(/\(.*?\)/g, ' ').replace(/(\d)\s+(gb|tb|mb|mp|mah|ghz|hz)\b/gi, '$1$2');
  // Se corta en / | , y en " + " o " - " con espacios; el + pegado al modelo se conserva (A11+, S12+).
  s = s.split(/\s*[\/|,]\s*|\s+[-+]\s+|\+(?=\s)/)[0] || '';
  let toks = s.split(/\s+/).filter(Boolean);
  const b = deaccent(brand).toLowerCase();
  const bi = toks.findIndex((t) => { const low = t.toLowerCase().replace(/-$/, ''); return low === b || BRAND_CANON[low] === brand; });
  if (bi >= 0) toks = toks.slice(bi + 1);
  else { const i = toks.findIndex((t) => t.toLowerCase().startsWith(`${b}-`)); if (i >= 0) { toks = toks.slice(i); toks[0] = toks[0].slice(b.length + 1); } }
  const out = [];
  for (const t of toks) {
    const low = t.toLowerCase();
    if (/^\d+(\.\d+)?\s?(gb|tb|g|mb|mah|mp|ghz|hz|w|"|”|''|pulg(adas)?)$/i.test(t) || /["”]/.test(t) || COLORS[low] || ['ram', 'rom', 'version', 'sim', 'esim', 'dual', 'pantalla', 'chip', 'con', 'de', 'y', 'color', 'and', 'android', 'liberado', 'desbloqueado', 'nuevo', ...extraStop].includes(low)) break;
    if (/^[a-z]{2,4}-?[a-z0-9]{6,}$/i.test(t) && /\d/.test(t) && /[a-z].*[a-z]/i.test(t.slice(2))) break; // códigos de modelo largos
    out.push(t);
  }
  return out.join(' ');
}

function phoneName(name, brand, cat = 'celulares') {
  const n = deaccent(name).toLowerCase();
  const gbs = [...n.matchAll(/(\d+)\s?(gb|tb|g)\b/g)].filter((m) => m[2] !== 'g' || Number(m[1]) >= 6).map((m) => Number(m[1]) * (m[2] === 'tb' ? 1024 : 1));
  for (const m of n.matchAll(/\/\s?(32|64|128|256|512)\s?(?=\/|$|\s)/g)) gbs.push(Number(m[1]));
  const storage = Math.max(0, ...gbs.filter((v) => v >= 32));
  const ramM = n.match(/(\d+)\s?gb\s?(de\s)?ram|ram\s?(\d+)/);
  const ram = ramM ? Number(ramM[1] || ramM[3]) : (gbs.filter((v) => v <= 24 && v !== storage)[0] || 0);
  let model = modelWords(name.replace(/^\s*(celular|cel|smartphone|tel[eé]fono|m[oó]vil|tablet|tableta)\s+(4g|5g\s+)?/i, '').replace(/^\s*(4g|5g)\s+/i, ''), brand, ['4g', 'lte', 'wifi', 'wi-fi', '5g']);
  model = model.replace(/^(celular|cel|smartphone|tablet|tableta)\s+/i, '').replace(/^(4g|5g)\s+/i, '').replace(/\s+(w\/kbc|wifi|wi-fi|lte)$/i, '').replace(/\s+[A-Za-z]$/, '');
  if (!model || !storage) return '';
  let m = ttl(model);
  // Diunsa abrevia "Galaxy" como "G": "G A11+", "G S25".
  if (brand === 'Samsung') m = m.replace(/^G\s+(?=[A-Z]\d|Tab\b|Fold|Flip)/i, 'Galaxy ');
  if (brand === 'Samsung' && cat === 'tablets') m = `Galaxy Tab ${m.replace(/^(Galaxy\s+)?(Tab(let)?\s+)?/i, '')}`;
  else if (brand === 'Samsung' && /^[ASMZ]\d{2}/i.test(m)) m = `Galaxy ${m}`;
  if (brand === 'Apple' && !/^i/i.test(m) && /^\d/.test(m)) m = `iPhone ${m}`;
  // La marca no cuenta como color ("Blu" no es azul).
  const noBrand = (t) => t.replace(new RegExp(`\\b${deaccent(brand).replace(/[^a-z0-9]/gi, '')}-?\\b`, 'ig'), ' ');
  const color = colorOf(noBrand(name.split(/\s\|\s|\s-\s/)[0])) || colorOf(noBrand(name));
  const inch = cat === 'tablets' ? n.match(/(\d{1,2}(?:\.\d)?)\s?(?:"|”|''|pulgadas|pulg\b)/) : null;
  const lte = cat === 'tablets' && /\b(lte|5g|4g|celular|cel|cellular|celluar)\b/.test(n) ? 'LTE' : '';
  // Apple no publica la RAM de sus equipos; lo que ponen las tiendas suele estar mal.
  return [`${brand} ${m}`.trim(), inch ? `${inch[1]}"` : '', GB(storage), ram && brand !== 'Apple' ? `${ram} GB RAM` : '', lte, color].filter(Boolean).join(' · ');
}

// Clave para emparejar teléfonos y tablets sin código común: marca + modelo + almacenamiento + color.
export function phoneKey(name, brand, cat = 'celulares') {
  const b = brand || brandFromName(name);
  const d = b ? phoneName(name, b, cat) : '';
  if (!d) return '';
  const parts = d.split(' · ');
  const model = parts[0];
  const storage = parts.find((x) => /^\d+ (GB|TB)$/.test(x)) || '';
  const lte = parts.includes('LTE') ? '|lte' : '';
  const color = parts.slice(1).find((x) => !/RAM$|^\d+ (GB|TB)$|^LTE$|"$/.test(x)) || '';
  if (!color || !storage) return '';
  const fam = { redmi: 'xiaomi', poco: 'xiaomi' }[b.toLowerCase()] || b.toLowerCase();
  const core = deaccent(model).toLowerCase().replace(/\b(apple|samsung|galaxy|motorola|moto|xiaomi|redmi|poco|honor|huawei|infinix|tecno|zte|oppo|realme|vivo|nokia|alcatel|google|oneplus|5g|4g|lte)\b/g, ' ').replace(/[^a-z0-9]/g, '');
  if (core.length < 2) return '';
  return `${fam}|${core}|${storage}|${color}${lte}`;
}

function tvName(name, brand) {
  const n = deaccent(name).toLowerCase();
  const inch = n.match(/(\d{2,3})\s?(?:"|”|''|pulgadas|pulg\b)/) || n.match(/\b(?:tv|televisor|pantalla)\D{0,25}?\b(\d{2,3})\b/);
  if (!inch || Number(inch[1]) < 19 || Number(inch[1]) > 120) return '';
  const tech = /oled/.test(n) ? 'OLED' : /qned/.test(n) ? 'QNED' : /mini ?led/.test(n) ? 'Mini LED' : /qled/.test(n) ? 'QLED' : /nano ?(uhd|cell)|nanocell/.test(n) ? 'NanoCell' : /crystal/.test(n) ? 'Crystal UHD' : 'LED';
  const res = /\b8k\b/.test(n) ? '8K' : /\b4k\b|uhd|ultra hd/.test(n) ? '4K' : /fhd|full hd|1080/.test(n) ? 'Full HD' : /\bhd\b|720/.test(n) ? 'HD' : '';
  const smart = /smart|google tv|android tv|roku|webos|tizen|vidaa|thinq|fire tv/.test(n) ? ' Smart' : '';
  return `Televisor ${brand} ${inch[1]}" ${tech}${res && !(tech === 'Crystal UHD' && res === '4K') ? ` ${res}` : tech === 'Crystal UHD' ? ' 4K' : ''}${smart}`.replace(/\s+/g, ' ').trim();
}

function acName(name, brand) {
  const n = deaccent(name).toLowerCase().replace(/(\d),(\d{3})/g, '$1$2');
  let btu = 0;
  const m = n.match(/(\d{4,5})\s?btu/) || n.match(/(\d{1,2})\s?(?:mil|k)\s?btus?/) || n.match(/\b(\d{1,2})\s?btu/);
  if (m) btu = Number(m[1]) < 100 ? Number(m[1]) * 1000 : Number(m[1]);
  const ton = n.match(/(\d(?:[.,]\d)?)\s?toneladas?/); if (!btu && ton) btu = Math.round(Number(ton[1].replace(',', '.')) * 12000);
  if (!btu) return '';
  const tipo = /portatil/.test(n) ? 'Portátil' : /ventana/.test(n) ? 'De ventana' : /ducto/.test(n) ? 'Tipo ducto' : /piso|techo|cassette/.test(n) ? 'Piso techo' : 'Minisplit';
  const inv = /inverter|invert\b/.test(n) ? 'Inverter' : /on ?\/? ?off|convencional/.test(n) ? 'Convencional' : '';
  return [`Aire acondicionado ${brand}`.trim(), `${fmtNum(btu)} BTU`, inv, tipo].filter(Boolean).join(' · ');
}

function fridgeName(name, brand) {
  const n = deaccent(name).toLowerCase();
  const f = n.match(/(\d{1,2}(?:[.,]\d)?)\s?(?:pies|pie\b|ft|cu|p3|'|"|”)/);
  const kind = /congelador|freezer/.test(n) ? 'Congelador' : /frigobar|minibar|mini bar/.test(n) ? 'Frigobar' : 'Refrigeradora';
  const conf = /side ?by ?side|\bsbs\b/.test(n) ? 'Side by Side' : /french ?door|puerta francesa/.test(n) ? 'French Door' : /cross ?door/.test(n) ? 'Cross Door' : /bottom|freezer abajo/.test(n) ? 'Bottom Freezer' : /top ?mount|2 ?puertas|dos puertas|2pt/.test(n) && kind === 'Refrigeradora' ? 'Top Mount' : /horizontal/.test(n) ? 'Horizontal' : /vertical/.test(n) ? 'Vertical' : '';
  if (!f) return '';
  return [`${kind} ${brand}`.trim(), `${f[1].replace(',', '.')} pies`, conf, /inverter/.test(n) ? 'Inverter' : ''].filter(Boolean).join(' · ');
}

function washerName(name, brand) {
  const n = deaccent(name).toLowerCase();
  const kind = /centro de lavado|lavasecadora|lavadora.*secadora|torre/.test(n) ? 'Centro de lavado' : /secadora/.test(n) ? 'Secadora' : 'Lavadora';
  const kg = n.match(/(\d{1,2}(?:\.\d)?)\s?(?:kg|kilos)\b/); const lb = n.match(/(\d{2})\s?(?:lb|lbs|libras)\b/);
  const cap = kg ? `${kg[1]} kg` : lb ? `${Math.round(Number(lb[1]) / 2.2)} kg` : '';
  if (!cap) return '';
  const carga = /frontal/.test(n) ? 'Carga frontal' : /superior|top load/.test(n) ? 'Carga superior' : '';
  const energia = kind === 'Secadora' ? (/gas/.test(n) ? 'A gas' : /electric/.test(n) ? 'Eléctrica' : '') : '';
  return [`${kind} ${brand}`.trim(), cap, carga, energia].filter(Boolean).join(' · ');
}

function laptopName(name, brand) {
  const n = deaccent(name).toLowerCase();
  const gbs = [...n.matchAll(/(\d+)\s?(gb|tb)\b/g)].map((m) => Number(m[1]) * (m[2] === 'tb' ? 1024 : 1));
  const plus = n.match(/\b(\d{1,2})\s?\+\s?(\d{3,4})\s?gb/); if (plus) gbs.push(Number(plus[1]), Number(plus[2]));
  const storage = Math.max(0, ...gbs.filter((v) => v >= 128));
  const ramM = n.match(/(\d{1,2})\s?gb\s?(de\s)?ram/) || plus;
  const ram = ramM ? Number(ramM[1]) : (gbs.filter((v) => v >= 4 && v <= 64)[0] || 0);
  const cpuM = n.match(/(?:intel\s)?core\s?(?:ultra\s)?[3579]\b(?:[ -]?\d{3,5}[a-z]{0,2})?|\bci[3579]\b(?:[ -]?\d{3,5}[a-z]{0,2})?|\bi[3579][ -]\d{4,5}[a-z]{0,2}|ryzen\s?(?:ai\s)?[3579](?:[ -]+\d{3,4}[a-z]{0,2})?|\br[3579][ -]\d{4}[a-z]{0,2}|apple m[1-5](?: pro| max)?|\bm[1-5]\b(?: pro| max)?|celeron[ a-z0-9]*|snapdragon x[ a-z0-9]*/);
  let cpu = '';
  if (cpuM) {
    const c = cpuM[0].replace(/^ci([3579])/, 'core i$1').replace(/^i([3579])/, 'core i$1').replace(/^r([3579])/, 'ryzen $1').replace(/^intel /, '');
    cpu = ttl(c.replace(/core i/, 'core i')).replace(/Core I(\d)/, 'Core i$1').replace(/^M(\d)/, 'Apple M$1');
  }
  const inch = n.match(/(\d{2}(?:\.\d)?)\s?(?:"|”|''|pulgadas|pulg\b)/);
  const series = ttl(modelWords(name.replace(/^\s*(laptop|computadora port[aá]til|notebook)\s+(2-en-1\s+)?/i, ''), brand, ['procesador', 'intel', 'amd', 'core', 'ryzen', 'ci3', 'ci5', 'ci7', 'ci9', 'celeron']).replace(/\s\d{2}(\.\d)?$/, ''));
  if (!ram || !storage) return '';
  return [`Laptop ${brand} ${series}`.replace(/\s+/g, ' ').trim(), cpu, `${ram} GB RAM`, `${GB(storage)}${/ssd/.test(n) ? ' SSD' : ''}`, inch ? `${inch[1]}"` : ''].filter(Boolean).join(' · ');
}

const BUILDERS = { celulares: phoneName, tablets: (n, b) => phoneName(n, b, 'tablets'), televisores: tvName, aires: acName, refrigeradoras: fridgeName, lavadoras: washerName, laptops: laptopName };

export function displayName(name, cat, brand) {
  const b = brand || brandFromName(name);
  try {
    const out = b && BUILDERS[cat]?.(name, b);
    if (out && out.length >= 8) return out;
  } catch { /* se usa el nombre original */ }
  return tidy(name);
}
