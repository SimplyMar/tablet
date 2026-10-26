import { getSecret, setSecret, removeSecret } from '../native/bridge';

export type Prefs = { name: string; model: string; speak: boolean };
const DEFAULTS: Prefs = { name: 'isni', model: 'gemini-2.5-flash', speak: true };

export function loadPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('aino.prefs') ?? '{}') }; } catch { return { ...DEFAULTS }; }
}
export function savePrefs(p: Partial<Prefs>) {
  const next = { ...loadPrefs(), ...p };
  try { localStorage.setItem('aino.prefs', JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
export const getGeminiKey = () => getSecret('gemini_key');
export const setGeminiKey = (k: string) => setSecret('gemini_key', k.trim());
export const clearGeminiKey = () => removeSecret('gemini_key');
