// node scripts/slice.mjs <png> <chunkHeight>  → режет длинный скриншот на части
import sharp from 'sharp';
const [f, h = '1800'] = process.argv.slice(2);
const m = await sharp(f).metadata();
const H = +h; let i = 0;
for (let top = 0; top < m.height; top += H) {
  await sharp(f).extract({ left: 0, top, width: m.width, height: Math.min(H, m.height - top) }).toFile(f.replace('.png', `-${i++}.png`));
}
console.log(m.width, m.height, i);
