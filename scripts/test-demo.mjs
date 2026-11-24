// Проверка мини-демо и (если есть) видео-модалки: мышь на десктопе, палец на телефоне.
// node scripts/test-demo.mjs <url> <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const [url = 'http://localhost:4321/mesto-landing/', out = '.shots/demo'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FAIL ') + msg); if (!cond) fail++; };
const tx = (page) => page.$eval('[data-panoimg]', (e) => new DOMMatrix(getComputedStyle(e).transform).m41);

// ---------- десктоп, мышь ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#demo').scrollIntoViewIfNeeded();
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator('[data-stage]').screenshot({ path: `${out}/d-plan.png` });
  for (const n of [1, 2, 3, 4, 5]) {
    await page.click(`.pin[data-open="${n}"]`);
    if (n === 4) { await page.waitForTimeout(450); await page.locator('[data-stage]').screenshot({ path: `${out}/d-zoom.png` }); }
    await page.waitForFunction(() => document.querySelector('[data-demo]').classList.contains('is-pano'), null, { timeout: 8000 });
    await page.waitForTimeout(700);
    const natural = await page.$eval('[data-panoimg]', (e) => e.naturalWidth);
    ok(natural > 0, `стол ${n}: панорама загружена (${natural}px), подпись «${await page.textContent('[data-label]')}»`);
    if (n === 4) {
      await page.locator('[data-stage]').screenshot({ path: `${out}/d-pano.png` });
      const box = await page.locator('[data-track]').boundingBox();
      const before = await tx(page);
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(500);
      const after = await tx(page);
      ok(after < before - 50, `перетаскивание мышью сдвигает панораму (${before.toFixed(0)} → ${after.toFixed(0)})`);
      await page.focus('[data-track]');
      const k0 = await tx(page);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(700);
      ok((await tx(page)) > k0, 'стрелка влево поворачивает панораму');
    }
    await page.click('[data-back]');
    await page.waitForFunction(() => !document.querySelector('[data-demo]').classList.contains('is-zoom'), null, { timeout: 5000 });
    await page.waitForTimeout(300);
    ok(await page.isVisible(`.pin[data-open="${n}"]`), `стол ${n}: «Назад к залу» вернул план`);
  }
  // Esc
  await page.click('.pin[data-open="2"]');
  await page.waitForFunction(() => document.querySelector('[data-demo]').classList.contains('is-pano'), null, { timeout: 8000 });
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1300);
  ok(!(await page.$eval('[data-demo]', (e) => e.classList.contains('is-zoom'))), 'Esc закрывает панораму');
  ok(errors.length === 0, 'нет JS-ошибок на десктопе ' + errors.join('; '));
  await page.close();
}

// ---------- телефон, касания ----------
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator('[data-stage]').screenshot({ path: `${out}/m-plan.png` });
  for (const n of [1, 2, 3, 4, 5]) {
    const vis = await page.locator(`.pin[data-open="${n}"]`).boundingBox();
    const st = await page.locator('[data-stage]').boundingBox();
    ok(vis && vis.x >= st.x - 2 && vis.x + vis.width <= st.x + st.width + 2, `телефон: метка ${n} внутри кадра`);
  }
  await page.tap('.pin[data-open="5"]');
  await page.waitForFunction(() => document.querySelector('[data-demo]').classList.contains('is-pano'), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.locator('[data-stage]').screenshot({ path: `${out}/m-pano.png` });
  const box = await page.locator('[data-track]').boundingBox();
  const before = await tx(page);
  const cdp = await ctx.newCDPSession(page);
  const y = box.y + box.height / 2;
  const pt = (x) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(box.x + box.width * 0.8) });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(box.x + box.width * (0.8 - i * 0.06)) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);
  const after = await tx(page);
  ok(after < before - 30, `свайп пальцем сдвигает панораму (${before.toFixed(0)} → ${after.toFixed(0)})`);
  await page.tap('[data-back]');
  await page.waitForTimeout(1400);
  ok(await page.isVisible('.pin[data-open="5"]'), 'телефон: «Назад к залу» работает');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 360, `телефон: нет горизонтального скролла (${sw})`);
  await ctx.close();
}

// ---------- видео-модалка (если на странице есть карточки) ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const media = [];
  page.on('request', (r) => { if (/\.(mp4|webm)(\?|$)/.test(r.url())) media.push(r.url()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const cards = await page.$$('[data-video]');
  if (cards.length) {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); } });
    ok(media.length === 0, `до клика видео не грузится (${media.length} запросов)`);
    const playable = await page.$$('[data-video]:not([aria-disabled="true"])');
    if (playable.length) {
      await playable[0].click();
      await page.waitForTimeout(800);
      ok(await page.$eval('[data-modal]', (d) => d.open), 'модалка открывается по клику');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      ok(!(await page.$eval('[data-modal]', (d) => d.open)), 'Esc закрывает модалку');
      await playable[0].click();
      await page.waitForTimeout(600);
      await page.mouse.click(15, 450);
      await page.waitForTimeout(500);
      ok(!(await page.$eval('[data-modal]', (d) => d.open)), 'клик по фону закрывает модалку');
      await playable[0].click();
      await page.waitForTimeout(600);
      await page.click('[data-modal-close]');
      await page.waitForTimeout(500);
      ok(!(await page.$eval('[data-modal]', (d) => d.open)), 'крестик закрывает модалку');
    } else {
      console.log('INFO карточки роликов — плейсхолдеры, плеер нечего открыть');
    }
  }
  await page.close();
}

await browser.close();
console.log(fail ? `\n${fail} проверок не прошло` : '\nВсе проверки пройдены');
process.exit(fail ? 1 : 0);
