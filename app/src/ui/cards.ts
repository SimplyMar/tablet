import { h, svg } from '../lib/h';
import { icon, filled, type IconName } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions } from '../lib/player';
import { CITIES, DECK, EVENTS, TUMRA } from '../data/mock';
import { weather, kindIcon } from '../lib/weather';
import { deltaLabel } from '../lib/time';
import { breakTimer, mmss, BREAK_SECONDS } from '../lib/timer';
import { dayShort, hm, monthName, now, pad, homeOffset, zoned, dayName, monthShort } from '../lib/time';

export type Card = { el: HTMLElement; update?: () => void };

function card(name: string, cls: string, ...kids: (Node | null)[]) {
  return h('section', { class: `card ${cls}`, 'data-card': name }, h('div', { class: 'content' }, ...kids));
}

const ytm = () => svg(`<svg class="ic" width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="11.5" fill="#fff" stroke="#e6234c" stroke-width="2.2"/><circle cx="13" cy="13" r="8.6" fill="none" stroke="#e6234c" stroke-width="1.6"/><path d="M10.6 8.9v8.2l6.6-4.1z" fill="#e6234c"/></svg>`);
const yt = () => svg(`<svg class="ic" width="28" height="28" viewBox="0 0 28 28"><rect x="2" y="6" width="24" height="16.5" rx="5" fill="#e6234c"/><path d="M11.4 10.6v7.3l6.3-3.65z" fill="#fff"/></svg>`);

export function clockCard(opts: { onOpen: () => void }): Card {
  const big = h('div', { class: 'big' });
  const sub = h('div', { class: 'sub' });
  const zones = h('div', { class: 'zones' });
  const city = h('div', { class: 'city' }); const wxIcon = h('div', { class: 'wxi' }); const temp = h('b'); const range = h('span');
  const el = card('clock', 'clock tappable', city, big, sub, h('div', { class: 'wx' }, wxIcon, temp, range), zones);
  el.addEventListener('click', opts.onOpen);
  const update = () => {
    const d = now();
    const j = zoned(d, homeOffset());
    big.textContent = hm(j);
    sub.textContent = `${dayShort(j.dow)}, ${j.day} ${monthShort(j.m)}`;
    zones.replaceChildren(...CITIES.slice(1).map((c) => {
      const z = zoned(d, c.offset);
      const night = z.hh < 6 || z.hh >= 18;
      return h('div', { class: `zone${night ? '' : ' day'}` }, icon(night ? 'moon' : 'sun', 15, 2), h('small', {}, `${c.name} · ${deltaLabel(c.offset, 'j')}`), h('b', {}, hm(z)));
    }));
    const w = weather.get();
    city.textContent = w.city; temp.textContent = `${w.temp}°`; range.textContent = `${w.hi}° / ${w.lo}°`;
    wxIcon.replaceChildren(icon(kindIcon(w.kind), 28, 1.7));
  };
  update(); weather.on(update);
  return { el, update };
}

export function musicRingCard(opts: { onOpen: () => void }): Card {
  const R = 69, C = 2 * Math.PI * R;
  const ring = svg(`<svg class="ring" viewBox="0 0 146 146"><circle cx="73" cy="73" r="${R}" fill="none" stroke="rgba(60,70,80,.12)" stroke-width="4"/><circle class="prog" cx="73" cy="73" r="${R}" fill="none" stroke="#14181c" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>`);
  const art = h('div', { class: 'art spin' });
  const pp = h('div', { class: 'pp' });
  const open = h('button', { class: 'mini l', 'aria-label': 'Buka YouTube Music', onClick: (e: Event) => { e.stopPropagation(); } }, icon('open', 16, 2));
  const next = h('button', { class: 'mini r', 'aria-label': 'Lagu berikutnya', onClick: (e: Event) => { e.stopPropagation(); playerActions.next(); } }, filled('next', 15));
  const el = card('music', 'mring tappable', h('div', { class: 'stage' }, ring, art, pp), open, next);
  el.addEventListener('click', opts.onOpen);
  const prog = ring.querySelector('.prog') as SVGCircleElement;
  let lastArt = '';
  const update = () => {
    const s = player.get();
    if (s.track.art !== lastArt) { art.style.backgroundImage = artUrl(s.track.art); lastArt = s.track.art; }
    art.classList.toggle('paused', !s.playing);
    pp.replaceChildren(s.playing ? filled('pause', 22) : filled('play', 22));
    prog.style.strokeDashoffset = String(C * (1 - s.position / s.track.length));
  };
  update();
  player.on(update);
  return { el, update };
}

export function timerCard(opts: { onStart: () => void }): Card {
  const big = h('div', { class: 'big' }, '05:00');
  const sub = h('div', { class: 'sub' }, '0 hari ini');
  const btn = h('button', { class: 'pill-btn', onClick: opts.onStart }, 'Mulai');
  const el = card('timer', 'timer', h('div', { class: 'label' }, 'Istirahat'), big, sub, btn);
  const update = () => {
    const s = breakTimer.get();
    big.textContent = mmss(s.remaining); sub.textContent = `${s.done} hari ini`;
    btn.textContent = s.running ? 'Jeda' : s.remaining < BREAK_SECONDS ? 'Lanjut' : 'Mulai';
  };
  update(); breakTimer.on(update);
  return { el, update };
}

export function calendarCard(opts: { onOpen: () => void }): Card {
  const wk = h('div', { class: 'wk' }, ...['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => h('span', {}, d)));
  const days = h('div', { class: 'days' });
  const title = h('div', { class: 'title' }, 'Kalender');
  const month = h('div', { class: 'month' });
  const agenda = h('div', { class: 'agenda' });
  const el = card('cal', 'calw tappable', title, month, wk, days, agenda);
  el.addEventListener('click', opts.onOpen);
  const update = () => {
    const t = zoned(now(), homeOffset());
    month.textContent = `${monthName(t.m)} ${t.y}`;
    const first = new Date(Date.UTC(t.y, t.m, 1)).getUTCDay();
    const lead = (first + 6) % 7;
    const dim = new Date(Date.UTC(t.y, t.m + 1, 0)).getUTCDate();
    const cells: HTMLElement[] = [];
    for (let i = 0; i < lead; i++) cells.push(h('div', { class: 'd out' }));
    for (let d = 1; d <= dim; d++) {
      const has = EVENTS.some((e) => e.day === d);
      cells.push(h('div', { class: `d${has ? ' has' : ''}${d === t.day ? ' today' : ''}` }, h('span', {}, d)));
    }
    days.replaceChildren(...cells);
    const todays = EVENTS.filter((e) => e.day === t.day);
    agenda.replaceChildren(h('div', { class: 'h' }, 'Hari ini'),
      h('div', { class: 'e' }, todays.length ? todays.map((e) => `${e.time} ${e.title}`).join(' · ') : 'Tidak ada acara'));
  };
  update();
  return { el, update };
}

function deckIcon(name: string): SVGElement {
  if (name === 'ytm') return ytm();
  if (name === 'yt') return yt();
  if (name === 'play' || name === 'prev' || name === 'next') return filled(name as 'play', 26);
  return icon(name as IconName, 26, 2.3);
}

export function deckCard(): Card {
  const keys = DECK.map((k, i) => {
    const b = h('button', { class: `key${k.id === 'play' ? ' focus' : ''}`, 'aria-label': k.label, 'data-key': k.id }, deckIcon(k.icon));
    b.addEventListener('click', () => press(k.id, b));
    return b;
  });
  const el = card('deck', 'deck', h('div', { class: 'label' }, 'Deck'), h('div', { class: 'warn' }, icon('warn', 16, 2)), h('div', { class: 'keys' }, ...keys));
  function press(id: string, b: HTMLElement) {
    b.classList.add('hit');
    setTimeout(() => b.classList.remove('hit'), 220);
    if (id === 'play') playerActions.toggle();
    else if (id === 'next') playerActions.next();
    else if (id === 'prev') playerActions.prev();
    else if (id === 'vup') playerActions.volume(player.get().volume + 0.08);
    else if (id === 'vdown') playerActions.volume(player.get().volume - 0.08);
  }
  return { el };
}

export function tumraCard(): Card {
  const el = card('tumra', 'tumra tappable',
    h('div', { class: 'label' }, 'Tumra · minggu ini'), h('div', { class: 'big' }, TUMRA.hours), h('div', { class: 'sub' }, TUMRA.note),
    h('div', { class: 'go' }, h('span', {}, TUMRA.invoice), icon('arrowRight', 20, 2)));
  return { el };
}

export { dayName, pad };
