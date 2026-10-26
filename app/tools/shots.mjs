// Usage: node tools/shots.mjs [name=url-hash ...]  -> writes PNGs to $SHOTS_DIR (default ./shots)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');

const dir = process.env.SHOTS_DIR || 'shots';
const base = process.env.BASE_URL || 'http://localhost:4173/?demo';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 718 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto(base);
await page.waitForSelector('#viewport[data-ready]');
await page.waitForTimeout(900);
await page.screenshot({ path: `${dir}/home.png` });
await browser.close();
console.log('shots ok');
