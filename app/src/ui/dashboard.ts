import { h, sleep } from '../lib/h';
import { icon } from '../lib/icons';
import { createTopbar, createWeather, createNowPill, createFab, type Mode } from './chrome';
import { createFace, createHero } from './aino';
import { clockCard, musicRingCard, timerCard, calendarCard, deckCard, tumraCard, type Card } from './cards';
import { navCard, wideClockCard, weekCard, wideMusicCard, workDeckCard } from './work';
import { restCards, coffeeCards } from './modes';
import { musicPanel, clockPanel, calendarPanel, type Panel } from './panels';
import { chatPanel, settingsPanel, appsPanel, notifsPanel } from './sheets';
import { EASE_OUT, EASE_IN, reduced } from '../lib/motion';
import { player, playerActions } from '../lib/player';
import { timerActions, breakTimer } from '../lib/timer';
import { ask, type Intent, type Reply } from '../aino/brain';
import { loadPrefs } from '../aino/settings';
import { canListen, listen, speak, stopSpeaking, setVolume, mediaControl, isNative } from '../native/bridge';
import { greeting, now, homeOffset, zoned } from '../lib/time';
import { setAwake, isAwake } from '../native/awake';

export type PanelName = 'music' | 'clock' | 'calendar' | 'chat' | 'settings' | 'apps' | 'notifs';

export function createDashboard(root: HTMLElement) {
  const face = createFace({ onMic: () => void converse() });
  const hero = createHero(face);
  const topbar = createTopbar({
    onMode: (m) => void setMode(m),
    onAction: (a) => {
      if (a === 'apps') void openPanel('apps'); else if (a === 'bell') void openPanel('notifs'); else if (a === 'settings') void openPanel('settings');
      else if (a === 'volume') popover('volume'); else popover('more');
    },
    awake: isAwake(),
    onAwake: (on) => { void setAwake(on); say(on ? 'Layar akan tetap menyala selama aplikasi terbuka.' : 'Layar boleh redup dan mati sendiri.', 3200); },
  });
  const weather = createWeather();
  const pill = createNowPill({ onOpen: () => void openPanel('music') });
  const fab = createFab({ onClick: () => void openPanel('chat') });

  const homeCards: Card[] = [
    clockCard({ onOpen: () => void openPanel('clock') }), musicRingCard({ onOpen: () => void openPanel('music') }),
    timerCard({ onStart: () => (breakTimer.get().running ? timerActions.pause() : timerActions.start()) }),
    calendarCard({ onOpen: () => void openPanel('calendar') }), deckCard(), tumraCard(),
  ];
  const workCards: Card[] = [navCard(), wideClockCard(), weekCard(), wideMusicCard({ onOpen: () => void openPanel('music') }), workDeckCard()];
  const sets: Record<Mode, Card[]> = { home: homeCards, work: workCards, rest: restCards(), coffee: coffeeCards() };

  const grid = h('main', { class: 'grid', 'data-mode': 'home' }, ...homeCards.map((c) => c.el));
  const heroBox = h('section', { class: 'hero' }, face.robot, face.mic, hero.host);
  const home = h('div', { class: 'home' }, topbar.el, heroBox, weather.el, pill.el, grid, fab);
  const layer = h('div', { class: 'overlay-layer' });
  root.append(home, layer);

  let mode: Mode = 'home';
  let busy = false;
  let panel: { name: PanelName; p: Panel } | null = null;
  let talking = false;

  const who = () => `${greeting(zoned(now(), homeOffset()).hh)}, ${loadPrefs().name}`;
  hero.showHeadline(0);
  hero.startRotation();
  setInterval(() => { Object.values(sets).flat().forEach((c) => c.update?.()); topbar.refresh(); }, 15_000);
  // the break timer ends: Aino says so
  let lastDone = breakTimer.get().done;
  breakTimer.on((s) => { if (s.done !== lastDone) { lastDone = s.done; say('Istirahat selesai. Waktunya kembali, semangat!', 6000); } });

  /* ---------- staggered reveal: card surfaces first, contents a beat later ---------- */
  function reveal(cards: Card[], base = 0) {
    cards.forEach((c, i) => {
      const delay = base + i * 52;
      c.el.animate([{ opacity: 0, transform: 'scale(0.985)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 300, delay, easing: EASE_OUT, fill: 'backwards' });
      (c.el.firstElementChild as HTMLElement | null)?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: delay + 150, easing: EASE_OUT, fill: 'backwards' });
    });
  }

  const MODE_LINE: Record<Mode, string> = {
    home: 'Kembali ke beranda. Ini ringkasan hari ini.',
    work: 'Mode kerja aktif. Kabar yang tidak penting aku tahan dulu.',
    rest: 'Mode santai. Layar kubuat tenang.',
    coffee: 'Waktunya istirahat. Aku jaga timernya.',
  };

  async function setMode(next: Mode) {
    if (busy || panel || next === mode) { topbar.setMode(mode); return; }
    busy = true;
    topbar.setMode(next);
    hero.stopRotation();
    hero.say(who(), MODE_LINE[next], { big: next === 'home', hold: next === 'work' ? 0 : 2800 });
    if (next === 'home') hero.startRotation();
    const out = [...grid.children].map((c) => (c as HTMLElement).animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(0.985)', filter: 'blur(5px)' }], { duration: 150, easing: EASE_IN, fill: 'forwards' }));
    await Promise.all(out.map((a) => a.finished.catch(() => undefined)));
    // the fade-out filled forwards; drop it or reused cards stay invisible when the mode comes back
    out.forEach((a) => a.cancel());
    mode = next;
    grid.dataset.mode = next;
    grid.replaceChildren(...sets[next].map((c) => c.el));
    sets[next].forEach((c) => c.update?.());
    reveal(sets[next], 40);
    if (next === 'coffee' && !breakTimer.get().running) timerActions.start();
    await sleep(520);
    busy = false;
  }

  /* ---------- overlays ---------- */
  function build(name: PanelName): Panel {
    const close = () => void closePanel();
    switch (name) {
      case 'music': return musicPanel(close);
      case 'clock': return clockPanel(close);
      case 'calendar': return calendarPanel(close);
      case 'settings': return settingsPanel(close);
      case 'apps': return appsPanel(close);
      case 'notifs': return notifsPanel(close);
      case 'chat': return chatPanel(close, {
        onReply: (r) => void applyIntent(r.intent),
        setListening: (on) => { face.set(on ? 'listen' : 'idle'); fab.classList.toggle('live', on); },
      });
    }
  }

  async function openPanel(name: PanelName) {
    dismissPopover();
    if (panel || busy) return;
    busy = true;
    const p = build(name);
    panel = { name, p };
    hero.stopRotation();
    layer.append(p.el);
    if (reduced()) { home.style.visibility = 'hidden'; busy = false; return; }
    const dim = home.animate([{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(10px)', transform: 'scale(0.965)' }], { duration: 220, easing: EASE_IN, fill: 'forwards' });
    p.el.animate([{ opacity: 0, filter: 'blur(12px)', transform: 'scale(0.93) translateY(14px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 400, delay: 140, easing: EASE_OUT, fill: 'backwards' });
    p.mini.animate([{ opacity: 0, transform: 'translateY(16px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 260, easing: EASE_OUT, fill: 'backwards' });
    const bubble = p.mini.querySelector('.bubble') as HTMLElement | null;
    if (bubble && !bubble.querySelector('button')) {
      bubble.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-8px)' }], { duration: 300, delay: 2600, easing: EASE_IN, fill: 'forwards' });
      p.mini.querySelector('.robot')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 2900, fill: 'forwards' });
    }
    await dim.finished.catch(() => undefined);
    home.style.visibility = 'hidden';
    busy = false;
  }

  async function closePanel() {
    if (!panel || busy) return;
    busy = true;
    const { p } = panel;
    panel = null;
    home.style.visibility = '';
    const leave = reduced() ? p.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
      : p.el.animate([{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(10px)', transform: 'translateY(34%) scale(0.58)' }], { duration: 460, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' });
    home.animate([{ opacity: 0, filter: 'blur(10px)', transform: 'scale(0.965)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 380, delay: 300, easing: EASE_OUT, fill: 'both' });
    reveal(sets[mode], 330);
    await leave.finished.catch(() => undefined);
    p.destroy?.();
    p.el.remove();
    home.getAnimations().forEach((a) => a.cancel());
    if (mode === 'home') { hero.startRotation(); hero.say(who(), MODE_LINE.home, { big: true, hold: 2400 }); }
    busy = false;
  }

  /* ---------- popovers (more, volume) ---------- */
  let pop: { el: HTMLElement; scrim: HTMLElement } | null = null;
  function dismissPopover() {
    if (!pop) return;
    const { el, scrim } = pop; pop = null; scrim.remove();
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96) translateY(-6px)' }], { duration: 160, easing: EASE_IN, fill: 'forwards' }).finished.then(() => el.remove());
  }
  function popover(kind: 'more' | 'volume') {
    if (pop) { dismissPopover(); return; }
    if (panel) return;
    const scrim = h('div', { class: 'scrim', onClick: dismissPopover });
    let el: HTMLElement;
    if (kind === 'volume') {
      const fill = h('div', { class: 'fill' }); const track = h('div', { class: 'track' }, fill);
      const sync = () => { fill.style.width = `${player.get().volume * 100}%`; };
      const set = (e: PointerEvent) => { const r = track.getBoundingClientRect(); const v = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); playerActions.volume(v); void setVolume({ level: v }); sync(); };
      track.addEventListener('pointerdown', (e) => { track.setPointerCapture(e.pointerId); fill.style.transition = 'none'; set(e); const mv = (ev: PointerEvent) => set(ev); track.addEventListener('pointermove', mv); track.addEventListener('pointerup', () => track.removeEventListener('pointermove', mv), { once: true }); });
      sync();
      el = h('div', { class: 'popover', style: 'left:560px;top:70px;transform-origin:top left' }, h('div', { class: 'vol' }, icon('vol0', 20, 1.8), track, icon('vol2', 20, 1.8)));
    } else {
      el = h('div', { class: 'popover', style: 'right:16px;top:72px' },
        h('button', { onClick: () => { dismissPopover(); void openPanel('settings'); } }, icon('settings', 22, 1.7), 'Pengaturan Aino'),
        h('button', { onClick: () => { dismissPopover(); location.reload(); } }, icon('sparkles', 22, 1.7), 'Muat ulang dasbor'),
        h('button', { onClick: () => { dismissPopover(); hero.say(who(), 'Aino Dash versi 0.1. Dibuat untuk tabletmu.', { hold: 4000 }); } }, icon('sliders', 22, 1.7), 'Tentang'));
    }
    root.append(scrim, el);
    el.animate([{ opacity: 0, transform: 'scale(.94) translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT });
    pop = { el, scrim };
  }

  /* ---------- Aino ---------- */
  function say(text: string, hold = 0, state: 'speak' | 'idle' = 'speak') {
    hero.say(who(), text, { who: 'Aino', state, hold, big: true });
  }

  async function applyIntent(intent?: Intent) {
    if (!intent) return;
    if (intent.kind === 'media') {
      const a = intent.action;
      if (isNative) void mediaControl(a === 'prev' ? 'previous' : a);
      if (a === 'toggle') playerActions.toggle();
      else if (a === 'play') player.set({ playing: true });
      else if (a === 'pause') player.set({ playing: false });
      else if (a === 'next') playerActions.next(); else playerActions.prev();
    } else if (intent.kind === 'volume') {
      const v = Math.min(1, Math.max(0, player.get().volume + intent.delta)); playerActions.volume(v); void setVolume({ level: v });
    } else if (intent.kind === 'mode') {
      if (panel) await closePanel();
      await setMode(intent.mode);
    } else if (intent.kind === 'open') {
      if (panel) await closePanel();
      await sleep(120);
      void openPanel(intent.panel);
    }
  }

  async function respond(r: Reply) {
    say(r.text);
    face.set('speak');
    const speaking = loadPrefs().speak && !r.offline ? speak(r.text).catch(() => undefined) : sleep(Math.min(6000, 1200 + r.text.length * 55));
    void applyIntent(r.intent);
    await speaking;
    await sleep(1800);
    if (mode === 'home' && !panel) { hero.showHeadline(); hero.startRotation(); } else face.set('idle');
  }

  async function converse() {
    if (talking) { talking = false; void stopSpeaking(); face.set('idle'); fab.classList.remove('live'); hero.showHeadline(); return; }
    if (panel?.name === 'chat') return;
    if (!canListen()) { await openPanel('chat'); return; }
    talking = true;
    hero.stopRotation();
    fab.classList.add('live');
    hero.say(who(), 'Aku dengerin…', { who: 'Mendengarkan', state: 'listen', big: true });
    try {
      const text = await listen();
      hero.say(who(), 'Sebentar ya…', { who: 'Aino', state: 'speak', big: true });
      await respond(await ask(text));
    } catch {
      hero.say(who(), 'Aku tidak menangkap suaranya. Coba lagi ya.', { who: 'Aino', state: 'speak', big: true, hold: 3200 });
    } finally { talking = false; fab.classList.remove('live'); }
  }

  return { face, hero, topbar, openPanel, closePanel, setMode, converse, applyIntent, home, layer, fab, get mode() { return mode; }, get panel() { return panel?.name ?? null; } };
}
