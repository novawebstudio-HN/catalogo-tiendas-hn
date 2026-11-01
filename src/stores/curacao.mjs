// La Curacao Honduras — plataforma Unicomer (ver unicomer.mjs).
import { makeUnicomer, UNICOMER_PATHS } from './unicomer.mjs';

export { extractSearchResponse } from './unicomer.mjs';

export const scrapeCuracao = makeUnicomer({
  id: 'curacao', label: 'La Curacao', site: 'https://www.lacuracaonline.com', map: UNICOMER_PATHS,
});
