import { h, svg } from '../lib/h';
import { icon, filled } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions, fmt } from '../lib/player';
import { breakTimer, timerActions, mmss, BREAK_SECONDS } from '../lib/timer';
import { CITIES, WEATHER } from '../data/mock';
import { dayName, hm, monthName, now, WIB, zoned } from '../lib/time';
import type { Card } from './cards';

function card(name: string, cls: string, ...kids: (Node | null)[]) {
  return h('section', { class: `card ${cls}`, 'data-card': name }, h('div', { class: 'content' }, ...kids));
}

/* rest: a calm ambient screen, huge clock plus weather and what is playing */
export function restCards(): Card[] {
  const t = h('div', { class: 't' }); const d = h('div', { class: 'd' }); const z = h('div', { class: 'z' });
  const big = card('bigclock', 'bigclock', t, d, z);
  const update = () => {
    const n = now(); const j = zoned(n, WIB);
    t.textContent = hm(j); d.textContent = `${dayName(j.dow)}, ${j.day} ${monthName(j.m)} ${j.y}`;
    z.replaceChildren(...CITIES.slice(1).map((c) => h('span', {}, c.name, h('b', {}, hm(zoned(n, c.offset))))));
  };
  update();
  const wx = card('wx', 'wxcard', h('div', { class: 't' }, `${WEATHER.temp}°`), h('div', { class: 'c' }, WEATHER.text), h('div', { class: 'w' }, `${WEATHER.city} · terasa ${WEATHER.feels}° · ${WEATHER.hi}° / ${WEATHER.lo}°`), icon('drizzle', 44, 1.5));
  const cv = h('div', { class: 'cv' }); const tt = h('b'); const aa = h('span'); const fill = h('div', { class: 'fill' }); const cur = h('small'); const len = h('small');
  const play = h('button', { class: 'play', 'aria-label': 'Putar atau jeda', onClick: () => playerActions.toggle() });
  const mk = (n: 'prev' | 'next', fn: () => void) => h('button', { class: 'sk', 'aria-label': n === 'prev' ? 'Sebelumnya' : 'Berikutnya', onClick: fn }, filled(n, 18));
  const rm = card('rmusic', 'wmusic', h('div', { class: 'top' }, cv, h('div', { class: 'meta' }, h('div', { class: 'src' }, h('i'), 'YouTube Music'), tt, aa)),
    h('div', { class: 'bar' }, fill), h('div', { class: 'ctl' }, cur, mk('prev', () => playerActions.prev()), play, mk('next', () => playerActions.next()), len));
  let last = '';
  const upm = () => {
    const s = player.get();
    if (s.track.title !== last) { last = s.track.title; tt.textContent = s.track.title; aa.textContent = s.track.artist; cv.style.backgroundImage = artUrl(s.track.art); }
    fill.style.width = `${(s.position / s.track.length) * 100}%`; cur.textContent = fmt(s.position); len.textContent = fmt(s.track.length);
    play.replaceChildren(filled(s.playing ? 'pause' : 'play', 20));
  };
  upm(); player.on(upm);
  return [{ el: big, update }, { el: wx }, { el: rm, update: upm }];
}

/* coffee: break timer, big ring and a few ways to rest */
export function coffeeCards(): Card[] {
  const R = 155, C = 2 * Math.PI * R;
  const ring = svg(`<svg viewBox="0 0 330 330"><circle cx="165" cy="165" r="${R}" fill="none" stroke="rgba(60,70,80,.12)" stroke-width="10"/><circle class="p" cx="165" cy="165" r="${R}" fill="none" stroke="#2c7a6b" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>`);
  const p = ring.querySelector('.p') as SVGCircleElement;
  const time = h('b'); const sub = h('span');
  const toggle = h('button', { class: 'pill-btn', onClick: () => (breakTimer.get().running ? timerActions.pause() : timerActions.start()) });
  const reset = h('button', { class: 'pill-ghost', onClick: () => timerActions.reset() }, 'Ulang');
  const el = card('ring', 'ringcard', h('div', { class: 'rwrap' }, ring, h('div', { class: 'time' }, time, sub)), h('div', { class: 'ctl' }, reset, toggle));
  const update = () => {
    const s = breakTimer.get();
    time.textContent = mmss(s.remaining); sub.textContent = s.running ? 'Istirahat berjalan' : `${s.done} istirahat hari ini`;
    toggle.textContent = s.running ? 'Jeda' : s.remaining < BREAK_SECONDS ? 'Lanjut' : 'Mulai';
    p.style.strokeDashoffset = String(C * (1 - s.remaining / BREAK_SECONDS));
  };
  update(); breakTimer.on(update);
  const tip = (i: 'eye' | 'volx' | 'coffee' | 'sun', t: string) => h('li', {}, icon(i, 26, 1.7), t);
  const tips = card('tips', 'tipscard', h('div', { class: 'h' }, 'Selagi istirahat'),
    h('ul', {}, tip('eye', 'Lihat sesuatu yang jauh selama dua puluh detik'), tip('coffee', 'Minum air atau seduh kopi'), tip('sun', 'Berdiri dan regangkan bahu'), tip('volx', 'Notifikasi tidak penting kutahan dulu')),
    h('div', { class: 'foot' }, 'Aino akan memberi tahu saat waktunya kembali.'));
  return [{ el, update }, { el: tips }];
}
