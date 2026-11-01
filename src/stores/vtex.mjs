// Utilidades comunes de VTEX (Elektra, Walmart): descripción, especificaciones y fotos.
import { htmlToText } from './acosa.mjs';

const SKIP_SPEC = /MSI|Exclusiv|Rebaja|allowlist|ACL|Locaci[oó]n|Departamentos|Ciudades|Tiendas|Cuota|^Electr[oó]nica$|Relaci[oó]n de aspecto|Garant[ií]a extendida|Env[ií]o|Promo/i;

export function vtexDetails(p) {
  const specs = (p.allSpecifications || [])
    .filter((k) => !SKIP_SPEC.test(k))
    .map((k) => [k, [].concat(p[k] ?? []).join(', ').replace(/\s+/g, ' ').trim()])
    .filter(([k, v]) => v && v !== k && v.length <= 140)
    .slice(0, 16);
  const imgs = (p.items?.[0]?.images || []).map((i) => (i.imageUrl || '').split('?')[0]).filter(Boolean);
  return { desc: htmlToText(p.description || p.metaTagDescription || '').slice(0, 900), specs, img: imgs[0] || '', alts: imgs.slice(1, 5) };
}
