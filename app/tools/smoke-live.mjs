// Live-weather path: GPS -> reverse geocode -> Open-Meteo, all stubbed. Run without ?demo.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BASE_URL || 'http://localhost:4173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const forecast = (code, temp) => ({
  utc_offset_seconds: 28800,
  current: { time: '2026-10-26T14:00', temperature_2m: temp, apparent_temperature: temp + 3, weather_code: code, is_day: 1 },
  hourly: { time: ['2026-10-26T14:00', '2026-10-26T15:00', '2026-10-26T16:00', '2026-10-26T17:00', '2026-10-26T18:00', '2026-10-26T19:00'], temperature_2m: [30, 29, 28, 27, 26, 25], weather_code: [code, 61, 61, 3, 3, 0], is_day: [1, 1, 1, 0, 0, 0] },
  daily: { temperature_2m_max: [31], temperature_2m_min: [24] },
});

async function run(name, setup) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1152, height: 718 }, geolocation: { latitude: -6.9175, longitude: 107.6191 }, permissions: setup.deny ? [] : ['geolocation'] });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://api.open-meteo.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(forecast(setup.code, setup.temp)) }));
  await page.route('https://api.bigdatacloud.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ city: 'Bandung' }) }));
  await page.route('https://geocoding-api.open-meteo.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ name: 'Surabaya', admin1: 'Jawa Timur', country: 'Indonesia', latitude: -7.25, longitude: 112.75 }] }) }));
  await page.goto(base); await page.waitForSelector('#viewport[data-ready]'); await sleep(1800);
  await setup.run(page, check);
  check(`${name}: no page errors`, errors.length === 0, errors.join(' | '));
  await browser.close();
}

await run('rain', { code: 63, temp: 27, run: async (page) => {
  const t = (s) => page.locator(s).first().textContent();
  check('weather block shows the GPS city', (await t('.weather .where')).startsWith('Bandung'));
  check('temperature from the forecast', (await t('.weather .temp')) === '27°');
  check('condition decoded to Indonesian', (await t('.weather .cond')) === 'Hujan');
  check('rain animation visible when wet', (await page.evaluate(() => getComputedStyle(document.querySelector('.rain')).opacity)) === '1');
  check('clock card uses the city and range', (await t('.clock .city')) === 'Bandung' && (await t('.clock .wx span')) === '31° / 24°');
  check('home time zone follows the location (UTC+8)', (await t('.clock .big')) === (() => { const d = new Date(Date.now() + 8 * 3600e3); return `${String(d.getUTCHours()).padStart(2, '0')}.${String(d.getUTCMinutes()).padStart(2, '0')}`; })());
  await page.click('button[aria-label="Pengaturan"]'); await sleep(900);
  check('settings shows location status', (await t('.settings .status')).includes('Bandung'));
  await page.fill('.settings input[placeholder^="Cari kota"]', 'Surabaya'); await page.press('.settings input[placeholder^="Cari kota"]', 'Enter'); await sleep(700);
  await page.click('.settings .hit'); await sleep(1500);
  check('manual city overrides GPS', (await t('.settings .status')).includes('Surabaya'));
} });

await run('clear sky', { code: 0, temp: 33, run: async (page) => {
  check('rain hidden when dry', (await page.evaluate(() => getComputedStyle(document.querySelector('.rain')).opacity)) === '0');
  check('clear sky label', (await page.locator('.weather .cond').textContent()) === 'Cerah');
} });

await run('location denied', { code: 3, temp: 20, deny: true, run: async (page) => {
  const where = await page.locator('.weather .where').textContent();
  check('denied location is reported, not hidden', where.includes('Izin lokasi ditolak'), where);
} });

console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
