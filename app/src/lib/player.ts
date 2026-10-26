import { QUEUE, type Track } from '../data/mock';
import { createStore } from './store';
import { DEMO } from './time';

export type LightMode = 'full' | 'soft' | 'off';
export type PlayerState = {
  index: number; playing: boolean; position: number; track: Track; shuffle: boolean; repeat: boolean;
  volume: number; light: LightMode; source: 'mock' | 'device';
};

const start = QUEUE[0];
export const player = createStore<PlayerState>({
  index: 0, playing: true, position: DEMO ? 171 : 171, track: start, shuffle: false, repeat: false,
  volume: 0.32, light: 'full', source: 'mock',
});

const clampIdx = (i: number) => (i + QUEUE.length) % QUEUE.length;

/** When a real media session is attached, transport commands go to it instead of the mock queue. */
export type DeviceControl = (action: 'toggle' | 'next' | 'previous' | 'seek', position?: number) => void;
let device: DeviceControl | null = null;
export const attachDevice = (fn: DeviceControl | null) => { device = fn; };

export const playerActions = {
  toggle() { if (device && player.get().source === 'device') { device('toggle'); return; } player.set({ playing: !player.get().playing }); },
  go(delta: number) {
    if (device && player.get().source === 'device') { device(delta > 0 ? 'next' : 'previous'); return; }
    const i = clampIdx(player.get().index + delta);
    player.set({ index: i, track: QUEUE[i], position: 0, playing: true });
  },
  next() { this.go(1); },
  prev() { if (player.get().position > 4 && !(device && player.get().source === 'device')) player.set({ position: 0 }); else this.go(-1); },
  seek(fraction: number) {
    const t = player.get().track; const pos = Math.round(t.length * fraction);
    if (device && player.get().source === 'device') device('seek', pos);
    player.set({ position: pos });
  },
  volume(v: number) { player.set({ volume: Math.min(1, Math.max(0, v)) }); },
  setLight(light: LightMode) { player.set({ light }); },
  toggleShuffle() { player.set({ shuffle: !player.get().shuffle }); },
  toggleRepeat() { player.set({ repeat: !player.get().repeat }); },
};

let last = performance.now();
setInterval(() => {
  const nowT = performance.now();
  const dt = (nowT - last) / 1000;
  last = nowT;
  const s = player.get();
  if (!s.playing || DEMO || s.source === 'device') return;
  const pos = s.position + dt;
  if (pos >= s.track.length) playerActions.next();
  else player.set({ position: pos });
}, 500);

export const fmt = (sec: number) => `${Math.floor(sec / 60)}.${String(Math.floor(sec % 60)).padStart(2, '0')}`;
