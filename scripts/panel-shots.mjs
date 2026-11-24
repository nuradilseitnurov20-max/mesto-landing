// Снимает экраны панели MESTO ресторана Dadli для лендинга — только просмотр.
// Изменяющие запросы к базе блокируются; имена гостей заменяются условными, телефоны маскируются прямо в браузере.
// Нужен ~/mesto/.env.local (тестовый администратор). Запуск: node scripts/panel-shots.mjs <папка>
// Затем скопировать нужные PNG в src/assets/product/panel-*.png.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('C:/Users/Aiadil/mesto/.env.local', 'utf8').split(/\r?\n/).filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const out = process.argv[2];
const RID = 'f4ce18ea-55a2-4d10-9bba-e9c5f9a17e63';
const B = 'https://mesto-eta.vercel.app';

// имена гостей этого ресторана (только чтение)
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/reservations?select=guest_name&restaurant_id=eq.${RID}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } });
const names = [...new Set((await res.json()).map(r => (r.guest_name || '').trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
console.log('names', names.length);
const fake = ['Айгерим', 'Данияр', 'Мадина', 'Тимур', 'Алия', 'Ерлан', 'Дана', 'Арман', 'Камила', 'Нурлан', 'Асель', 'Руслан', 'Жанна', 'Ильяс', 'Сабина', 'Бекзат', 'Аружан', 'Марат', 'Томирис', 'Санжар', 'Лаура', 'Алихан', 'Диляра', 'Ержан', 'Карина', 'Олжас', 'Айдана', 'Максат', 'Гульнара', 'Азамат', 'Инкар', 'Самат', 'Меруерт', 'Батыр', 'Зарина'];
const map = Object.fromEntries(names.map((n, i) => [n.toLowerCase(), fake[i % fake.length]]));

const anon = (map) => {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(map).filter(k => k.length >= 2);
  const re = keys.length ? new RegExp('(^|[^\\p{L}])(' + keys.map(esc).join('|') + ')(?=$|[^\\p{L}])', 'giu') : null;
  const phone = /\+7[\s\d]{9,14}\d/g;
  const fix = (node) => {
    let t = node.nodeValue, o = t;
    t = t.replace(phone, (m) => { const d = m.replace(/\D/g, ''); return `+7 7•• ••• •• ${d.slice(-2)}`; });
    if (re) t = t.replace(re, (m, pre, name) => pre + (map[name.toLowerCase()] || name));
    if (t !== o) node.nodeValue = t;
  };
  const walk = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) fix(n); };
  walk(document.body);
  document.querySelectorAll('input').forEach((i) => { if (/\+7/.test(i.value)) i.value = ''; });
  new MutationObserver((ms) => ms.forEach((m) => { m.addedNodes.forEach((n) => n.nodeType === 3 ? fix(n) : n.nodeType === 1 && walk(n)); if (m.type === 'characterData') fix(m.target); })).observe(document.body, { subtree: true, childList: true, characterData: true });
  // скрыть e-mail аккаунта и кнопку звука
  document.querySelectorAll('header *').forEach((e) => { if (e.children.length === 0 && /@/.test(e.textContent)) e.textContent = ''; });
  document.querySelectorAll('button').forEach((b) => { if (/звук/i.test(b.textContent)) b.style.display = 'none'; });
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ru-RU' });
const p = await ctx.newPage();
await p.goto(B + '/login', { waitUntil: 'networkidle' });
await p.fill('input[name=email]', env.E2E_ADMIN_EMAIL);
await p.fill('input[name=password]', env.E2E_ADMIN_PASSWORD);
await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }), p.press('input[name=password]', 'Enter')]);
await p.route('**/rest/v1/**', (r) => ['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : (console.log('BLOCK', r.request().method()), r.abort()));
p.on('request', (r) => r.method() === 'POST' && !r.url().includes('/auth/') && console.log('POST', r.url().slice(0, 90)));

const shoot = async (s, after) => {
  await p.goto(`${B}/panel/${RID}/${s}`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.evaluate(anon, map);
  if (after) await after();
  await p.waitForTimeout(800);
  await p.evaluate(anon, map);
  await p.screenshot({ path: `${out}/${s}.png` });
  console.log('shot', s);
};
await shoot('overview');
await shoot('reservations');
await shoot('calendar', async () => { await p.getByRole('button', { name: 'Неделя' }).click().catch(() => {}); await p.waitForTimeout(1500); });
await shoot('map', async () => { await p.locator('button').filter({ hasText: /^\s*9\s*$/ }).first().click({ force: true }).catch(() => {}); await p.waitForTimeout(1500); });
await shoot('clients');
await shoot('analytics');
// карточка постоянного гостя
await p.goto(`${B}/panel/${RID}/clients`, { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await p.evaluate(anon, map);
await p.getByText('постоянный', { exact: false }).first().click().catch((e) => console.log('client click', e.message.slice(0, 60)));
await p.waitForTimeout(2500);
await p.evaluate(anon, map);
await p.screenshot({ path: `${out}/client-card.png` });
console.log('shot client-card', p.url().replace(B, ''));
await b.close();
