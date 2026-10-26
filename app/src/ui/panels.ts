import { h, sleep } from '../lib/h';
import { icon, filled } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions, fmt, type LightMode } from '../lib/player';
import { CITIES, EVENTS, QUEUE } from '../data/mock';
import { dayName, hm, monthName, now, homeOffset, zoned, zoneLabel, deltaLabel, DEMO } from '../lib/time';
import { weather, fetchForecast, kindIcon, type Hour, type Kind } from '../lib/weather';
import { EASE_OUT, EASE_IN, EASE_IO } from '../lib/motion';

export type PanelName = 'music' | 'clock' | 'calendar';
export type Panel = { el: HTMLElement; mini: HTMLElement; destroy?: () => void };

/** Small Aino face with a speech bubble, shared by every overlay. */
function mini(text: string, action?: { label: string; onClick: () => void }) {
  const robot = h('div', { class: 'robot', 'data-state': 'idle' }, h('i', { class: 'eye l' }), h('i', { class: 'eye r' }));
  const bubble = h('div', { class: `bubble${action ? '' : ' tight'}` }, text, action ? h('button', { class: 'pill-dark', onClick: action.onClick }, action.label) : null);
  const el = h('div', { class: 'amini' }, robot, bubble);
  const t = window.setTimeout(() => { robot.classList.add('blink'); setTimeout(() => robot.classList.remove('blink'), 110); }, 900);
  el.addEventListener('remove', () => clearTimeout(t));
  return el;
}

const closeBtn = (onClose: () => void) => h('button', { class: 'cbtn', 'aria-label': 'Tutup', onClick: onClose }, icon('close', 22, 1.8));
const tuneBtn = () => h('button', { class: 'cbtn', 'aria-label': 'Atur' }, icon('sliders', 22, 1.8));

/* ------------------------------------------------------------------ music */
export function musicPanel(onClose: () => void): Panel {
  const cover = h('div', { class: 'cover' });
  const ttl = h('div', { class: 'ttl' }); const artist = h('div', { class: 'art-name' });
  const fill = h('div', { class: 'fill' }); const track = h('div', { class: 'track' }, fill);
  const cur = h('span'); const len = h('span');
  const mkDim = (name: 'shuffle' | 'repeat', fn: () => void) => h('button', { class: 'dim', 'aria-label': name === 'shuffle' ? 'Acak' : 'Ulangi', onClick: fn }, icon(name, 24, 1.8));
  const shuffle = mkDim('shuffle', playerActions.toggleShuffle.bind(playerActions));
  const repeat = mkDim('repeat', playerActions.toggleRepeat.bind(playerActions));
  const play = h('button', { class: 'play', 'aria-label': 'Putar atau jeda', onClick: () => playerActions.toggle() });
  const transport = h('div', { class: 'transport' }, shuffle,
    h('button', { 'aria-label': 'Sebelumnya', onClick: () => playerActions.prev() }, filled('prev', 26)), play,
    h('button', { 'aria-label': 'Berikutnya', onClick: () => playerActions.next() }, filled('next', 26)), repeat);
  const vfill = h('div', { class: 'fill' }); const vtrack = h('div', { class: 'track' }, vfill);
  const queue = h('div', { class: 'queue' });

  const lights: { id: LightMode; label: string }[] = [{ id: 'full', label: 'Penuh' }, { id: 'soft', label: 'Lembut' }, { id: 'off', label: 'Mati' }];
  const lpill = h('i', { class: 'pill' });
  const lbtns = lights.map((l) => h('button', { 'aria-pressed': 'false', onClick: () => playerActions.setLight(l.id) }, l.label));
  const lseg = h('div', { class: 'seg2' }, lpill, ...lbtns);

  const scrub = (el: HTMLElement, onVal: (f: number) => void) => {
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); onVal(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); fill.style.transition = 'none'; move(e); const mv = (ev: PointerEvent) => move(ev); el.addEventListener('pointermove', mv); el.addEventListener('pointerup', () => { el.removeEventListener('pointermove', mv); fill.style.transition = ''; }, { once: true }); });
  };
  scrub(track, (f) => playerActions.seek(f));
  scrub(vtrack, (f) => playerActions.volume(f));

  let lastTitle = '';
  const update = () => {
    const s = player.get();
    if (s.track.title !== lastTitle) {
      lastTitle = s.track.title;
      ttl.textContent = s.track.title; artist.textContent = s.track.artist;
      cover.style.backgroundImage = artUrl(s.track.art);
      cover.animate([{ opacity: 0.2, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: EASE_OUT });
      queue.replaceChildren(...QUEUE.filter((_, i) => i !== s.index).map((t) => h('div', { class: 'qrow' }, h('i', { class: 'thumb', style: `background-image:${artUrl(t.art)}` }), h('div', {}, h('b', {}, t.title), h('span', {}, t.artist)))));
    }
    fill.style.width = `${(s.position / s.track.length) * 100}%`;
    cur.textContent = fmt(s.position); len.textContent = fmt(s.track.length);
    play.replaceChildren(filled(s.playing ? 'pause' : 'play', 30));
    vfill.style.width = `${s.volume * 100}%`;
    shuffle.classList.toggle('on', s.shuffle); repeat.classList.toggle('on', s.repeat);
    lbtns.forEach((b, i) => b.setAttribute('aria-pressed', String(lights[i].id === s.light)));
    const act = lbtns[lights.findIndex((l) => l.id === s.light)];
    if (act) { lpill.style.width = `${act.offsetWidth}px`; lpill.style.transform = `translateX(${act.offsetLeft - 4}px)`; }
  };
  const off = player.on(update);
  const el = h('section', { class: 'panel music', 'aria-label': 'Musik' },
    h('div', { class: 'label-top' }, 'Musik'),
    h('div', { class: 'bar' }, h('i', { class: 'grow' }), tuneBtn(), closeBtn(onClose)),
    cover, h('div', { class: 'ytlink' }, h('i'), 'Buka YouTube Music', icon('open', 15, 1.8)),
    h('div', { class: 'main' }, ttl, artist, track, h('div', { class: 'times' }, cur, len), transport,
      h('div', { class: 'volrow' }, icon('vol0', 20, 1.8), vtrack, icon('vol2', 20, 1.8)),
      h('div', { class: 'lightrow' }, h('span', {}, 'Cahaya ikut musik'), lseg),
      h('div', { class: 'queue-h' }, 'Berikutnya di antrean'), queue));
  const m = mini('Kembali ke beranda. Ini ringkasan hari ini.');
  el.append(m);
  requestAnimationFrame(update);
  return { el, mini: m, destroy: off };
}

/* ------------------------------------------------------------ world clock */
type Fc = Awaited<ReturnType<typeof fetchForecast>>;
const COORDS: Record<string, [number, number]> = { syd: [-33.8688, 151.2093] };
const remote = new Map<string, { at: number; fc: Fc }>();

const daypart = (hh: number) => (hh < 4 ? 'Malam' : hh < 11 ? 'Pagi' : hh < 15 ? 'Siang' : hh < 18 ? 'Sore' : 'Malam');
const nightAt = (hh: number) => hh < 6 || hh >= 18;

const hourly = (items: Hour[]) =>
  h('div', { class: 'hours' }, ...items.map((i) => h('div', {}, h('span', {}, i.h), h('i', { class: i.kind === 'moon' || i.kind === 'partlyNight' ? 'moon' : '' }, icon(kindIcon(i.kind), 16, 1.8)), h('b', {}, `${i.t}°`))));

export function clockPanel(onClose: () => void): Panel {
  const d = now();
  let active = 'syd';
  const left = h('div', { class: 'ccard' });
  const right = h('div', { class: 'ccard' });
  const overlapCard = h('div', { class: 'overlap' });
  let cardMessage = '';

  const cityData = (id: string) => {
    const c = CITIES.find((x) => x.id === id)!;
    const live = remote.get(id)?.fc;
    const offset = live ? live.offset : c.offset;
    const hours: Hour[] = live ? live.hourly : c.hourly.map((x) => ({ h: x.h, t: x.t, kind: (c.night ? 'moon' : 'cloud') as Kind, text: '' }));
    const z = zoned(d, offset);
    const night = nightAt(z.hh);
    return { name: c.name, offset, z, hours, temp: live ? live.temp : c.temp, hi: live ? live.hi : c.hi, lo: live ? live.lo : c.lo, text: live ? live.text : c.text, kind: (live ? live.kind : night ? 'moon' : 'cloud') as Kind, night, sample: !live };
  };

  const card = (el: HTMLElement, who: { name: string; z: ReturnType<typeof zoned>; hours: Hour[]; temp: number; hi: number; lo: number; text: string; kind: Kind; night: boolean }, chip: HTMLElement) => {
    el.replaceChildren(
      h('div', { class: 'top' }, who.name, chip),
      h('div', { class: 'daypart' }, icon(who.night ? 'moon' : 'sun', 17, 1.8), daypart(who.z.hh)),
      h('div', { class: 'big' }, hm(who.z)),
      h('div', { class: 'date' }, `${dayName(who.z.dow)}, ${who.z.day} ${monthName(who.z.m)}`),
      h('div', { class: 'wx' }, h('i', { class: who.kind === 'moon' || who.kind === 'partlyNight' ? 'moon' : '' }, icon(kindIcon(who.kind), 38, 1.6)), `${who.temp}°`),
      h('div', { class: 'wxs' }, `${who.text} · ${who.hi}° / ${who.lo}°`), h('hr'), hourly(who.hours));
  };

  const buildHome = () => {
    const w = weather.get(); const z = zoned(d, homeOffset());
    card(left, { name: w.city, z, hours: w.hourly, temp: w.temp, hi: w.hi, lo: w.lo, text: w.text, kind: w.kind, night: nightAt(z.hh) }, h('span', { class: 'chip' }, 'Kamu di sini'));
  };
  const buildRight = () => {
    const c = cityData(active);
    card(right, c, h('span', { class: 'chip blue' }, `${deltaLabel(c.offset)}${deltaLabel(c.offset) === 'Sama' ? '' : ''}`));
    overlapCard.replaceChildren(timeline(c.name, c.offset));
  };

  function segs(startH: number, lenH: number, bg: string) {
    const out: HTMLElement[] = []; const s0 = ((startH % 24) + 24) % 24; const e0 = s0 + lenH;
    const mk = (a: number, b: number) => h('i', { class: 'tseg', style: `left:${(a / 24) * 100}%;width:${((b - a) / 24) * 100}%;background:${bg}` });
    if (e0 <= 24) out.push(mk(s0, e0)); else { out.push(mk(s0, 24)); out.push(mk(0, e0 - 24)); }
    return out;
  }

  function timeline(name: string, offset: number) {
    const H = homeOffset(); const diff = offset - H; const hz = zoneLabel();
    const homeStart = 9; const otherStart = ((9 - diff) % 24 + 24) % 24;     // other city's 09.00 expressed in home time
    const lo = Math.max(homeStart, otherStart); const hi = Math.min(17, otherStart + 8);
    const overlap = hi > lo ? [lo, hi] : null;
    const j = zoned(d, H); const nowAt = j.hh + j.mm / 60;
    const fmtH = (x: number) => hm({ hh: Math.floor(x) % 24, mm: Math.round((x % 1) * 60) });
    const label = overlap ? `${fmtH(overlap[0])}–${fmtH(overlap[1])} ${hz} (${fmtH(overlap[0] + diff + 24)}–${fmtH(overlap[1] + diff + 24)} di ${name})` : '';
    const dd = Math.abs(diff);
    cardMessage = diff === 0 ? `${name} satu zona waktu denganmu.`
      : `${name} ${dd} jam lebih ${diff > 0 ? 'cepat' : 'lambat'}. ${overlap ? `Jam kerja kalian bertemu ${label}.` : 'Jam kerja kalian tidak bertemu hari ini.'}`;
    const row = (top: number, lbl: string, bold: boolean, ...sg: HTMLElement[]) => h('div', { class: `row${bold ? ' bold' : ''}`, style: `top:${top}px` }, h('label', {}, lbl), h('div', { class: 'lane' }, ...sg));
    return h('div', {}, h('h3', {}, 'Jam kerja bersama', h('span', {}, `jam kerja 09.00–17.00 di masing-masing kota, ditampilkan dalam ${hz}`)),
      h('div', { class: 'tl' },
        row(0, weather.get().city, false, ...segs(homeStart, 8, '#a8a9ac')), row(36, name, false, ...segs(otherStart, 8, '#8ea8e0')),
        row(72, 'Bersama', true, ...(overlap ? segs(overlap[0], overlap[1] - overlap[0], '#1f7f6a') : [])),
        h('i', { class: 'now', style: `left:calc(104px + (100% - 104px) * ${nowAt / 24})` }),
        h('div', { class: 'axis' }, ...[0, 6, 12, 18, 24].map((n) => h('span', { style: `left:${(n / 24) * 100}%` }, String(n))))));
  }

  const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...['syd', 'cfx'].map((id) => h('button', { role: 'tab', 'aria-selected': String(id === active), onClick: (e: Event) => {
    active = id; [...tabs.children].forEach((bt) => bt.setAttribute('aria-selected', String(bt === e.currentTarget)));
    right.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px)' }], { duration: 120, easing: EASE_IN }).finished.then(() => { buildRight(); right.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT }); refreshMini(); });
  } }, CITIES.find((c) => c.id === id)!.name)));

  buildHome(); buildRight();
  let miniEl: HTMLElement = mini(cardMessage, { label: 'Jadwalkan meeting', onClick: () => undefined });
  function refreshMini() { const n = mini(cardMessage, { label: 'Jadwalkan meeting', onClick: () => undefined }); miniEl.replaceWith(n); miniEl = n; }

  // live Sydney: fetched once per 20 minutes, panel redraws when it lands
  const stop: (() => void)[] = [];
  for (const [id, [lat, lon]] of Object.entries(COORDS)) {
    const hit = remote.get(id);
    if (!DEMO && (!hit || Date.now() - hit.at > 20 * 60_000)) fetchForecast(lat, lon).then((fc) => { remote.set(id, { at: Date.now(), fc }); if (active === id) buildRight(); }).catch(() => undefined);
  }
  stop.push(weather.on(() => buildHome()));

  const el = h('section', { class: 'panel wc', 'aria-label': 'Jam dunia' },
    h('div', { class: 'bar' }, h('h2', {}, 'Jam dunia'), tabs, h('i', { class: 'grow' }), tuneBtn(), closeBtn(onClose)),
    h('div', { class: 'cities' }, left, right), overlapCard, miniEl);
  return { el, mini: miniEl, destroy: () => stop.forEach((f) => f()) };
}

/* --------------------------------------------------------------- calendar */
export function calendarPanel(onClose: () => void): Panel {
  const t = zoned(now(), homeOffset());
  let view = { y: t.y, m: t.m };
  let selected = t.day; let sel: { y: number; m: number } = { y: t.y, m: t.m };
  const title = h('h2'); const wkh = h('div', { class: 'wkh' }, ...['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((x) => h('span', {}, x)));
  const grid = h('div', { class: 'mgrid' });
  const agenda = h('aside', { class: 'agendap' });
  const mode = h('div', { class: 'tabs', role: 'tablist' }, ...['Bulan', 'Minggu', 'Hari'].map((x, i) => h('button', { role: 'tab', 'aria-selected': String(i === 0) }, x)));

  const render = () => {
    title.textContent = `${monthName(view.m)} ${view.y}`;
    const first = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
    const dim = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const prevDim = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
    const cells: HTMLElement[] = [];
    for (let i = 0; i < 35; i++) {
      const n = i - first + 1; const out = n < 1 || n > dim;
      const day = n < 1 ? prevDim + n : n > dim ? n - dim : n;
      const evs = out ? [] : EVENTS.filter((e) => e.day === day);
      const isToday = !out && view.y === t.y && view.m === t.m && day === t.day;
      const isSel = !out && view.y === sel.y && view.m === sel.m && day === selected;
      cells.push(h('button', { class: `dcell${out ? ' out' : ''}${isToday ? ' today' : ''}${isSel ? ' sel' : ''}`, onClick: () => { if (out) return; selected = day; sel = { ...view }; render(); } },
        h('span', { class: 'num' }, day), ...evs.slice(0, 1).map((e) => h('span', { class: 'echip' }, `${e.time} ${e.title}`))));
    }
    grid.replaceChildren(...cells);
    const z = new Date(Date.UTC(sel.y, sel.m, selected));
    const evs = EVENTS.filter((e) => e.day === selected);
    agenda.replaceChildren(h('small', {}, 'Agenda'), h('h3', {}, `${dayName(z.getUTCDay())}, ${selected} ${monthName(sel.m)}`),
      evs.length ? h('div', {}, ...evs.map((e) => h('div', { class: 'ev' }, h('b', {}, e.title), h('span', {}, e.time)))) : h('p', {}, 'Tidak ada acara. Hari yang lowong.'),
      h('button', { class: 'add' }, '+ Tambah di tanggal ini'));
  };
  const shift = (d: number) => { const n = new Date(Date.UTC(view.y, view.m + d, 1)); view = { y: n.getUTCFullYear(), m: n.getUTCMonth() }; grid.animate([{ opacity: 0.2, transform: 'translateX(' + 14 * d + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE_OUT }); render(); };
  render();
  const m = mini('Hari ini sudah selesai. Ada 1 acara dalam tujuh hari ke depan.');
  const el = h('section', { class: 'panel cal', 'aria-label': 'Kalender' },
    h('div', { class: 'bar' }, mode, title, h('i', { class: 'grow' }),
      h('button', { class: 'cbtn', 'aria-label': 'Sebelumnya', onClick: () => shift(-1) }, icon('left', 22, 1.8)),
      h('button', { class: 'pill-ghost', onClick: () => { view = { y: t.y, m: t.m }; selected = t.day; sel = { y: t.y, m: t.m }; render(); } }, 'Hari ini'),
      h('button', { class: 'cbtn', 'aria-label': 'Berikutnya', onClick: () => shift(1) }, icon('right', 22, 1.8)),
      h('button', { class: 'pill-dark' }, icon('plus', 18, 2.2), 'Acara'), tuneBtn(), closeBtn(onClose)),
    wkh, grid, agenda, m);
  return { el, mini: m };
}

export { sleep, EASE_IO };
