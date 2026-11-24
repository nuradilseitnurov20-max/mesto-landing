// Генерирует превью для соцсетей (public/og.jpg, 1200×630) из экранов продукта и шрифта сайта, плюс иконки.
// node scripts/og.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const b64 = (p) => readFileSync(p).toString('base64');
const shot = (await sharp('src/assets/product/guest-pano.png').resize(520).jpeg({ quality: 88 }).toBuffer()).toString('base64');
const shot2 = (await sharp('src/assets/product/guest-t1.png').resize(520).jpeg({ quality: 88 }).toBuffer()).toString('base64');
const f7 = b64('node_modules/@fontsource/manrope/files/manrope-cyrillic-700-normal.woff2');
const f7l = b64('node_modules/@fontsource/manrope/files/manrope-latin-700-normal.woff2');
const f4 = b64('node_modules/@fontsource/manrope/files/manrope-cyrillic-400-normal.woff2');
const f4l = b64('node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff2');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${f7}) format('woff2');unicode-range:U+0400-045F}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${f7l}) format('woff2');unicode-range:U+0000-00FF,U+2014}
@font-face{font-family:M;font-weight:400;src:url(data:font/woff2;base64,${f4}) format('woff2');unicode-range:U+0400-045F}
@font-face{font-family:M;font-weight:400;src:url(data:font/woff2;base64,${f4l}) format('woff2');unicode-range:U+0000-00FF,U+2014}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;position:relative;overflow:hidden;background:#f6f4ed;color:#252a27;font-family:M}
.blob{position:absolute;right:-120px;top:-60px;width:640px;height:760px;border-radius:80px;background:#c7deb4;transform:rotate(-8deg)}
.c{position:absolute;left:72px;top:64px;bottom:64px;width:640px;display:flex;flex-direction:column;justify-content:space-between}
.logo{display:flex;align-items:center;gap:14px;font-weight:700;letter-spacing:.14em;font-size:28px;color:#173b32}
.logo svg{width:52px;height:52px}
h1{font-weight:700;font-size:72px;line-height:1.02;letter-spacing:-.04em;color:#173b32}
h1 span{color:#252a27}
p{font-size:25px;color:#4a514d;line-height:1.4}
.ph{position:absolute;width:236px;height:510px;border-radius:40px;padding:9px;background:#1d2420;box-shadow:0 40px 80px -30px rgba(23,59,50,.5)}
.ph div{width:100%;height:100%;border-radius:32px;background-size:cover;background-position:top}
.p1{right:300px;top:90px;transform:rotate(-4deg)}
.p2{right:60px;top:40px;transform:rotate(5deg)}
</style></head><body><div class="blob"></div>
<div class="ph p1"><div style="background-image:url(data:image/jpeg;base64,${shot2})"></div></div>
<div class="ph p2"><div style="background-image:url(data:image/jpeg;base64,${shot})"></div></div>
<div class="c">
<div class="logo"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#173b32"/><path d="M19 43V22l13 13 13-13v21" fill="none" stroke="#c7deb4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>MESTO</div>
<h1>Всё для вашего<br>ресторана.<br><span>В одной системе</span></h1>
<p>Онлайн-бронирование, электронное меню,<br>CRM и аналитика</p>
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
await sharp(svg, { density: 600 }).resize(180, 180).flatten({ background: '#173b32' }).png().toFile('public/apple-touch-icon.png');
await sharp(svg, { density: 300 }).resize(32, 32).png().toFile('public/favicon-32.png');
await sharp(svg, { density: 600 }).resize(512, 512).png().toFile('public/icon-512.png');
console.log('og.jpg, apple-touch-icon.png, favicon-32.png, icon-512.png готовы');
