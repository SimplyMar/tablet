import { h } from '../lib/h';
import { icon, filled, type IconName } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions, fmt } from '../lib/player';
import { EVENTS, WORK_DECK } from '../data/mock';
import { dayName, dayShort, hm, monthShort, monthName, now, WIB, zoned } from '../lib/time';
import type { Card } from './cards';

function card(name: string, cls: string, ...kids: (Node | null)[]) {
  return h('section', { class: `card ${cls}`, 'data-card': name }, h('div', { class: 'content' }, ...kids));
}

export function navCard(): Card {
  const el = card('nav', 'navc',
    h('button', { class: 'bigbtn', 'aria-label': 'Suara navigasi' }, icon('vol2', 22, 1.8)),
    h('div', { class: 'empty' }, icon('nav', 40, 1.6), h('b', {}, 'Belum ada navigasi.'), h('span', {}, 'Mulai navigasi Google Maps di HP.')));
  return { el };
}

export function wideClockCard(): Card {
  const big = h('div', { class: 'big' }); const date = h('div', { class: 'date' }); const syd = h('div', { class: 'syd' });
  const el = card('clock', 'wclock', h('div', { class: 'city' }, 'Jakarta'), h('div', { class: 'wx' }, icon('cloud', 18, 1.8), h('b', {}, '29°'), h('span', {}, 'Gerimis')), big, date, syd);
  const update = () => {
    const j = zoned(now(), WIB); const s = zoned(now(), 11);
    big.textContent = hm(j);
    date.textContent = `${dayName(j.dow)}, ${j.day} ${monthName(j.m)}`;
    syd.replaceChildren(icon('moon', 15, 2), h('span', {}, 'Sydney'), h('b', {}, hm(s)), h('em', {}, '+4 j'), h('i', { class: 'grow' }), h('span', {}, '21°'));
  };
  update();
  return { el, update };
}

export function weekCard(): Card {
  const range = h('div', { class: 'range' }); const days = h('div', { class: 'wdays' });
  const el = card('week', 'weekc', h('div', { class: 'label' }, 'Minggu ini'), range, days,
    h('div', { class: 'nextev' }, h('i'), h('span', {}, 'Sel 27 · Seharian · Send Aquaria Invoice')));
  const update = () => {
    const t = zoned(now(), WIB);
    const mondayOffset = (t.dow + 6) % 7;
    const base = Date.UTC(t.y, t.m, t.day - mondayOffset);
    const mon = new Date(base); const sun = new Date(base + 6 * 86400000);
    range.textContent = `${mon.getUTCDate()} – ${sun.getUTCDate()} ${monthShort(sun.getUTCMonth())}`;
    days.replaceChildren(...Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base + i * 86400000);
      const has = EVENTS.some((e) => e.day === d.getUTCDate()) && d.getUTCMonth() === t.m;
      return h('div', { class: `wd${d.getUTCDate() === t.day ? ' today' : ''}` }, h('small', {}, dayShort(d.getUTCDay())), h('span', {}, d.getUTCDate()), has ? h('i') : null);
    }));
  };
  update();
  return { el, update };
}

export function wideMusicCard(opts: { onOpen: () => void }): Card {
  const cover = h('div', { class: 'cv' }); const t = h('b'); const a = h('span');
  const fill = h('div', { class: 'fill' }); const cur = h('small'); const len = h('small');
  const play = h('button', { class: 'play', 'aria-label': 'Putar atau jeda', onClick: (e: Event) => { e.stopPropagation(); playerActions.toggle(); } });
  const mk = (n: 'prev' | 'next', fn: () => void) => h('button', { class: 'sk', 'aria-label': n === 'prev' ? 'Sebelumnya' : 'Berikutnya', onClick: (e: Event) => { e.stopPropagation(); fn(); } }, filled(n, 18));
  const el = card('wmusic', 'wmusic tappable',
    h('div', { class: 'top' }, cover, h('div', { class: 'meta' }, h('div', { class: 'src' }, h('i'), 'YouTube Music', icon('open', 12, 2)), t, a)),
    h('div', { class: 'bar' }, fill), h('div', { class: 'ctl' }, cur, mk('prev', () => playerActions.prev()), play, mk('next', () => playerActions.next()), len));
  el.addEventListener('click', opts.onOpen);
  let last = '';
  const update = () => {
    const s = player.get();
    if (s.track.title !== last) { last = s.track.title; t.textContent = s.track.title; a.textContent = s.track.artist; cover.style.backgroundImage = artUrl(s.track.art); }
    fill.style.width = `${(s.position / s.track.length) * 100}%`; cur.textContent = fmt(s.position); len.textContent = fmt(s.track.length);
    play.replaceChildren(filled(s.playing ? 'pause' : 'play', 20));
  };
  update(); player.on(update);
  return { el, update };
}

export function workDeckCard(): Card {
  const keys = WORK_DECK.map((k) => {
    const b = h('button', { class: `wkey tone-${k.tone}`, 'aria-label': k.label }, icon(k.icon as IconName, 20, 1.9), h('span', {}, k.label));
    b.addEventListener('click', () => { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 220); if (k.id === 'play') playerActions.toggle(); });
    return b;
  });
  const el = card('wdeck', 'wdeck', h('div', { class: 'label' }, 'Deck'), h('div', { class: 'warn' }, icon('warn', 15, 2)), h('div', { class: 'wkeys' }, ...keys));
  return { el };
}
