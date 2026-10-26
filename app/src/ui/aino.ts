import { h, sleep } from '../lib/h';
import { icon } from '../lib/icons';
import { HEADLINES, type Headline } from '../data/mock';
import { EASE_OUT } from '../lib/motion';

export type FaceState = 'idle' | 'speak' | 'listen';

export function createFace(opts: { onMic?: () => void } = {}) {
  const bars = h('div', { class: 'bars' }, ...[3, 9, 5, 12, 7, 10, 4, 8, 3].map((_, i) => h('i', { style: `animation-delay:${i * 90}ms` })));
  const robot = h('div', { class: 'robot', 'data-state': 'idle' },
    h('i', { class: 'eye l' }), h('i', { class: 'eye r' }), h('i', { class: 'mouth' }), bars);
  const mic = h('button', { class: 'mic', 'aria-label': 'Bicara dengan Aino', 'aria-pressed': 'false', onClick: () => opts.onMic?.() }, icon('mic', 20, 2.2));

  let timer = 0;
  const loop = () => {
    timer = window.setTimeout(async () => { await blink(); loop(); }, 2800 + Math.random() * 3800);
  };
  async function blink() {
    robot.classList.add('blink'); await sleep(110); robot.classList.remove('blink');
  }
  loop();

  return {
    robot, mic, blink,
    set(state: FaceState) {
      robot.dataset.state = state;
      mic.setAttribute('aria-pressed', String(state === 'listen'));
      mic.replaceChildren(icon(state === 'listen' ? 'mic' : 'mic', 20, 2.2));
    },
    destroy() { clearTimeout(timer); },
  };
}

function headlineLayer(hl: Headline) {
  return h('div', { class: 'layer' },
    h('h1', {}, hl.title),
    h('div', { class: 'meta' }, icon('book', 16, 1.8), h('b', {}, `${hl.section} · ${hl.source}`), h('span', {}, `· ${hl.ago}`), h('span', { class: 'tag' }, hl.tag)),
  );
}

function sayLayer(title: string, text: string, who?: string) {
  return h('div', { class: 'layer' },
    h('div', { class: 'greet' }, title),
    who ? h('div', { class: 'who' }, h('i'), who) : null,
    h('div', { class: 'sub' }, text),
  );
}

export function createHero(face: ReturnType<typeof createFace>) {
  const host = h('div', { class: 'headline', 'aria-live': 'polite' });
  let current: HTMLElement | null = null;
  let idx = 0;
  let speaking = 0;
  let rotor = 0;

  async function swap(next: HTMLElement, blinkAfter = true) {
    const prev = current;
    current = next;
    host.append(next);
    next.animate([{ opacity: 0, filter: 'blur(6px)', transform: 'translateY(6px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
      { duration: 280, delay: prev ? 130 : 0, easing: EASE_OUT, fill: 'backwards' });
    if (prev) {
      const a = prev.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(5px)' }], { duration: 170, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      a.onfinish = () => prev.remove();
    }
    if (prev && blinkAfter) setTimeout(() => face.blink(), 420);
  }

  const api = {
    host,
    showHeadline(i = idx) {
      idx = (i + HEADLINES.length) % HEADLINES.length;
      host.parentElement?.removeAttribute('data-big');
      face.set('idle');
      return swap(headlineLayer(HEADLINES[idx]));
    },
    nextHeadline() { return api.showHeadline(idx + 1); },
    say(title: string, text: string, opts: { who?: string; state?: FaceState; hold?: number; big?: boolean } = {}) {
      clearTimeout(speaking);
      host.parentElement?.toggleAttribute('data-big', !!opts.big);
      face.set(opts.state ?? 'speak');
      swap(sayLayer(title, text, opts.who));
      if (opts.hold) speaking = window.setTimeout(() => api.showHeadline(), opts.hold);
    },
    startRotation(ms = 9000) { stopRotation(); rotor = window.setInterval(() => { if (!document.hidden && face.robot.dataset.state === 'idle') api.nextHeadline(); }, ms); },
    stopRotation,
  };
  function stopRotation() { clearInterval(rotor); }
  return api;
}
