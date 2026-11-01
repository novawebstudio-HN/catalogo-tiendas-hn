// Genera tools/bookmarklet-jetstereo.txt a partir del extractor real (src/stores/jetstereo.mjs),
// para que el botón del navegador y la captura de la Mac usen exactamente la misma lógica.
import { readFile, writeFile } from 'node:fs/promises';

const mod = (await readFile('src/stores/jetstereo.mjs', 'utf8')).replace(/^export /m, '');
const code = `(async()=>{
if(!/jetstereo\\.com$/.test(location.hostname)){alert('Abre www.jetstereo.com y vuelve a hacer clic.');return;}
const box=document.createElement('div');box.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;background:#FFDA4D;color:#1E1700;padding:12px 16px;border-radius:8px;font:600 14px system-ui;box-shadow:0 2px 8px rgba(0,0,0,.2)';box.textContent='Vitrina HN: capturando Jetstereo…';document.body.appendChild(box);
${mod}
try{
const items=await scrapeJetstereo({fetch:(u,o)=>fetch(u,{...(o||{}),credentials:'omit'}),sleep:(ms)=>new Promise(r=>setTimeout(r,ms*2))});
const blob=new Blob([JSON.stringify({captured:new Date().toISOString(),source:'navegador',items})],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='jetstereo.json';document.body.appendChild(a);a.click();
box.textContent='Listo: '+items.length+' productos. Sube jetstereo.json a data/manual/ en GitHub.';
}catch(e){box.style.background='#FDE2E2';box.textContent='Error: '+e.message;}
setTimeout(()=>box.remove(),15000);
})();`;
await writeFile('tools/bookmarklet-jetstereo.txt', 'javascript:' + encodeURIComponent(code));
await writeFile('tools/captura-jetstereo.js', code);
console.log('tools/bookmarklet-jetstereo.txt listo');
