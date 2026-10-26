import { Capacitor, registerPlugin } from '@capacitor/core';

export type NowPlaying = { debug?: string; active: boolean; title: string; artist: string; playing: boolean; position: number; duration: number; app: string; artBase64?: string };

interface AinoNativePlugin {
  getSecret(o: { key: string }): Promise<{ value: string | null }>;
  setSecret(o: { key: string; value: string }): Promise<void>;
  removeSecret(o: { key: string }): Promise<void>;
  listen(o: { language: string }): Promise<{ text: string }>;
  stopListening(): Promise<void>;
  speak(o: { text: string; language: string }): Promise<void>;
  stopSpeaking(): Promise<void>;
  nowPlaying(): Promise<NowPlaying>;
  mediaControl(o: { action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek'; position?: number }): Promise<void>;
  setVolume(o: { delta?: number; level?: number }): Promise<{ level: number }>;
  hasNotificationAccess(): Promise<{ granted: boolean; connected: boolean }>;
  openAppSettings(): Promise<void>;
  setKeepAwake(o: { enabled: boolean }): Promise<void>;
  openNotificationAccessSettings(): Promise<void>;
  openApp(o: { pkg: string }): Promise<void>;
  addListener(event: 'nowPlaying', cb: (s: NowPlaying) => void): Promise<{ remove: () => void }>;
}

const native = Capacitor.isNativePlatform() ? registerPlugin<AinoNativePlugin>('AinoNative') : null;
export const isNative = native !== null;

/* ---------- secrets ---------- */
export async function getSecret(key: string): Promise<string | null> {
  if (native) return (await native.getSecret({ key })).value;
  try { return localStorage.getItem(`aino.${key}`); } catch { return null; }
}
export async function setSecret(key: string, value: string) {
  if (native) return native.setSecret({ key, value });
  try { localStorage.setItem(`aino.${key}`, value); } catch { /* private mode */ }
}
export async function removeSecret(key: string) {
  if (native) return native.removeSecret({ key });
  try { localStorage.removeItem(`aino.${key}`); } catch { /* ignore */ }
}

/* ---------- speech in ---------- */
type SR = { new (): { lang: string; interimResults: boolean; maxAlternatives: number; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: (e: { error: string }) => void; onend: () => void; start(): void; stop(): void } };
let webRec: InstanceType<SR> | null = null;

export const canListen = () => isNative || !!((window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SR }).webkitSpeechRecognition);

export async function listen(language = 'id-ID'): Promise<string> {
  if (native) return (await native.listen({ language })).text;
  const Ctor = (window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SR }).webkitSpeechRecognition;
  if (!Ctor) throw new Error('no-speech-recognition');
  return new Promise((resolve, reject) => {
    const r = new Ctor(); webRec = r;
    r.lang = language; r.interimResults = false; r.maxAlternatives = 1;
    let text = '';
    r.onresult = (e) => { text = e.results[0][0].transcript; };
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => (text ? resolve(text) : reject(new Error('no-match')));
    r.start();
  });
}
export async function stopListening() { if (native) await native.stopListening(); else webRec?.stop(); }

/* ---------- speech out ---------- */
export async function speak(text: string, language = 'id-ID'): Promise<void> {
  if (native) return native.speak({ text, language });
  if (!('speechSynthesis' in window)) return;
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text); u.lang = language; u.onend = () => resolve(); u.onerror = () => resolve();
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
export async function stopSpeaking() { if (native) await native.stopSpeaking(); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }

/* ---------- media session ---------- */
export const nowPlaying = () => native?.nowPlaying() ?? Promise.resolve<NowPlaying | null>(null);
export const mediaControl = (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek', position?: number) => native?.mediaControl({ action, position });
export const setVolume = (o: { delta?: number; level?: number }) => native?.setVolume(o) ?? Promise.resolve(null);
export const notificationStatus = () => native?.hasNotificationAccess() ?? Promise.resolve({ granted: false, connected: false });
export const openAppSettings = () => native?.openAppSettings();
export const setKeepAwakeNative = (enabled: boolean) => native?.setKeepAwake({ enabled });
export const openNotificationAccessSettings = () => native?.openNotificationAccessSettings();
export const openApp = (pkg: string) => native?.openApp({ pkg });
export async function onNowPlaying(cb: (s: NowPlaying) => void) { if (native) await native.addListener('nowPlaying', cb); }
