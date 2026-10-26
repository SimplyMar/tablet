type Listener<T> = (s: T, prev: T) => void;

export function createStore<T extends object>(initial: T) {
  let state = initial;
  const ls = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch: Partial<T>) {
      const prev = state;
      state = { ...state, ...patch };
      ls.forEach((l) => l(state, prev));
    },
    on(l: Listener<T>) { ls.add(l); return () => ls.delete(l); },
  };
}
