# Vitrina HN

Catálogo unificado de las cuatro cadenas grandes de Honduras — **Jetstereo, Diunsa, La Curacao y Elektra** — en las categorías de compras grandes: celulares, laptops, tablets, televisores, audio, consolas, refrigeradoras, lavadoras, estufas, microondas, aires acondicionados, camas y freidoras de aire.

Cuando el mismo modelo está en varias tiendas, se muestra como un solo producto con el precio de cada una y el más bajo resaltado.

## Cómo funciona

```
GitHub Actions (diario, 6:17 a. m. HN)
  └─ src/scrape.mjs
       ├─ stores/jetstereo.mjs  → api.jetstereo.com (paginado, 50 por página)
       ├─ stores/diunsa.mjs     → API del sitio de Diunsa (por código de categoría)
       ├─ stores/curacao.mjs    → HTML público de cada categoría (ver nota)
       └─ stores/elektra.mjs    → API pública de catálogo VTEX
  └─ src/build.mjs   → limpia, filtra accesorios/precios < L1,000 y agrupa por modelo
  └─ site/catalog.json + data/raw/*.json  (se guardan en el repo)
```

- **Sin dependencias**: Node 22 y `fetch` nativo.
- **Tolerante a fallas**: si una tienda falla, se conservan sus últimos datos y la página la marca como "sin actualizar".
- **Agrupación**: por código de barras (cuando existe) o por número de modelo del fabricante, con reglas para no mezclar capacidades distintas (GB) ni tamaños distintos (pulgadas).

### Nota sobre La Curacao

Su API de listado responde solo a su propio sitio, así que se respeta esa restricción: se toma lo que la página pública de cada categoría entrega en el HTML (los primeros ~20 productos en existencia). En categorías grandes (celulares, televisores, camas) la cobertura es parcial.

### Nota sobre Jetstereo

`api.jetstereo.com` responde **403** a las consultas que salen de servidores en la nube (como GitHub Actions): es una protección anti-bots y no se intenta burlar. El extractor está listo y funciona desde un navegador normal, pero la actualización automática diaria no puede incluir a Jetstereo mientras ellos mantengan ese bloqueo. La vía limpia es pedirle a Jetstereo un feed de productos o acceso a su API.

## Correr local

```bash
node src/scrape.mjs              # todas las tiendas
node src/scrape.mjs diunsa       # solo una
npx serve site                   # abrir la página
node src/make-artifact.mjs       # dist/vitrina.html con el catálogo incrustado
```

## Publicar la página

El repo es privado. Para publicarla gratis con GitHub Pages hay que hacerlo público y activar Pages (Settings → Pages → Deploy from branch → `main` / carpeta `/site`). También funciona en Vercel o Netlify apuntando a la carpeta `site`.

## Agregar o cambiar categorías

1. Agregar la categoría propia en `src/taxonomy.mjs`.
2. Mapear el código de cada tienda en el `MAP` de su archivo en `src/stores/`.
