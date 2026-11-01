# Vitrina HN

Catálogo unificado de las cadenas grandes de Honduras — **Diunsa, La Curacao, Elektra, Lady Lee y Walmart** (Jetstereo listo, ver nota) — en las categorías de compras grandes: celulares, laptops, tablets, televisores, audio, consolas, refrigeradoras, lavadoras, estufas, microondas, aires acondicionados, camas y freidoras de aire.

Cuando el mismo modelo está en varias tiendas, se muestra como un solo producto con el precio de cada una y el más bajo resaltado.

## Cómo funciona

```
GitHub Actions (diario, 6:17 a. m. HN)
  └─ src/scrape.mjs
       ├─ stores/jetstereo.mjs  → api.jetstereo.com (paginado, 50 por página)
       ├─ stores/diunsa.mjs     → API del sitio de Diunsa (por código de categoría)
       ├─ stores/curacao.mjs    → HTML público de cada categoría (ver nota)
       ├─ stores/elektra.mjs    → API pública de catálogo VTEX
       ├─ stores/ladylee.mjs    → catálogo público de Shopify por colección
       └─ stores/walmart.mjs    → API pública de catálogo VTEX (con código de barras)
  └─ src/build.mjs   → limpia, filtra accesorios/precios < L1,000 y agrupa por modelo
  └─ src/thumbs.mjs  → miniatura WebP de 220 px de cada producto (site/thumbs/)
  └─ site/catalog.json + data/raw/*.json  (se guardan en el repo)
  └─ GitHub Pages     → publica la carpeta site/
```

- **Mínimas dependencias**: Node 22 y `fetch` nativo; `sharp` solo para las miniaturas.
- **Tolerante a fallas**: si una tienda falla, se conservan sus últimos datos y la página la marca como "sin actualizar".
- **Agrupación**: por código de barras (cuando existe) o por número de modelo del fabricante, con reglas para no mezclar capacidades distintas (GB) ni tamaños distintos (pulgadas).

### Nota sobre La Curacao

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
node src/scrape.mjs diunsa       # solo una
node src/thumbs.mjs              # miniaturas
npx serve site                   # abrir la página
```

## Publicar la página

La página se publica sola en GitHub Pages en cada corrida del workflow (diaria, o al cambiar el código). Requisito único: en *Settings → Pages*, la fuente debe ser **GitHub Actions**.

## Agregar o cambiar categorías

1. Agregar la categoría propia en `src/taxonomy.mjs`.
2. Mapear el código de cada tienda en el `MAP` de su archivo en `src/stores/`.
