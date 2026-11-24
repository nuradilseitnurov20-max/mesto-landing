// Сжимает обучающие ролики и обновляет список роликов для сайта.
//
//   npm run videos                       — берёт materials/videos/*, кладёт результат в public/videos/
//   node scripts/compress-videos.mjs <inDir> <outDir> <manifest>
//
// Имя файла = порядок и название: «01 Как гость бронирует стол.mp4» → №1, «Как гость бронирует стол».
// Описание (необязательно): файл с тем же именем и расширением .txt или .md рядом с роликом.
// Ролики > 90 МБ после сжатия в репозиторий не кладутся: карточка ждёт ссылку YouTube (поле youtube
// в src/data/videos.json), а пункт добавляется в TODO.md.
// Оригиналы в materials/ не меняются.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const [inDir = 'materials/videos', outDir = 'public/videos', manifestPath = 'src/data/videos.json'] = process.argv.slice(2);
const LIMIT = 90 * 1024 * 1024;
const EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.avi']);

if (!existsSync(inDir)) { console.log(`Нет папки ${inDir} — нечего сжимать.`); process.exit(0); }
mkdirSync(outDir, { recursive: true });

const translit = (s) => {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', қ: 'q', ғ: 'g', ү: 'u', ұ: 'u', ң: 'n', ө: 'o', һ: 'h', і: 'i', ә: 'a' };
  return s.toLowerCase().split('').map((c) => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';
};
const parseName = (file) => {
  const stem = basename(file, extname(file));
  const m = stem.match(/^\s*(\d+)[\s._)\-–—]*(.*)$/);
  const order = m ? Number(m[1]) : 999;
  const title = (m ? m[2] : stem).replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || stem;
  return { stem, order, title };
};
const run = (args) => spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
const probeDuration = (file) => {
  const m = run(['-hide_banner', '-i', file]).stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  return m ? Math.round(+m[1] * 3600 + +m[2] * 60 + +m[3]) : 0;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const old = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
const keep = new Map(old.map((v) => [v.slug, v]));
const result = [];
const tooBig = [];

const files = readdirSync(inDir).filter((f) => EXT.has(extname(f).toLowerCase())).sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
for (const f of files) {
  const src = join(inDir, f);
  const { stem, order, title } = parseName(f);
  const slug = translit(`${order !== 999 ? String(order).padStart(2, '0') + '-' : ''}${title}`);
  const mp4 = join(outDir, `${slug}.mp4`);
  const poster = join(outDir, `${slug}.webp`);
  const desc = ['.txt', '.md'].map((e) => join(inDir, stem + e)).find(existsSync);
  const duration = probeDuration(src);

  if (!existsSync(mp4) || statSync(mp4).mtimeMs < statSync(src).mtimeMs) {
    console.log(`→ ${f}: сжимаю…`);
    const r = run(['-y', '-hide_banner', '-loglevel', 'error', '-i', src,
      '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', mp4]);
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  }
  const at = Math.min(Math.max(1, duration * 0.15), Math.max(0, duration - 0.5));
  run(['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(at), '-i', mp4, '-frames:v', '1',
    '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libwebp', '-quality', '72', poster]);

  const size = statSync(mp4).size;
  const prev = keep.get(slug) || {};
  const entry = {
    slug, order, title,
    description: desc ? readFileSync(desc, 'utf8').trim() : prev.description || '',
    duration: fmt(duration),
    poster: `videos/${slug}.webp`,
    src: `videos/${slug}.mp4`,
    youtube: prev.youtube || '',
    sizeMB: +(size / 1048576).toFixed(1),
  };
  if (size > LIMIT) {
    unlinkSync(mp4);
    entry.src = '';
    tooBig.push(entry);
    console.log(`  ! ${(size / 1048576).toFixed(0)} МБ > 90 МБ — нужен YouTube`);
  }
  console.log(`  ✓ ${title} (${entry.duration}, ${entry.sizeMB} МБ)`);
  result.push(entry);
}

writeFileSync(manifestPath, JSON.stringify(result.sort((a, b) => a.order - b.order), null, 2) + '\n');
console.log(`Список роликов: ${manifestPath} (${result.length})`);

if (tooBig.length && existsSync('TODO.md')) {
  const todo = readFileSync('TODO.md', 'utf8');
  const lines = tooBig.filter((v) => !v.youtube && !todo.includes(v.slug))
    .map((v) => `- [ ] **Ролик «${v.title}»** (${v.sizeMB} МБ > 90 МБ) — залить на YouTube с доступом по ссылке и вписать ссылку в \`src/data/videos.json\` → \`youtube\` (slug: ${v.slug}).`);
  if (lines.length) appendFileSync('TODO.md', lines.join('\n') + '\n');
}
