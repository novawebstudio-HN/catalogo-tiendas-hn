// Taxonomía propia del catálogo. Cada tienda mapea sus categorías a estas claves.
export const CATEGORIES = [
  { id: 'celulares', name: 'Celulares', group: 'Tecnología' },
  { id: 'laptops', name: 'Laptops', group: 'Tecnología' },
  { id: 'tablets', name: 'Tablets', group: 'Tecnología' },
  { id: 'televisores', name: 'Televisores', group: 'Entretenimiento' },
  { id: 'audio', name: 'Bocinas y audio', group: 'Entretenimiento' },
  { id: 'consolas', name: 'Consolas y videojuegos', group: 'Entretenimiento' },
  { id: 'refrigeradoras', name: 'Refrigeradoras y congeladores', group: 'Línea blanca' },
  { id: 'lavadoras', name: 'Lavadoras y secadoras', group: 'Línea blanca' },
  { id: 'estufas', name: 'Estufas', group: 'Línea blanca' },
  { id: 'microondas', name: 'Microondas', group: 'Línea blanca' },
  { id: 'aires', name: 'Aires acondicionados', group: 'Climatización' },
  { id: 'camas', name: 'Camas y colchones', group: 'Hogar' },
  { id: 'freidoras', name: 'Freidoras de aire', group: 'Hogar' },
];

export const STORES = {
  jetstereo: { name: 'Jetstereo', site: 'https://www.jetstereo.com' },
  diunsa: { name: 'Diunsa', site: 'https://www.diunsa.hn' },
  curacao: { name: 'La Curacao', site: 'https://www.lacuracaonline.com/honduras' },
  elektra: { name: 'Elektra', site: 'https://www.elektra.com.hn' },
  ladylee: { name: 'Lady Lee', site: 'https://ladylee.net' },
  walmart: { name: 'Walmart', site: 'https://www.walmart.com.hn' },
};

// Filtro de alcance: solo compras grandes / reconocidas.
export const MIN_PRICE = 1000; // lempiras
// Palabras que delatan accesorios dentro de categorías grandes.
export const ACCESSORY_RE = /\b(funda|estuche|protector|mica|cable|cargador|adaptador|soporte|control remoto|forro|base para|almohada|sabana|sábana|cubre ?colch|protector de colch|repuesto|filtro|cobertor|cubierta|case|skin|correa|lapiz|lápiz|stylus|vidrio templado)\b/i;
