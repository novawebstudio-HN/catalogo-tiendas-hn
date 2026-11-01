// Clasificación por nombre, para productos que la tienda no pone en una categoría reconocible
// (catálogo completo de Lady Lee, electrodomésticos de Acosa, etc.). Conservadora: ante la duda, null.

const NOT = /secadora de (cabello|pelo)|de cabello|tel[eé]fono (ip|inal[aá]mbrico|fijo|de mesa|alambrico|al[aá]mbrico)|\bvoip\b|proyector|proyecci[oó]n|para (perro|gato|mascota|beb[eé]|mu[nñ]eca)|monitor de beb|inflable|colchoneta|juguete|\bjuego de (ollas|sartenes|cuchillos|vasos|platos)|de juguete|miniatura|para piscina|\bfunda\b|protector|repuesto|\bvaso\b|cuchilla|filtro|\bcover\b|\bcable\b|cargador|soporte|base para|control remoto|mochila|maleta|estuche|mica|\bskin\b|\bcase\b/i;

const RULES = [
  [/\baire acondicionado|mini ?split|\bsplit\b.*btu|\d{2}\s?k?btu/i, 'aires'],
  [/refrigerad|congelador|frigobar|\bnevera\b/i, 'refrigeradoras'],
  [/\blavadora|centro de lavado|\bsecadora\b/i, 'lavadoras'],
  [/\bestufa\b|\bcocina\b.*(gas|el[eé]ctrica|quemador|hornilla)|(gas|el[eé]ctrica|quemador|hornilla).*\bcocina\b/i, 'estufas'],
  [/microondas/i, 'microondas'],
  [/freidora/i, 'freidoras'],
  [/licuadora|cafetera|batidora|procesador de alimentos|extractor de jugo|exprimidor el|percolad|\btostador|sandwichera|waflera/i, 'licuadoras'],
  [/\bcelular|smartphone|\biphone\b|\btel[eé]fono\b/i, 'celulares'],
  [/\blaptop|notebook|\bmacbook|chromebook|port[aá]til\b.*(core|ryzen|celeron|intel|amd)/i, 'laptops'],
  [/\btablet|\bipad\b|\btableta\b/i, 'tablets'],
  [/\bmonitor\b/i, 'monitores'],
  [/impresora|multifuncional/i, 'impresoras'],
  [/reloj inteligente|smart ?watch|smart ?band|\bwatch\b.*(serie|series|ultra|se\b|gt|fit)/i, 'smartwatches'],
  [/televis|smart ?tv|\btv\b|pantalla.*(pulg|")|\d{2}"\s*(uhd|4k|fhd|hd|qled|oled|led)/i, 'televisores'],
  [/aud[ií]fono|auricular|earbuds|\bheadset\b|\bbuds\b/i, 'audifonos'],
  [/\bbocina|parlante|altavoz|barra de sonido|soundbar|minicomponente|equipo de sonido|\btorre de sonido/i, 'audio'],
  [/\bconsola\b.*(playstation|ps5|ps4|xbox|switch|nintendo)|(playstation|ps5|ps4|xbox|switch)\b.*\bconsola\b/i, 'consolas'],
  [/\b(juego|videojuego|control|mando)\b.*(ps5|ps4|playstation|xbox|switch|nintendo)|(ps5|ps4|playstation|xbox|switch|nintendo).*\b(juego|videojuego|control|mando|dualsense|joy-?con)\b/i, 'videojuegos'],
  [/\bcama\b|\bcolch[oó]n(es)?\b|box ?spring/i, 'camas'],
  [/\bmotocicleta|\bmoto\b|cuatrimoto|\bscooter el/i, 'motos'],
];

export function catFromName(name) {
  const n = String(name || '');
  if (!n || NOT.test(n)) return null;
  return RULES.find(([re]) => re.test(n))?.[1] || null;
}
