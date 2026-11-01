# Vitrina HN

Catálogo unificado de 12 tiendas de Honduras — **Jetstereo, Diunsa, La Curacao, Elektra, Lady Lee, Walmart, Gallo más Gallo, RadioShack, Tropigas, Acosa, Game Station y Sycom** — en 21 categorías: celulares, laptops, tablets, monitores, impresoras, relojes inteligentes, cargadores y cables, televisores, audio, audífonos, consolas, juegos y controles, refrigeradoras, lavadoras, estufas, microondas, aires acondicionados, camas, freidoras de aire, licuadoras y cafeteras, y motos.

Cuando el mismo modelo está en varias tiendas, se muestra como un solo producto con el precio de cada una y el más bajo resaltado.

## Funciones de la página

- **Búsqueda tolerante a errores**: entiende "samsumg", "lavdora", "refri", "compu", "tele", plurales y sinónimos.
- **Ficha de cada producto** con link propio (`#p/<tienda:código>`), botón para compartir por WhatsApp, galería, precio en cada tienda, características, descripción y gráfica del historial.
- **Historial de precios**: cada día se guarda el precio de cada oferta (`data/history.json`). Con eso se marca "Bajó L …", "Precio más bajo en 30 días" y "Sin rebaja real" (tiene precio "antes" tachado pero no está más barato que en los días anteriores).
- **Ofertas reales** (`#ofertas`): etiquetas de descuento por tienda vs. bajadas confirmadas, productos que bajaron y mayores diferencias entre tiendas.
- **Favoritos** (`#favoritos`) guardados en el navegador, con aviso al volver si alguno bajó de precio.
- **Comparar** hasta 3 productos lado a lado.
- **Cuotas**: se muestran solo donde la tienda las publica (Walmart: meses sin intereses con BAC). La Curacao, Elektra, Gallo y Diunsa no publican su precio a crédito.

## Cómo funciona

```
GitHub Actions (diario, 6:17 a. m. HN; también a mano o con un commit que diga [scrape])
  └─ src/scrape.mjs
       ├─ stores/jetstereo.mjs   → api.jetstereo.com (captura manual, ver nota)
       ├─ stores/diunsa.mjs      → API del sitio de Diunsa (por grupo, más un recorrido del catálogo completo)
       ├─ stores/unicomer.mjs    → La Curacao, RadioShack y Tropigas: HTML público de cada categoría (ver nota)
       ├─ stores/elektra.mjs     → API pública de catálogo VTEX
       ├─ stores/walmart.mjs     → API pública de catálogo VTEX (código de barras, características, meses sin intereses)
       ├─ stores/ladylee.mjs     → catálogo público de Shopify (colecciones + catálogo completo por nombre)
       ├─ stores/gallo.mjs       → sitemap + datos estructurados (JSON-LD) de categorías y productos
       ├─ stores/acosa.mjs       → API pública de tienda de WooCommerce (/API/wc/store/v1), ramas completas de Tecnología y Electrodomésticos
       ├─ stores/gamestation.mjs → páginas públicas de categoría de WooCommerce (todas las páginas)
       └─ stores/sycom.mjs       → listado público de Odoo (/shop), clasificado por nombre
  └─ src/classify.mjs → clasificación por nombre para productos sin categoría reconocible
  └─ src/build.mjs    → limpia, filtra accesorios y precios mínimos por categoría, agrupa por modelo
  └─ src/history.mjs  → historial de precios y archivos de detalle (site/details/<categoría>.json)
  └─ src/thumbs.mjs   → miniatura WebP de 520 px de cada producto (site/thumbs/)
  └─ GitHub Pages     → publica la carpeta site/
```

- **Mínimas dependencias**: Node 22 y `fetch` nativo; `sharp` solo para las miniaturas.
- **Tolerante a fallas**: si una tienda falla, se conservan sus últimos datos.
- **Agrupación**: por código de barras, por número de modelo del fabricante o, en juegos, por plataforma + título; con reglas para no mezclar capacidades (GB), tamaños (pulgadas), variantes del mismo modelo ni secuelas.
- **Sin consultas repetidas**: un push solo reconstruye con los datos guardados; las tiendas se consultan una vez al día (o a mano).

### Nota sobre La Curacao, RadioShack y Tropigas (Unicomer)

Su API de listado responde solo a su propio sitio, así que se respeta esa restricción: se toma lo que la página pública de cada categoría entrega en el HTML (los primeros ~20 productos en existencia). En categorías grandes (celulares, televisores, camas) la cobertura es parcial.

### Jetstereo: captura desde Honduras

`api.jetstereo.com` rechaza (HTTP 403) las consultas que salen de servidores en la nube como GitHub Actions. No se intenta burlar ese bloqueo. En su lugar, los precios de Jetstereo vienen de `data/manual/jetstereo.json`, una captura hecha desde una conexión normal en Honduras, y la actualización diaria la usa automáticamente. La página muestra la fecha de la captura y la marca como "vieja" si tiene más de 14 días.

Dos formas de hacer la captura (las dos usan el mismo código que `src/stores/jetstereo.mjs`):

**A. Botón en el navegador**
1. Crea un marcador nuevo y pega como URL el contenido de `tools/bookmarklet-jetstereo.txt`.
2. Abre www.jetstereo.com y haz clic en el marcador. En ~1 minuto se descarga `jetstereo.json`.
3. Súbelo en GitHub a la carpeta `data/manual/` (*Add file → Upload files*).

**B. Automático desde la Mac (una vez por semana)**
1. `git clone` del repo y `npm install` (requiere Node 22).
2. Prueba manual: `bash tools/jetstereo-mac.sh` (captura, hace commit y push).
3. Programarlo: edita la ruta en `tools/com.novawebstudio.vitrina-jetstereo.plist`, cópialo a `~/Library/LaunchAgents/` y ejecuta `launchctl load` (instrucciones dentro del archivo).

La captura se identifica como `VitrinaHN/1.0` y va a ritmo pausado. Es una zona gris frente a los términos de Jetstereo: lo ideal sigue siendo pedirles un feed o permiso (`docs/carta-jetstereo.md`).

## Correr local

```bash
npm install
node src/scrape.mjs              # todas las tiendas
node src/scrape.mjs diunsa gallo # solo esas
node src/scrape.mjs none         # reconstruir sin consultar tiendas
node src/thumbs.mjs              # miniaturas
npx serve site                   # abrir la página
```

## Publicar la página

La página se publica sola en GitHub Pages en cada corrida del workflow (diaria, o al cambiar el código). Requisito único: en *Settings → Pages*, la fuente debe ser **GitHub Actions**.

## Agregar o cambiar categorías

1. Agregar la categoría propia en `src/taxonomy.mjs`.
2. Mapear el código de cada tienda en el `MAP` de su archivo en `src/stores/`.
