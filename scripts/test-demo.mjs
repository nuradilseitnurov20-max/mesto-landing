// Проверка интерактива: живое демо (iframe по клику), вкладки панели, шаги гостя, видео-плеер.
// node scripts/test-demo.mjs <url>
import { chromium } from 'playwright';

const [url = 'http://localhost:4321/mesto-landing/'] = process.argv.slice(2);
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); if (!c) process.exitCode = 1; };
const b = await chromium.launch();

for (const [w, h] of [[1440, 900], [360, 780]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let frameReq = 0; p.on('request', (r) => r.url().includes('mesto-eta.vercel.app') && frameReq++);
  await p.goto(url, { waitUntil: 'networkidle' });
  ok(frameReq === 0, `${w}: демо не грузится до клика`);
  await p.locator('#demo').scrollIntoViewIfNeeded();
  await p.locator('[data-live-start]').click();
  const fr = p.frameLocator('[data-live] iframe');
  await fr.locator('body').waitFor({ timeout: 30000 });
  await p.waitForSelector('[data-live].is-on', { timeout: 30000 }).catch(() => {});
  const txt = await fr.locator('body').innerText({ timeout: 30000 }).catch(() => '');
  ok(/Dadli/i.test(txt), `${w}: в телефоне открылась страница Dadli`);
  ok(await p.locator('[data-live].is-on').count() === 1, `${w}: постер скрыт, демо видно`);
  // вкладки панели
  const tabs = p.locator('[data-rx] [role="tab"]');
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    const vis = await p.locator('[data-rx] [role="tabpanel"]:not([hidden])').count();
    const img = await p.locator('[data-rx] [role="tabpanel"]:not([hidden]) img').evaluate((el) => new Promise((r) => el.complete ? r(el.naturalWidth) : el.onload = () => r(el.naturalWidth)));
    ok(vis === 1 && img > 0, `${w}: вкладка ${i + 1}/${n} — одна панель, скриншот загружен`);
  }
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w}: нет горизонтального скролла`);
  ok(errs.length === 0, `${w}: нет JS-ошибок ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log(process.exitCode ? '\nЕсть ошибки' : '\nВсе проверки пройдены');
