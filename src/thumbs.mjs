// Descarga la foto de cada producto y guarda una miniatura WebP liviana en site/thumbs/.
// Solo baja las que faltan; las ya guardadas se reutilizan entre corridas.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const DIR = 'site/thumbs';
const SIZE = 220;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

await mkdir(DIR, { recursive: true });
const catalog = JSON.parse(await readFile('site/catalog.json', 'utf8'));
const have = new Set((await readdir(DIR)).map((f) => f.replace(/\.webp$/, '')));
const key = (url) => createHash('sha1').update(url).digest('hex').slice(0, 16);

const todo = [];
for (const p of catalog.products) {
  if (!p.i) continue;
  p.t = key(p.i);
  if (!have.has(p.t)) todo.push(p);
}

let ok = 0, fail = 0;
const worker = async () => {
  while (todo.length) {
    const p = todo.shift();
    try {
      const res = await fetch(p.i, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const out = await sharp(buf).resize(SIZE, SIZE, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).webp({ quality: 62 }).toBuffer();
      await writeFile(`${DIR}/${p.t}.webp`, out);
      have.add(p.t); ok++;
    } catch { fail++; }
  }
};
await Promise.all(Array.from({ length: 6 }, worker));

// Solo se marca la miniatura en los productos que sí la tienen.
for (const p of catalog.products) if (p.t && !have.has(p.t)) delete p.t;
await writeFile('site/catalog.json', JSON.stringify(catalog));

// Limpia miniaturas que ya no usa ningún producto.
const used = new Set(catalog.products.map((p) => p.t).filter(Boolean));
let removed = 0;
for (const f of await readdir(DIR)) if (!used.has(f.replace(/\.webp$/, ''))) { await unlink(`${DIR}/${f}`); removed++; }
console.log(`Miniaturas: ${ok} nuevas, ${fail} fallidas, ${removed} eliminadas, ${used.size} en uso.`);
