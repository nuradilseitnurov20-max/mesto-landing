// Конвертирует исходники из raw/*.png в src/assets/demo/*.jpg и делает OG-картинку.
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'node:fs';

const names = ['plan', 'cover', 'table-1', 'table-2', 'table-3', 'table-4', 'table-5'];
mkdirSync('src/assets/demo', { recursive: true });
for (const n of names) {
  const src = `raw/${n}.png`;
  if (!existsSync(src)) { console.warn('нет', src); continue; }
  await sharp(src).jpeg({ quality: 88, mozjpeg: true }).toFile(`src/assets/demo/${n}.jpg`);
  console.log('ok', n);
}
// OG-картинка и иконки: node scripts/og.mjs
