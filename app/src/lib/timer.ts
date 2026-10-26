import { createStore } from './store';

export const BREAK_SECONDS = 5 * 60;
export type TimerState = { remaining: number; running: boolean; done: number };
export const breakTimer = createStore<TimerState>({ remaining: BREAK_SECONDS, running: false, done: 0 });

let id = 0;
export const timerActions = {
  start() {
    const s = breakTimer.get();
    if (s.running) return;
    breakTimer.set({ running: true, remaining: s.remaining <= 0 ? BREAK_SECONDS : s.remaining });
    id = window.setInterval(() => {
      const r = breakTimer.get().remaining - 1;
      if (r <= 0) { clearInterval(id); breakTimer.set({ remaining: BREAK_SECONDS, running: false, done: breakTimer.get().done + 1 }); }
      else breakTimer.set({ remaining: r });
    }, 1000);
  },
  pause() { clearInterval(id); breakTimer.set({ running: false }); },
  reset() { clearInterval(id); breakTimer.set({ running: false, remaining: BREAK_SECONDS }); },
};
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
