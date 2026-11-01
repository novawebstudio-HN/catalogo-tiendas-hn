// RadioShack Honduras — plataforma Unicomer (ver unicomer.mjs), con rutas propias.
import { makeUnicomer } from './unicomer.mjs';

export const scrapeRadioShack = makeUnicomer({
  id: 'radioshack', label: 'RadioShack', site: 'https://www.radioshackla.com',
  map: {
    'telefonia/celulares': 'celulares',
    'computacion/computadoras/laptops': 'laptops',
    'computacion/computadoras/computadoras-gamer': 'laptops',
    'computacion/tablets/tablets': 'tablets',
    'computacion/accesorios-de-computacion-tech/monitores': 'monitores',
    'computacion/impresion/impresoras': 'impresoras',
    'telefonia/smartwatches-y-wearables/smartwatches': 'smartwatches',
    'telefonia/smartwatches-y-wearables/smartbands': 'smartwatches',
    'video/televisores': 'televisores',
    'audio/personal-audio/bocinas-portatiles': 'audio',
    'audio/home-audio/home-theater': 'audio',
    'audio/home-audio/minicomponentes': 'audio',
    'audio/audio-profesional/parlantes': 'audio',
    'audio/audifonos/audifonos-inalambricos': 'audifonos',
    'audio/audifonos/audifonos-alambricos': 'audifonos',
    'mundo-gamer/consolas-y-videojuegos/consolas': 'consolas',
    'mundo-gamer/consolas-y-videojuegos/juegos': 'videojuegos',
    'mundo-gamer/accesorios-gaming/controles-gamer': 'videojuegos',
    'telefonia/powerbanks-y-cargadores/cargadores-de-pared': 'accesorios',
    'telefonia/powerbanks-y-cargadores/powerbanks': 'accesorios',
    'telefonia/powerbanks-y-cargadores/cargadores-de-carro': 'accesorios',
    'cables-y-adaptadores/cables/cables-para-celulares': 'accesorios',
    'cables-y-adaptadores/cables/cables-para-computacion': 'accesorios',
    'cables-y-adaptadores/cables/cables-para-audio-y-video': 'accesorios',
  },
});
