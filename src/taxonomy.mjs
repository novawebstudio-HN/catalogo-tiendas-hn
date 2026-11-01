// Taxonomía propia del catálogo. Cada tienda mapea sus categorías a estas claves.
// min: precio mínimo (lempiras) para que un producto cuente en esa categoría.
export const CATEGORIES = [
  { id: 'celulares', name: 'Celulares', group: 'Tecnología' },
  { id: 'laptops', name: 'Laptops', group: 'Tecnología' },
  { id: 'tablets', name: 'Tablets', group: 'Tecnología' },
  { id: 'monitores', name: 'Monitores', group: 'Tecnología' },
  { id: 'impresoras', name: 'Impresoras', group: 'Tecnología' },
  { id: 'smartwatches', name: 'Relojes inteligentes', group: 'Tecnología', min: 500 },
  { id: 'accesorios', name: 'Cargadores y cables', group: 'Tecnología', min: 100 },
  { id: 'televisores', name: 'Televisores', group: 'Entretenimiento' },
  { id: 'audio', name: 'Bocinas y audio', group: 'Entretenimiento' },
  { id: 'audifonos', name: 'Audífonos', group: 'Entretenimiento', min: 300 },
  { id: 'consolas', name: 'Consolas', group: 'Entretenimiento' },
  { id: 'videojuegos', name: 'Juegos y controles', group: 'Entretenimiento', min: 300 },
  { id: 'refrigeradoras', name: 'Refrigeradoras y congeladores', group: 'Línea blanca' },
  { id: 'lavadoras', name: 'Lavadoras y secadoras', group: 'Línea blanca' },
  { id: 'estufas', name: 'Estufas', group: 'Línea blanca' },
  { id: 'microondas', name: 'Microondas', group: 'Línea blanca' },
  { id: 'aires', name: 'Aires acondicionados', group: 'Climatización' },
  { id: 'camas', name: 'Camas y colchones', group: 'Hogar' },
  { id: 'freidoras', name: 'Freidoras de aire', group: 'Hogar' },
  { id: 'licuadoras', name: 'Licuadoras y cafeteras', group: 'Hogar', min: 500 },
  { id: 'motos', name: 'Motos', group: 'Vehículos', min: 10000 },
];

// El orden define cómo se listan las tiendas en la página.
export const STORES = {
  jetstereo: { name: 'Jetstereo', site: 'https://www.jetstereo.com' },
  diunsa: { name: 'Diunsa', site: 'https://www.diunsa.hn' },
  curacao: { name: 'La Curacao', site: 'https://www.lacuracaonline.com/honduras' },
  elektra: { name: 'Elektra', site: 'https://www.elektra.com.hn' },
  ladylee: { name: 'Lady Lee', site: 'https://ladylee.net' },
  walmart: { name: 'Walmart', site: 'https://www.walmart.com.hn' },
  gallo: { name: 'Gallo más Gallo', site: 'https://www.elgallomasgallo.com.hn' },
  radioshack: { name: 'RadioShack', site: 'https://www.radioshackla.com/honduras' },
  tropigas: { name: 'Tropigas', site: 'https://www.almacenestropigas.com.hn/honduras' },
  acosa: { name: 'Acosa', site: 'https://acosa.com.hn' },
  gamestation: { name: 'Game Station', site: 'https://gamestation.hn' },
};

// Filtro de alcance: solo compras grandes / reconocidas.
export const MIN_PRICE = 1000; // lempiras, salvo que la categoría diga otra cosa
export const minPrice = (cat) => CATEGORIES.find((c) => c.id === cat)?.min ?? MIN_PRICE;

// Palabras que delatan accesorios dentro de categorías grandes.
export const ACCESSORY_RE = /\b(funda|estuche|protector|mica|cable|cargador|adaptador|soporte|control remoto|forro|base para|almohada|sabana|sábana|cubre ?colch|protector de colch|repuesto|filtro|cobertor|cubierta|case|skin|correa|lapiz|lápiz|stylus|vidrio templado|tinta|cartucho|toner|tóner|casco|llanta|bateria para moto|batería para moto)\b/i;
// Lo que sí se queda en "Cargadores y cables".
export const CHARGER_RE = /\b(cargador(es)?|cable(s)?|power ?bank|bater[ií]a (port[aá]til|externa)|adaptador(es)?|hub|carga inal[aá]mbrica|base de carga)\b/i;
