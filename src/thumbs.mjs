// Descarga la foto de cada producto y guarda una miniatura WebP liviana en site/thumbs/.
// Prueba en orden las fotos candidatas del producto (de todas las tiendas donde aparece)
// y se queda con la primera que funcione. Las miniaturas ya guardadas se reutilizan.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const DIR = 'site/thumbs';
const SIZE = 220;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (url) => createHash('sha1').update(url).digest('hex').slice(0, 16);

await mkdir(DIR, { recursive: true });
const catalog = JSON.parse(await readFile('site/catalog.json', 'utf8'));
const have = new Set((await readdir(DIR)).map((f) => f.replace(/\.webp$/, '')));

async function download(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }, signal: AbortSignal.timeout(20000) });
      if (res.status === 404 || res.status === 403) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return await sharp(buf).resize(SIZE, SIZE, { fit: 'contain', background: '#ffffff' })
        .flatten({ background: '#ffffff' }).webp({ quality: 62 }).toBuffer();
    } catch {
      await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

const todo = [];
for (const p of catalog.products) {
  const cands = p.ii?.length ? p.ii : (p.i ? [p.i] : []);
  const cached = cands.find((u) => have.has(key(u)));
  if (cached) { p.t = key(cached); p.i = cached; } else if (cands.length) todo.push({ p, cands }); else delete p.t;
}

let ok = 0, fail = 0;
const worker = async () => {
  while (todo.length) {
    const { p, cands } = todo.shift();
    let done = false;
    for (const url of cands) {
      const out = await download(url);
      await sleep(150);
      if (!out) continue;
      const k = key(url);
      await writeFile(`${DIR}/${k}.webp`, out);
      have.add(k); p.t = k; p.i = url; ok++; done = true;
      break;
    }
    if (!done) { delete p.t; fail++; }
  }
};
await Promise.all(Array.from({ length: 4 }, worker));

for (const p of catalog.products) delete p.ii;
await writeFile('site/catalog.json', JSON.stringify(catalog));

const used = new Set(catalog.products.map((p) => p.t).filter(Boolean));
let removed = 0;
for (const f of await readdir(DIR)) if (!used.has(f.replace(/\.webp$/, ''))) { await unlink(`${DIR}/${f}`); removed++; }
const total = catalog.products.length;
console.log(`Miniaturas: ${ok} nuevas, ${fail} sin foto, ${removed} eliminadas; ${used.size}/${total} productos con foto.`);
