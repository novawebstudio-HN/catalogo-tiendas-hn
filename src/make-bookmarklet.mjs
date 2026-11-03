// Genera los capturadores para las tiendas que rechazan consultas desde la nube. El código real se publica
// con la página (site/captura/<tienda>.js), a partir de los extractores de src/stores; el botón del navegador
// (bookmarklet) es solo un cargador que descarga esa versión publicada y la ejecuta dentro del sitio de la
// tienda. Así los botones no hay que reinstalarlos cuando cambian los extractores.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const PAGES = 'https://vitrinahn.shop';
const TARGETS = [
  { id: 'jetstereo', file: 'src/stores/jetstereo.mjs', fn: 'scrapeJetstereo', host: 'jetstereo\\.com$', site: 'www.jetstereo.com', cred: 'omit' },
  { id: 'acosa', file: 'src/stores/acosa.mjs', fn: 'scrapeAcosa', host: 'acosa\\.com\\.hn$', site: 'acosa.com.hn', cred: 'same-origin' },
];

await mkdir('site/captura', { recursive: true });
for (const t of TARGETS) {
  const files = t.files || [t.file];
  const mod = (await Promise.all(files.map((f) => readFile(f, 'utf8')))).join('\n').replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const code = `(async()=>{
if(!/${t.host}/.test(location.hostname)){alert('Abre ${t.site} y vuelve a hacer clic.');return;}
const box=document.createElement('div');box.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#059669;color:#fff;padding:12px 16px;border-radius:8px;font:600 14px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.2)';box.textContent='Vitrina HN: capturando ${t.id}…';document.body.appendChild(box);
${mod}
try{
const items=await ${t.fn}({fetch:(u,o)=>fetch(u,{...(o||{}),credentials:'${t.cred}'}),sleep:(ms)=>new Promise(r=>setTimeout(r,ms*2))});
const blob=new Blob([JSON.stringify({captured:new Date().toISOString(),source:'navegador',items})],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${t.id}.json';document.body.appendChild(a);a.click();
box.textContent='Listo: '+items.length+' productos. Ahora abre subir-captura.command (carpeta vitrina-hn/tools) para subirlo.';
}catch(e){box.style.background='#B91C1C';box.textContent='Error: '+e.message;}
setTimeout(()=>box.remove(),15000);
})();`;
  await writeFile(`site/captura/${t.id}.js`, code);
  const loader = `(async()=>{try{const s=await(await fetch('${PAGES}/captura/${t.id}.js?'+Date.now(),{cache:'no-store'})).text();(0,eval)(s);}catch(e){alert('No se pudo cargar el capturador de ${t.id}: '+e.message);}})();`;
  await writeFile(`tools/bookmarklet-${t.id}.txt`, 'javascript:' + encodeURIComponent(loader));
  await writeFile(`tools/captura-${t.id}.js`, code);
  console.log(`site/captura/${t.id}.js y tools/bookmarklet-${t.id}.txt listos`);
}

// Página local con los botones para arrastrar a la barra de marcadores y los pasos (tools/captura-tiendas.html).
const href = async (id) => (await readFile(`tools/bookmarklet-${id}.txt`, 'utf8')).replace(/"/g, '%22');
const UPLOAD = 'https://github.com/novawebstudio-HN/catalogo-tiendas-hn/upload/main/data/manual';
const kit = `<!doctype html>
<html lang="es-HN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Captura de precios</title>
<style>
:root{--ink:#0B1F17;--muted:#5D6873;--line:#E6EAEE;--soft:#F5F7F9;--tag:#E8F7F0;--act:#059669}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:30px;line-height:1.1;margin:0 0 6px}h2{font-size:20px;margin:0 0 4px}
.lead{color:var(--muted);margin:0 0 26px}
.step{border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:0 0 14px}
.step .n{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ink);color:#fff;font-weight:700;font-size:14px;margin-right:8px}
.step h2{display:flex;align-items:center}
.step p,.step li{color:#2B333C}.step ol{margin:8px 0 0;padding-left:22px}.step li{margin:6px 0}
.once{background:var(--soft)}
.bm{display:inline-flex;align-items:center;gap:8px;background:var(--tag);color:#065F46;font-weight:700;text-decoration:none;padding:10px 16px;border-radius:10px;margin:8px 10px 4px 0;cursor:grab;border:2px dashed #059669}
.btn{display:inline-flex;align-items:center;gap:6px;background:var(--ink);color:#fff;font-weight:600;text-decoration:none;padding:10px 16px;border-radius:10px;margin-top:8px}
.link{color:var(--act);font-weight:600}
kbd{background:#fff;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:1px 6px;font-size:14px}
details{margin-top:10px;color:var(--muted)}summary{cursor:pointer;color:var(--act);font-weight:600}
button.copy{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;margin:6px 6px 0 0;font:inherit}
.ok{color:#127A45;font-weight:600}
</style></head><body><main>
<h1>Actualizar precios de Jetstereo y Acosa</h1>
<p class="lead">Estas dos tiendas no dejan que el sistema consulte desde la nube, así que sus precios se toman desde tu navegador. Hazlo una vez por semana: son unos 5 minutos.</p>

<section class="step once"><h2><span class="n">0</span>Solo la primera vez: instala los botones</h2>
<ol>
<li>Muestra la barra de marcadores de Chrome: <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> en Mac (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> en Windows).</li>
<li>Arrastra cada botón verde hasta esa barra:<br>
<a class="bm" href="${await href('jetstereo')}" onclick="alert('Arrástrame a la barra de marcadores; no hagas clic aquí.');return false;">Capturar Jetstereo</a>
<a class="bm" href="${await href('acosa')}" onclick="alert('Arrástrame a la barra de marcadores; no hagas clic aquí.');return false;">Capturar Acosa</a></li>
<li>Si ya tenías botones viejos, bórralos (clic derecho sobre el botón → <b>Eliminar</b>). Los nuevos se actualizan solos: siempre usan la última versión publicada.</li>
</ol>
<details><summary>¿No se puede arrastrar? Hazlo a mano</summary>
<p>Copia el código de un botón, luego clic derecho en la barra de marcadores → <b>Agregar página…</b>, ponle el nombre y pega el código en <b>URL</b>.</p>
<button class="copy" data-id="jetstereo">Copiar código de Jetstereo</button><button class="copy" data-id="acosa">Copiar código de Acosa</button> <span id="copied" class="ok"></span>
</details>
</section>

<section class="step"><h2><span class="n">1</span>Jetstereo</h2>
<ol><li>Abre <a class="link" href="https://www.jetstereo.com/" target="_blank" rel="noopener">jetstereo.com</a>.</li>
<li>Haz clic en tu botón <b>Capturar Jetstereo</b>. Abajo a la derecha aparece un aviso amarillo.</li>
<li>Espera 3 a 4 minutos sin cerrar la pestaña. Cuando diga <b>Listo</b>, se descarga <b>jetstereo.json</b>.</li></ol></section>

<section class="step"><h2><span class="n">2</span>Acosa</h2>
<ol><li>Abre <a class="link" href="https://acosa.com.hn/" target="_blank" rel="noopener">acosa.com.hn</a>.</li>
<li>Haz clic en tu botón <b>Capturar Acosa</b>.</li>
<li>En menos de un minuto dice <b>Listo</b> y se descarga <b>acosa.json</b>.</li></ol></section>

<section class="step"><h2><span class="n">3</span>Súbelos a GitHub</h2>
<ol><li>Abre la carpeta de subida: <br><a class="btn" href="${UPLOAD}" target="_blank" rel="noopener">Subir archivos a GitHub</a></li>
<li>Arrastra <b>jetstereo.json</b> y <b>acosa.json</b> desde tu carpeta de Descargas. No importa si Chrome les agregó un número, como "jetstereo (1).json".</li>
<li>Abajo, haz clic en el botón verde <b>Commit changes</b>.</li></ol>
<p>Listo. En unos 5 minutos los precios nuevos aparecen en <a class="link" href="https://vitrinahn.shop/" target="_blank" rel="noopener">Vitrina HN</a>.</p></section>
</main>
<script>
const codes = { jetstereo: document.querySelectorAll('.bm')[0].href, acosa: document.querySelectorAll('.bm')[1].href };
document.querySelectorAll('button.copy').forEach((b) => b.onclick = () => {
  const t = document.createElement('textarea'); t.value = codes[b.dataset.id]; document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); document.getElementById('copied').textContent = 'Copiado'; } catch { prompt('Copia este código:', t.value); }
  t.remove();
});
</script>
</body></html>`;
await writeFile('tools/captura-tiendas.html', kit);
console.log('tools/captura-tiendas.html listo');
