// Almacenes Tropigas Honduras — plataforma Unicomer (ver unicomer.mjs), mismas rutas que La Curacao.
import { makeUnicomer, UNICOMER_PATHS } from './unicomer.mjs';

export const scrapeTropigas = makeUnicomer({
  id: 'tropigas', label: 'Tropigas', site: 'https://www.almacenestropigas.com.hn', map: UNICOMER_PATHS,
});
