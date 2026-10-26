import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import { h } from './lib/h';
import { createTopbar, createWeather, createNowPill, createFab, type Mode } from './ui/chrome';
import { createFace, createHero } from './ui/aino';
import { clockCard, musicRingCard, timerCard, calendarCard, deckCard, tumraCard, type Card } from './ui/cards';

const stage = document.getElementById('stage')!;
const viewport = document.getElementById('viewport')!;

function fit() {
  const s = Math.min(innerWidth / 1152, innerHeight / 718);
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();

const face = createFace({ onMic: () => undefined });
const hero = createHero(face);
const topbar = createTopbar({ onMode: (m: Mode) => topbar.setMode(m), onAction: () => undefined });
const weather = createWeather();
const pill = createNowPill({ onOpen: () => undefined });
const fab = createFab({ onClick: () => undefined });

const cards: Card[] = [
  clockCard({ onOpen: () => undefined }), musicRingCard({ onOpen: () => undefined }), timerCard({ onStart: () => undefined }),
  calendarCard({ onOpen: () => undefined }), deckCard(), tumraCard(),
];
const grid = h('main', { class: 'grid', 'data-mode': 'home' }, ...cards.map((c) => c.el));

const heroBox = h('section', { class: 'hero' }, face.robot, face.mic, hero.host);
stage.append(topbar.el, heroBox, weather.el, pill.el, grid, fab);
hero.showHeadline(0);
hero.startRotation();
setInterval(() => cards.forEach((c) => c.update?.()), 15_000);
viewport.dataset.ready = '1';
