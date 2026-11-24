// node scripts/lh.mjs <url> <name>  — Lighthouse mobile, печатает баллы и ключевые метрики
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const [url = 'http://localhost:4321/mesto-landing/', name = 'run'] = process.argv.slice(2);
mkdirSync('.lighthouse', { recursive: true });
const out = `.lighthouse/${name}`;
try {
  execFileSync('npx', ['-y', 'lighthouse@latest', url, '--quiet', '--chrome-flags=--headless=new --no-sandbox', '--output=json', '--output=html', `--output-path=${out}`],
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: 'inherit', shell: true });
} catch (e) { /* lighthouse иногда падает на закрытии Chrome под Windows — отчёт при этом записан */ }
const r = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'));
const a = r.audits;
console.log(Object.entries(r.categories).filter(([k]) => k !== 'agentic-browsing').map(([k, v]) => `${k} ${Math.round(v.score * 100)}`).join(' | '));
console.log(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((id) => `${id.replace(/-/g, ' ')}: ${a[id].displayValue}`).join(' | '));
console.log('main thread:', a['mainthread-work-breakdown'].details.items.map((i) => `${i.groupLabel} ${Math.round(i.duration)}`).join(', '));
