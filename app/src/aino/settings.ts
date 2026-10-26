import { getSecret, setSecret, removeSecret } from '../native/bridge';

export const DEFAULT_MODEL = 'gemini-3.8-flash';

export type Prefs = { name: string; model: string; speak: boolean; awake: boolean };
const DEFAULTS: Prefs = { name: 'isni', model: DEFAULT_MODEL, speak: true, awake: true };

export function loadPrefs(): Prefs {
  try {
    const p: Prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('aino.prefs') ?? '{}') };
    // Google retired the 2.x flash models for new keys; move old saved choices to the current default.
    if (/^gemini-[12]\./.test(p.model)) p.model = DEFAULT_MODEL;
    return p;
  } catch { return { ...DEFAULTS }; }
}
export function savePrefs(p: Partial<Prefs>) {
  const next = { ...loadPrefs(), ...p };
  try { localStorage.setItem('aino.prefs', JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
export const getGeminiKey = () => getSecret('gemini_key');
export const setGeminiKey = (k: string) => setSecret('gemini_key', k.trim());
export const clearGeminiKey = () => removeSecret('gemini_key');
