// Captura desde la Mac de Jetstereo y Acosa, las tiendas que rechazan consultas desde la nube.
// Hace lo mismo que el botón del navegador: abre Google Chrome, entra al sitio de la tienda y lee su catálogo
// desde ahí, a ritmo pausado. Es automatización visible (Chrome la anuncia como tal) y no intenta pasar
// verificaciones: si la tienda muestra un reto o bloquea, se detiene y lo informa.
// Uso: node src/capture-browser.mjs [jetstereo] [acosa]   (sin argumentos = ambas)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const TARGETS = {
  jetstereo: { file: 'src/stores/jetstereo.mjs', fn: 'scrapeJetstereo', url: 'https://www.jetstereo.com/', cred: 'omit' },
  acosa: { file: 'src/stores/acosa.mjs', fn: 'scrapeAcosa', url: 'https://acosa.com.hn/', cred: 'same-origin' },
};
const CHALLENGE = /just a moment|verif(y|ica)|captcha|attention required|access denied|bxverify/i;

const wanted = process.argv.slice(2).filter((a) => TARGETS[a]);
const ids = wanted.length ? wanted : Object.keys(TARGETS);

// Perfil propio de Chrome para la captura (no toca tu perfil personal ni tus sesiones).
const ctx = await chromium.launchPersistentContext(join(homedir(), '.vitrina-hn-chrome'), {
  channel: 'chrome', headless: false, viewport: { width: 1100, height: 760 }, locale: 'es-HN',
});
const results = {};
try {
  for (const id of ids) {
    const t = TARGETS[id];
    const page = await ctx.newPage();
    try {
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);
      const title = await page.title();
      if (!res || res.status() >= 400 || CHALLENGE.test(title) || CHALLENGE.test(page.url())) {
        throw new Error(`la tienda pidió verificación o bloqueó la visita (HTTP ${res?.status()}, "${title}"); no se intenta pasarla`);
      }
      const mod = (await readFile(t.file, 'utf8')).replace(/^import .*$/gm, '').replace(/^export /gm, '');
      const code = `(async () => { ${mod}
        return await ${t.fn}({ fetch: (u, o) => fetch(u, { ...(o || {}), credentials: '${t.cred}' }), sleep: (ms) => new Promise((r) => setTimeout(r, ms * 2)) });
      })()`;
      page.setDefaultTimeout(30 * 60 * 1000);
      const items = await page.evaluate(code);
      if (!items?.length) throw new Error('no devolvió productos');
      await mkdir('data/manual', { recursive: true });
      await writeFile(`data/manual/${id}.json`, JSON.stringify({ captured: new Date().toISOString(), source: 'mac', items }));
      results[id] = `${items.length} productos`;
      console.log(`${id}: ${items.length} productos guardados en data/manual/${id}.json`);
    } catch (e) {
      results[id] = `error: ${e.message}`;
      console.error(`${id}: ${e.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await ctx.close();
}
await writeFile('/tmp/vitrina-captura-resumen.txt', ids.map((id) => `${id}: ${results[id]}`).join('\n'));
if (!Object.values(results).some((r) => !r.startsWith('error'))) process.exit(1);
