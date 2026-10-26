import { isNative, setKeepAwakeNative } from './bridge';
import { loadPrefs, savePrefs } from '../aino/settings';

type Lock = { release(): Promise<void> };
let lock: Lock | null = null;
let wanted = false;

async function webLock() {
  const wl = (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<Lock> } }).wakeLock;
  if (!wl || lock || !wanted) return;
  try { lock = await wl.request('screen'); } catch { lock = null; }
}

/** Keep the screen on while the app is in front. Native: window flag. Browser: Screen Wake Lock. */
export async function setAwake(on: boolean) {
  wanted = on;
  savePrefs({ awake: on });
  if (isNative) { await setKeepAwakeNative(on); return; }
  if (on) await webLock(); else { await lock?.release().catch(() => undefined); lock = null; }
}

export const isAwake = () => loadPrefs().awake;

export function startAwake() {
  void setAwake(isAwake());
  document.addEventListener('visibilitychange', () => { if (!document.hidden && wanted && !isNative) { lock = null; void webLock(); } });
}
