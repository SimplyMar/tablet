import { h, svg } from '../lib/h';
import { icon, filled } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions } from '../lib/player';
import { WEATHER } from '../data/mock';
import { dayName, monthName, now, WIB, zoned } from '../lib/time';

export type Mode = 'home' | 'work' | 'rest' | 'coffee';
const MODES: { id: Mode; icon: 'grid' | 'briefcase' | 'home' | 'coffee'; label: string }[] = [
  { id: 'home', icon: 'grid', label: 'Ringkasan' }, { id: 'work', icon: 'briefcase', label: 'Mode kerja' },
  { id: 'rest', icon: 'home', label: 'Santai' }, { id: 'coffee', icon: 'coffee', label: 'Istirahat' },
];

export function createTopbar(opts: { onMode: (m: Mode) => void; onAction: (a: 'apps' | 'bell' | 'more' | 'settings' | 'volume') => void }) {
  const date = h('div', { class: 'date' });
  const thumb = h('i', { class: 'thumb' });
  const buttons = MODES.map((m) => h('button', { 'aria-label': m.label, 'aria-pressed': String(m.id === 'home'), onClick: () => opts.onMode(m.id) }, icon(m.icon, 22, 1.6)));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Mode' }, thumb, ...buttons);
  const act = (name: 'apps' | 'bell' | 'more' | 'settings', i: Parameters<typeof icon>[0], label: string, badge = false) =>
    h('button', { class: 'round', 'aria-label': label, onClick: () => opts.onAction(name) }, icon(i, 22, 1.6), badge ? h('i', { class: 'badge' }) : null);
  const bar = h('header', { class: 'topbar' },
    date,
    h('button', { class: 'vol', 'aria-label': 'Volume', onClick: () => opts.onAction('volume') }, icon('vol2', 20, 1.8)),
    seg, h('i', { class: 'divider' }),
    act('apps', 'dots', 'Semua aplikasi'), act('bell', 'bell', 'Notifikasi'), act('more', 'more', 'Lainnya'), act('settings', 'sliders', 'Pengaturan'),
    h('button', { class: 'avatar', 'aria-label': 'Profil' }, 'I'));
  // geometry: first button center sits 1px inside; each step is 50px wide
  const place = (i: number) => { thumb.style.transform = `translateX(${i * 50}px)`; };
  place(0);
  const refresh = () => {
    const j = zoned(now(), WIB);
    date.textContent = `${dayName(j.dow)}, ${j.day} ${monthName(j.m)} ${j.y}`;
  };
  refresh();
  return {
    el: bar,
    setMode(m: Mode) { const i = MODES.findIndex((x) => x.id === m); place(i); buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); },
    refresh,
  };
}

export function createWeather() {
  const cloud = (cls: string, style: string) => svg(`<svg class="cloud ${cls}" style="${style}" viewBox="0 0 200 90"><path d="M44 80c-19 0-34-12-34-28 0-14 11-25 27-27 5-14 20-24 38-24 20 0 36 11 41 27 22 0 38 11 38 25 0 15-14 27-34 27z"/></svg>`);
  const rain = h('div', { class: 'rain' }, ...Array.from({ length: 16 }, (_, i) => h('i', { style: `left:${10 + i * 19}px;animation-delay:${(i * 137) % 1100}ms;animation-duration:${900 + (i % 5) * 120}ms;top:${(i % 4) * 4}px` })));
  const el = h('section', { class: 'weather', 'aria-label': 'Cuaca' },
    h('div', { class: 'clouds' }, cloud('c1', 'position:absolute;right:256px;top:-6px;width:96px;height:43px'), cloud('c2', 'position:absolute;right:126px;top:26px;width:152px;height:68px')),
    rain,
    h('div', { class: 'temp' }, `${WEATHER.temp}°`), h('div', { class: 'cond' }, WEATHER.text),
    h('div', { class: 'where' }, `${WEATHER.city} · terasa ${WEATHER.feels}° · ${WEATHER.text.toLowerCase()} ${WEATHER.at}`));
  return { el };
}

export function createNowPill(opts: { onOpen: () => void }) {
  const cover = h('div', { class: 'cover' });
  const t = h('div', { class: 't' }); const a = h('div', { class: 'a' });
  const pp = h('button', { class: 'pp', 'aria-label': 'Putar atau jeda', onClick: (e: Event) => { e.stopPropagation(); playerActions.toggle(); } });
  const el = h('div', { class: 'nowpill', role: 'button', tabindex: '0', onClick: opts.onOpen }, cover, h('div', { class: 'txt' }, t, a), pp);
  let lastTitle = '';
  const update = () => {
    const s = player.get();
    if (s.track.title !== lastTitle) {
      lastTitle = s.track.title;
      t.textContent = s.track.title; a.textContent = `${s.track.artist} · YouTube Music`;
      cover.style.backgroundImage = artUrl(s.track.art);
      el.animate([{ opacity: 0.2, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.16,1,0.3,1)' });
    }
    pp.replaceChildren(filled(s.playing ? 'pause' : 'play', 16));
  };
  update();
  player.on(update);
  return { el, update };
}

export function createFab(opts: { onClick: () => void }) {
  return h('button', { class: 'fab', 'aria-label': 'Obrolan dengan Aino', onClick: opts.onClick }, icon('chat', 26, 1.9));
}
