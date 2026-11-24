// Скриншоты страницы на нескольких ширинах + проверка горизонтального скролла.
// node scripts/shot.mjs <url> <outDir> [widths=360,1440] [full=1]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url = 'http://localhost:4321/mesto-landing/', out = '.shots', w = '360,1440', full = '1'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const width of w.split(',').map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: width < 800 ? 780 : 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  // прокрутить, чтобы сработали reveal и lazy-картинки
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  const overflow = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[data-overflow-ok]');
    }).slice(0, 5).map((el) => el.tagName + '.' + el.className);
    return { sw: document.documentElement.scrollWidth, vw, wide };
  });
  await page.screenshot({ path: `${out}/w${width}.png`, fullPage: full === '1' });
  console.log(width, JSON.stringify(overflow), errors.length ? 'ERR ' + errors.join(' | ') : 'no errors');
  await page.close();
}
await browser.close();
