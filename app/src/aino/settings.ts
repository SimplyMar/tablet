import { getSecret, setSecret, removeSecret } from '../native/bridge';

// 3.6 answers fast and accepts minimal thinking; 3.7 and 3.8 were overloaded when this was chosen. The app still falls back to newer ones.
export const DEFAULT_MODEL = 'gemini-3.6-flash';
const PREFS_VERSION = 2;

/** Models offered in Settings. Lite models have their own, looser free-tier quota. */
export const MODELS: { id: string; label: string; hint: string }[] = [
  { id: 'gemini-3.6-flash', label: '3.6 Flash', hint: 'Paling pintar' },
  { id: 'gemini-3.5-flash', label: '3.5 Flash', hint: 'Seimbang' },
  { id: 'gemini-3.5-flash-lite', label: '3.5 Flash Lite', hint: 'Cepat, kuota longgar' },
  { id: 'gemini-3.1-flash-lite', label: '3.1 Flash Lite', hint: 'Hemat, kuota longgar' },
];

export type Prefs = { name: string; model: string; speak: boolean; awake: boolean; prefsV?: number };
const DEFAULTS: Prefs = { name: 'isni', model: DEFAULT_MODEL, speak: true, awake: true };

export function loadPrefs(): Prefs {
  try {
    const p: Prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('aino.prefs') ?? '{}') };
    // Google retired the 2.x flash models for new keys; move old saved choices to the current default.
    if (/^gemini-[12]\./.test(p.model)) p.model = DEFAULT_MODEL;
    // 0.2.1 saved the then-default 3.7/3.8 into prefs; move those once, but keep a later deliberate choice.
    if (p.prefsV !== PREFS_VERSION && /^gemini-3\.[78]-flash$/.test(p.model)) p.model = DEFAULT_MODEL;
    return p;
  } catch { return { ...DEFAULTS }; }
}
export function savePrefs(p: Partial<Prefs>) {
  const next = { ...loadPrefs(), ...p, prefsV: PREFS_VERSION };
  try { localStorage.setItem('aino.prefs', JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
export const getGeminiKey = () => getSecret('gemini_key');
export const setGeminiKey = (k: string) => setSecret('gemini_key', k.trim());
export const clearGeminiKey = () => removeSecret('gemini_key');
