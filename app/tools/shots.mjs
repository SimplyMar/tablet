// Usage: node tools/shots.mjs [scene ...]   scenes: home work music clock calendar seq-music-open seq-music-close seq-work seq-headline
// Writes PNGs to $SHOTS_DIR (default ./shots). Sequences are captured with animations slowed by $RATE (default 0.25).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const dir = process.env.SHOTS_DIR || 'shots';
const base = process.env.BASE_URL || 'http://localhost:4173/?demo';
const scenes = process.argv.slice(2).length ? process.argv.slice(2) : ['home'];
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fresh() {
  const page = await browser.newPage({ viewport: { width: 1152, height: 718 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(base);
  await page.waitForSelector('#viewport[data-ready]');
  await sleep(900);
  return page;
}
// Pause every animation the action just created and render it at exact timestamps (ms since the action).
async function seek(page, name, times) {
  await page.evaluate(() => { window.__anims = document.getAnimations(); window.__anims.forEach((a) => a.pause()); });
  for (let i = 0; i < times.length; i++) {
    await page.evaluate((t) => window.__anims.forEach((a) => { a.currentTime = t; }), times[i]);
    await page.screenshot({ path: `${dir}/${name}_${String(i).padStart(2, '0')}.png` });
  }
}
const T = (n, step) => Array.from({ length: n }, (_, i) => i * step);

for (const scene of scenes) {
  const page = await fresh();
  if (scene === 'home') await page.screenshot({ path: `${dir}/home.png` });
  else if (scene === 'work') { await page.evaluate(() => window.__dash.setMode('work')); await sleep(1500); await page.screenshot({ path: `${dir}/work.png` }); }
  else if (['music', 'clock', 'calendar', 'chat', 'settings', 'apps', 'notifs'].includes(scene)) { await page.evaluate((n) => window.__dash.openPanel(n), scene); await sleep(1400); await page.screenshot({ path: `${dir}/${scene}.png` }); }
  else if (scene === 'rest' || scene === 'coffee') { await page.evaluate((m) => window.__dash.setMode(m), scene); await sleep(1500); await page.screenshot({ path: `${dir}/${scene}.png` }); }
  else if (scene === 'listen') { await page.evaluate(() => window.__dash.hero.say('Selamat sore, isni', 'Aku dengerin…', { who: 'Mendengarkan', state: 'listen', big: true })); await sleep(900); await page.screenshot({ path: `${dir}/listen.png` }); }
  else if (scene === 'speak') { await page.evaluate(() => window.__dash.hero.say('Selamat sore, isni', 'Iya, sekarang gerimis di luar, suhu dua puluh sembilan derajat.', { who: 'Aino', state: 'speak', big: false })); await sleep(900); await page.screenshot({ path: `${dir}/speak.png` }); }
  else if (scene === 'more') { await page.click('button[aria-label="Lainnya"]'); await sleep(600); await page.screenshot({ path: `${dir}/more.png` }); }
  else if (scene === 'volume') { await page.click('button[aria-label="Volume"]'); await sleep(600); await page.screenshot({ path: `${dir}/volume.png` }); }
  else if (scene === 'seq-music-open') { await page.evaluate(() => { window.__dash.openPanel('music'); }); await seek(page, scene, T(12, 45)); }
  else if (scene === 'seq-clock-open') { await page.evaluate(() => { window.__dash.openPanel('clock'); }); await seek(page, scene, T(12, 45)); }
  else if (scene === 'seq-music-close') { await page.evaluate(() => window.__dash.openPanel('music')); await sleep(3500); await page.evaluate(() => { window.__dash.closePanel(); }); await seek(page, scene, T(12, 65)); }
  else if (scene === 'seq-headline') { await page.evaluate(() => { window.__dash.hero.nextHeadline(); }); await seek(page, scene, T(12, 40)); }
  else console.error('unknown scene', scene);
  await page.close();
}
await browser.close();
console.log('shots ok');
