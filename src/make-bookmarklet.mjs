// Genera los botones de captura (bookmarklets) a partir de los extractores reales, para las tiendas
// que rechazan consultas desde la nube. Se ejecutan en el navegador de una persona, dentro del sitio
// de la tienda, y descargan un JSON que se sube a data/manual/<tienda>.json.
import { readFile, writeFile } from 'node:fs/promises';

const TARGETS = [
  { id: 'jetstereo', file: 'src/stores/jetstereo.mjs', fn: 'scrapeJetstereo', host: 'jetstereo\\.com$', site: 'www.jetstereo.com', cred: 'omit' },
  { id: 'acosa', file: 'src/stores/acosa.mjs', fn: 'scrapeAcosa', host: 'acosa\\.com\\.hn$', site: 'acosa.com.hn', cred: 'same-origin' },
];

for (const t of TARGETS) {
  const mod = (await readFile(t.file, 'utf8')).replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const code = `(async()=>{
if(!/${t.host}/.test(location.hostname)){alert('Abre ${t.site} y vuelve a hacer clic.');return;}
const box=document.createElement('div');box.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#FFDA4D;color:#1E1700;padding:12px 16px;border-radius:8px;font:600 14px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.2)';box.textContent='Vitrina HN: capturando ${t.id}…';document.body.appendChild(box);
${mod}
try{
const items=await ${t.fn}({fetch:(u,o)=>fetch(u,{...(o||{}),credentials:'${t.cred}'}),sleep:(ms)=>new Promise(r=>setTimeout(r,ms*2))});
const blob=new Blob([JSON.stringify({captured:new Date().toISOString(),source:'navegador',items})],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${t.id}.json';document.body.appendChild(a);a.click();
box.textContent='Listo: '+items.length+' productos. Sube ${t.id}.json a data/manual/ en GitHub.';
}catch(e){box.style.background='#FDE2E2';box.textContent='Error: '+e.message;}
setTimeout(()=>box.remove(),15000);
})();`;
  await writeFile(`tools/bookmarklet-${t.id}.txt`, 'javascript:' + encodeURIComponent(code));
  await writeFile(`tools/captura-${t.id}.js`, code);
  console.log(`tools/bookmarklet-${t.id}.txt listo`);
}
