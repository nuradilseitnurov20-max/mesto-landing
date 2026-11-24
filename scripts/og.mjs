// Генерирует превью для соцсетей (public/og.jpg, 1200×630) и иконки из cover.jpg и шрифтов сайта.
// node scripts/og.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const b64 = (p) => readFileSync(p).toString('base64');
const cover = (await sharp('src/assets/demo/cover.jpg').resize(1400).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const fd = b64('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-500-normal.woff2');
const fdi = b64('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-cyrillic-500-italic.woff2');
const fdl = b64('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2');
const ft = b64('node_modules/@fontsource/manrope/files/manrope-latin-600-normal.woff2');
const ftc = b64('node_modules/@fontsource/manrope/files/manrope-cyrillic-600-normal.woff2');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:D;src:url(data:font/woff2;base64,${fd}) format('woff2');unicode-range:U+0400-045F}
@font-face{font-family:D;src:url(data:font/woff2;base64,${fdl}) format('woff2');unicode-range:U+0000-00FF,U+2014}
@font-face{font-family:DI;src:url(data:font/woff2;base64,${fdi}) format('woff2')}
@font-face{font-family:T;src:url(data:font/woff2;base64,${ft}) format('woff2');unicode-range:U+0000-00FF}
@font-face{font-family:T;src:url(data:font/woff2;base64,${ftc}) format('woff2');unicode-range:U+0400-045F}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;position:relative;overflow:hidden;background:#15100d;color:#f3e9dc;font-family:T}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,${cover}) center 55%/cover}
.sh{position:absolute;inset:0;background:linear-gradient(90deg,rgba(21,16,13,.94) 0%,rgba(21,16,13,.78) 42%,rgba(21,16,13,.15) 80%),linear-gradient(0deg,rgba(21,16,13,.7),transparent 45%)}
.c{position:absolute;left:72px;top:64px;bottom:64px;width:760px;display:flex;flex-direction:column;justify-content:space-between}
.logo{display:flex;align-items:center;gap:14px;font-weight:600;letter-spacing:.32em;font-size:24px}
.logo svg{width:40px;height:40px;color:#d9a05b}
h1{font-family:D;font-weight:500;font-size:76px;line-height:1.02;letter-spacing:-.01em}
h1 em{font-family:DI;font-style:italic;color:#d9a05b}
p{font-size:24px;color:#d6c8b6;letter-spacing:.01em}
</style></head><body><div class="bg"></div><div class="sh"></div><div class="c">
<div class="logo"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".55"/><path d="M19 43V22l13 13 13-13v21" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>MESTO</div>
<h1>Гость выбирает стол —<br>и&nbsp;заранее видит,<br><em>как будет сидеть</em></h1>
<p>Бронирование с видом с места · подключение за 1 день</p>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await browser.close();
await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile('public/og.jpg');

// Иконки
const svg = readFileSync('public/favicon.svg');
await sharp(svg, { density: 600 }).resize(180, 180).flatten({ background: '#15100d' }).png().toFile('public/apple-touch-icon.png');
await sharp(svg, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(svg, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');
console.log('og.jpg, apple-touch-icon.png, favicon-32.png, icon-512.png готовы');
