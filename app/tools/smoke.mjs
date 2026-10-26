// Headless smoke test of the real UI. Run against a built preview: BASE_URL=http://localhost:4173/?demo node tools/smoke.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BASE_URL || 'http://localhost:4173/?demo';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 718 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base);
await page.waitForSelector('#viewport[data-ready]');
await sleep(800);
const text = (sel) => page.locator(sel).first().textContent();

check('renders greeting date', (await text('.topbar .date')) === 'Sabtu, 24 Oktober 2026');
check('headline shown', (await page.locator('.headline h1').count()) === 1);
check('clock card shows 17.10', (await text('.clock .big')) === '17.10');
check('calendar highlights 24', (await text('.calw .d.today')) === '24');

// deck keys react
await page.click('button[data-key="next"]'); await sleep(300);
check('deck next changes track', (await text('.nowpill .t')).startsWith('Falling Away'));
await page.click('button[data-key="prev"]'); await sleep(300);

// panels open and close
for (const [label, sel, name] of [['music', '.nowpill', '.panel.music'], ['clock', '.card[data-card="clock"]', '.panel.wc'], ['calendar', '.card[data-card="cal"]', '.panel.cal']]) {
  await page.click(sel); await sleep(900);
  check(`${label} panel opens`, (await page.locator(name).count()) === 1);
  await page.click(`${name} button[aria-label="Tutup"]`); await sleep(1100);
  check(`${label} panel closes`, (await page.locator(name).count()) === 0);
}

// world clock tab switch
await page.click('.card[data-card="clock"]'); await sleep(900);
await page.click('.wc .tabs button:nth-child(2)'); await sleep(600);
check('world clock switches to Colfax', (await text('.wc .ccard:nth-child(2) .top')).startsWith('Colfax'));
await page.click('.wc button[aria-label="Tutup"]'); await sleep(1100);

// modes
for (const [aria, key] of [['Mode kerja', 'work'], ['Santai', 'rest'], ['Istirahat', 'coffee'], ['Ringkasan', 'home']]) {
  await page.click(`button[aria-label="${aria}"]`); await sleep(1200);
  check(`mode ${key}`, (await page.locator('.grid').getAttribute('data-mode')) === key);
}

// sheets
for (const [aria, cls] of [['Semua aplikasi', '.panel.apps'], ['Notifikasi', '.panel.notifs'], ['Pengaturan', '.panel.settings'], ['Obrolan dengan Aino', '.panel.chat']]) {
  await page.click(`button[aria-label="${aria}"]`); await sleep(900);
  check(`${aria} opens`, (await page.locator(cls).count()) === 1);
  await page.click(`${cls} button[aria-label="Tutup"]`); await sleep(1100);
}

// chat: local intent works without a key
await page.click('button[aria-label="Obrolan dengan Aino"]'); await sleep(900);
await page.fill('.chatin', 'jam berapa sekarang?'); await page.press('.chatin', 'Enter'); await sleep(900);
check('chat answers the time offline', (await page.locator('.msg.aino').last().textContent()).includes('Sekarang pukul'));
await page.fill('.chatin', 'ceritakan sesuatu'); await page.press('.chatin', 'Enter'); await sleep(900);
check('chat asks for a Gemini key when missing', (await page.locator('.msg.aino').last().textContent()).includes('kunci Gemini'));
await page.fill('.chatin', 'mode kerja'); await page.press('.chatin', 'Enter'); await sleep(2200);
check('voice command switches mode', (await page.locator('.grid').getAttribute('data-mode')) === 'work');

// key is stored and never rendered back
await page.click('button[aria-label="Pengaturan"]'); await sleep(900);
await page.fill('.settings input[type="password"]', 'TEST-KEY-123'); await page.click('.settings .pill-dark'); await sleep(500);
check('key saved', (await page.evaluate(() => localStorage.getItem('aino.gemini_key'))) === 'TEST-KEY-123');
check('key field cleared after save', (await page.inputValue('.settings input[type="password"]')) === '');

// Gemini round trip with a stubbed endpoint (key from the previous step is in storage)
let seenKey = ''; let seenBody = null;
await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
  seenKey = route.request().headers()['x-goog-api-key']; seenBody = route.request().postDataJSON();
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Tentu, ini jawaban dari Gemini.' }] } }] }) });
});
await page.click('.settings button[aria-label="Tutup"]'); await sleep(1100);
await page.click('button[aria-label="Obrolan dengan Aino"]'); await sleep(900);
await page.fill('.chatin', 'ceritakan sesuatu yang lucu'); await page.press('.chatin', 'Enter'); await sleep(1200);
check('Gemini answer rendered', (await page.locator('.msg.aino').last().textContent()) === 'Tentu, ini jawaban dari Gemini.');
check('key sent as header, not in URL', seenKey === 'TEST-KEY-123');
check('system prompt carries context', JSON.stringify(seenBody?.systemInstruction ?? '').includes('Aino') && JSON.stringify(seenBody).includes('Sabtu, 24 Oktober 2026'));

check('no console or page errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
