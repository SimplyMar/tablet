export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_IN = 'cubic-bezier(0.5, 0, 0.75, 0)';
export const EASE_IO = 'cubic-bezier(0.65, 0, 0.35, 1)';

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Run a set of animations and resolve when all have finished (or were cancelled). */
export function done(...anims: Animation[]): Promise<void> {
  return Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
}
