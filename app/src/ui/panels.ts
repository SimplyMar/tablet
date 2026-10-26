import { h, sleep } from '../lib/h';
import { icon, filled } from '../lib/icons';
import { artUrl } from './art';
import { player, playerActions, fmt, type LightMode } from '../lib/player';
import { CITIES, EVENTS, QUEUE } from '../data/mock';
import { dayName, dayShort, hm, monthName, now, WIB, zoned } from '../lib/time';
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
const hourly = (items: { h: string; t: number; k?: string }[], night: boolean) =>
  h('div', { class: 'hours' }, ...items.map((i) => h('div', {}, h('span', {}, i.h), night ? h('i', { class: 'moon' }, icon('moon', 16, 1.8)) : icon(i.k === 'cloud' ? 'cloud' : 'drizzle', 16, 1.8), h('b', {}, `${i.t}°`))));

export function clockPanel(onClose: () => void): Panel {
  const d = now(); const j = CITIES[0];
  const other = (id: string) => CITIES.find((c) => c.id === id)!;
  let active = 'syd';
  const right = h('div', { class: 'ccard' });
  const overlapCard = h('div', { class: 'overlap' });

  const hoursOf = (offset: number) => zoned(d, offset);
  const build = () => {
    const c = other(active); const z = hoursOf(c.offset); const jk = hoursOf(WIB);
    const sparse = c.hourly.map((hr) => ({ h: hr.h, t: hr.t, k: 'cloud' }));
    right.replaceChildren(
      h('div', { class: 'top' }, c.name, h('span', { class: 'chip blue' }, c.delta)),
      h('div', { class: 'daypart' }, icon(c.night ? 'moon' : 'sun', 17, 1.8), c.night ? 'Malam' : 'Siang'),
      h('div', { class: 'big' }, hm(z)),
      h('div', { class: 'date' }, `${dayName(z.dow)}, ${z.day} ${monthName(z.m)}`),
      h('div', { class: 'wx' }, c.night ? h('i', { class: 'moon' }, icon('moon', 38, 1.6)) : icon('cloud', 38, 1.6), `${c.temp}°`),
      h('div', { class: 'wxs' }, `${c.text} · ${c.hi}° / ${c.lo}°`), h('hr'), hourly(sparse, c.night));
    overlapCard.replaceChildren(timeline(c.name, c.offset, jk));
  };

  function timeline(name: string, offset: number, jk: { hh: number; mm: number }) {
    const pct = (hrs: number) => `${(hrs / 24) * 100}%`;
    const start = (9 - (offset - WIB) + 24) % 24; const end = start + 8;
    const common = [Math.max(9, start), Math.min(17, end)];
    const seg = (a: number, b: number, bg: string) => h('i', { class: 'tseg', style: `left:${pct(a)};width:${pct(b - a)};background:${bg}` });
    const nowAt = jk.hh + jk.mm / 60;
    const row = (top: number, label: string, bold: boolean, ...segs: HTMLElement[]) => h('div', { class: `row${bold ? ' bold' : ''}`, style: `top:${top}px` }, h('label', {}, label), h('div', { class: 'lane' }, ...segs));
    const overlapLabel = `${hm({ hh: Math.floor(common[0]), mm: 0 })}–${hm({ hh: Math.floor(common[1]), mm: 0 })} WIB (${hm({ hh: Math.floor((common[0] + offset - WIB + 24) % 24), mm: 0 })}–${hm({ hh: Math.floor((common[1] + offset - WIB + 24) % 24), mm: 0 })} di ${name})`;
    cardMessage = `${name} ${Math.abs(offset - WIB)} jam lebih ${offset > WIB ? 'cepat' : 'lambat'}. Jam kerja kalian bertemu ${overlapLabel}.`;
    return h('div', {}, h('h3', {}, 'Jam kerja bersama', h('span', {}, 'jam kerja 09.00–17.00 di masing-masing kota, ditampilkan dalam WIB')),
      h('div', { class: 'tl' },
        row(0, 'Jakarta', false, seg(9, 17, '#a8a9ac')), row(36, name, false, seg(start > end - 24 ? start : start, Math.min(24, end), '#8ea8e0')), row(72, 'Bersama', true, seg(common[0], common[1], '#1f7f6a')),
        h('i', { class: 'now', style: `left:calc(104px + (100% - 104px) * ${nowAt / 24})` }),
        h('div', { class: 'axis' }, ...[0, 6, 12, 18, 24].map((n) => h('span', { style: `left:${(n / 24) * 100}%` }, String(n))))));
  }
  let cardMessage = '';

  const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...['syd', 'cfx'].map((id) => h('button', { role: 'tab', 'aria-selected': String(id === active), onClick: async (e: Event) => {
    active = id; [...tabs.children].forEach((b) => b.setAttribute('aria-selected', String(b === e.currentTarget)));
    right.animate([{ opacity: 1 }, { opacity: 0.0, transform: 'translateY(6px)' }], { duration: 120, easing: EASE_IN }).finished.then(() => { build(); right.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT }); refreshMini(); });
  } }, other(id).name)));

  const left = h('div', { class: 'ccard' },
    h('div', { class: 'top' }, 'Jakarta', h('span', { class: 'chip' }, 'Kamu di sini')),
    h('div', { class: 'daypart' }, icon('sun', 17, 1.8), 'Siang'),
    h('div', { class: 'big' }, hm(zoned(d, WIB))),
    h('div', { class: 'date' }, `${dayName(zoned(d, WIB).dow)}, ${zoned(d, WIB).day} ${monthName(zoned(d, WIB).m)}`),
    h('div', { class: 'wx' }, icon('rain', 38, 1.6), `${j.temp}°`),
    h('div', { class: 'wxs' }, `${j.text} · ${j.hi}° / ${j.lo}°`), h('hr'),
    hourly(j.hourly.map((x, i) => ({ ...x, k: i < 3 ? 'drizzle' : 'cloud' })), false));
  build();

  const wrapMini = h('div');
  let miniEl: HTMLElement = mini(cardMessage, { label: 'Jadwalkan meeting', onClick: () => undefined });
  wrapMini.append(miniEl);
  function refreshMini() { const n = mini(cardMessage, { label: 'Jadwalkan meeting', onClick: () => undefined }); miniEl.replaceWith(n); miniEl = n; }

  const el = h('section', { class: 'panel wc', 'aria-label': 'Jam dunia' },
    h('div', { class: 'bar' }, h('h2', {}, 'Jam dunia'), tabs, h('i', { class: 'grow' }), tuneBtn(), closeBtn(onClose)),
    h('div', { class: 'cities' }, left, right), overlapCard, miniEl);
  return { el, mini: miniEl };
}

/* --------------------------------------------------------------- calendar */
export function calendarPanel(onClose: () => void): Panel {
  const t = zoned(now(), WIB);
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

export { sleep, EASE_IO, dayShort };
